import Anthropic from "@anthropic-ai/sdk";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { WebClient } from "@slack/web-api";
import { db } from "@superset/db/client";
import { integrationConnections } from "@superset/db/schema";
import { and, eq } from "drizzle-orm";
import { env } from "@/env";
import type { AgentAction } from "../slack-blocks";
import {
	createSupersetMcpClient,
	mcpToolToAnthropicTool,
	parseToolName,
} from "./mcp-clients";

async function fetchThreadContext({
	token,
	channelId,
	threadTs,
	limit = 20,
}: {
	token: string;
	channelId: string;
	threadTs: string;
	limit?: number;
}): Promise<string> {
	try {
		const slack = new WebClient(token);
		const result = await slack.conversations.replies({
			channel: channelId,
			ts: threadTs,
			limit,
		});

		if (!result.messages || result.messages.length === 0) {
			return "";
		}

		// Exclude the current mention (last message)
		const messages = result.messages.slice(0, -1);
		if (messages.length === 0) {
			return "";
		}

		const formatted = messages
			.map((msg) => `<${msg.user}>: ${msg.text}`)
			.join("\n");

		return `--- Thread Context (${messages.length} previous messages) ---\n${formatted}\n--- End Thread Context ---`;
	} catch (error) {
		console.warn("[slack-agent] Failed to fetch thread context:", error);
		return "";
	}
}

interface RunSlackAgentParams {
	prompt: string;
	channelId: string;
	threadTs: string;
	userId: string;
	slackToken: string;
	onProgress?: (status: string) => void | Promise<void>;
}

export interface SlackAgentResult {
	text: string;
	actions: AgentAction[];
}

export async function formatErrorForSlack(error: unknown): Promise<string> {
	const message =
		error instanceof Error ? error.message : "Unknown error occurred";
	try {
		const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
		const response = await anthropic.messages.create({
			model: "claude-3-5-haiku-latest",
			max_tokens: 256,
			messages: [
				{
					role: "user",
					content: `Rewrite this API error as a brief, friendly Slack message (1-2 sentences). No technical jargon, no JSON. If it's a rate limit, tell them to try again shortly.\n\nError: ${message}`,
				},
			],
		});
		const text = response.content.find(
			(b): b is Anthropic.TextBlock => b.type === "text",
		);
		return text?.text ?? "Sorry, something went wrong. Please try again.";
	} catch {
		// Haiku itself failed (possibly also rate limited) — use static fallback
		if (error instanceof Anthropic.APIError && error.status === 429) {
			return "I'm a bit overloaded right now — please try again in a moment.";
		}
		return "Sorry, something went wrong. Please try again.";
	}
}

function getActionFromToolResult(
	toolName: string,
	// biome-ignore lint/suspicious/noExplicitAny: MCP result varies by tool
	result: any,
): AgentAction | null {
	if (!result?.structuredContent) return null;

	const content = result.structuredContent;

	switch (toolName) {
		case "create_task":
			if (content.created?.length > 0) {
				return {
					type: "task_created",
					tasks: content.created,
				};
			}
			break;
		case "update_task":
			if (content.updated?.length > 0) {
				return {
					type: "task_updated",
					tasks: content.updated,
				};
			}
			break;
		case "delete_task":
			if (content.deleted?.length > 0) {
				return {
					type: "task_deleted",
					tasks: content.deleted.map((id: string) => ({
						id,
						slug: id,
						title: id,
					})),
				};
			}
			break;
		case "create_workspace":
			if (content.workspaces?.length > 0) {
				return {
					type: "workspace_created",
					workspaces: content.workspaces,
				};
			}
			break;
		case "switch_workspace":
			if (content.workspaces?.length > 0) {
				return {
					type: "workspace_switched",
					workspaces: content.workspaces,
				};
			}
			break;
	}

	return null;
}

async function handleGetChannelHistory(
	_mcpClient: Client,
	token: string,
	channelId: string,
	limit?: number,
	// biome-ignore lint/suspicious/noExplicitAny: Slack message type is complex
): Promise<any> {
	const slack = new WebClient(token);
	const result = await slack.conversations.history({
		channel: channelId,
		limit: limit ?? 10,
	});

	const messages =
		result.messages?.map((msg) => ({
			user: msg.user,
			text: msg.text,
			ts: msg.ts,
		})) ?? [];

	return { messages };
}

function parseTextContent(content: Anthropic.Messages.ContentBlock[]): string {
	return content
		.filter((b): b is Anthropic.TextBlock => b.type === "text")
		.map((b) => b.text)
		.join("");
}

// Tools that should not be exposed to the Slack agent
const DENIED_SUPERSET_TOOLS = new Set([
	"create_workspace",
	"switch_workspace",
	"delete_workspace",
	"update_workspace",
	"navigate_to_workspace",
	"start_claude_session",
]);

// Server-side tools handled via `pause_turn` on Anthropic
const SERVER_SIDE_TOOLS = new Set(["web_search"]);

const SLACK_GET_CHANNEL_HISTORY_TOOL: Anthropic.Messages.Tool = {
	name: "slack_get_channel_history",
	description:
		"Get recent messages from a Slack channel. Useful for understanding context when user references previous discussions.",
	input_schema: {
		type: "object" as const,
		properties: {
			channel_id: {
				type: "string",
				description: "The Slack channel ID",
			},
			limit: {
				type: "number",
				description: "Number of messages to fetch (default 10, max 20)",
			},
		},
		required: ["channel_id"],
	},
};

async function fetchAgentContext({
	mcpClient,
}: {
	mcpClient: Client;
}): Promise<string> {
	const sections: string[] = [];

	// Fetch team members, task statuses, and devices via MCP
	const [statusesResult, devicesResult] = await Promise.all([
		mcpClient.callTool({
			name: "list_task_statuses",
			arguments: {},
		}),
		mcpClient.callTool({
			name: "list_devices",
			arguments: {},
		}),
	]);

	const statusesData = statusesResult.structuredContent as {
		statuses: { id: string; name: string; type: string }[];
	} | null;
	if (statusesData?.statuses?.length) {
		const lines = statusesData.statuses.map(
			(s) => `- ${s.name} (id: ${s.id}, type: ${s.type})`,
		);
		sections.push(`Task statuses:\n${lines.join("\n")}`);
	}

	const devicesData = devicesResult.structuredContent as {
		devices: {
			deviceId: string;
			deviceName: string | null;
			isOnline: boolean;
		}[];
	} | null;
	if (devicesData?.devices?.length) {
		const lines = devicesData.devices.map(
			(d) =>
				`- ${d.deviceName ?? "Unknown"} (id: ${d.deviceId}, status: ${d.isOnline ? "online" : "offline"})`,
		);
		sections.push(`Devices:\n${lines.join("\n")}`);
	}

	return sections.join("\n\n");
}

export async function runSlackAgent(
	params: RunSlackAgentParams,
): Promise<SlackAgentResult> {
	const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	const actions: AgentAction[] = [];

	const connection = await db.query.integrationConnections.findFirst({
		where: and(
			eq(integrationConnections.userId, params.userId),
			eq(integrationConnections.provider, "slack"),
		),
	});

	if (!connection) {
		throw new Error("Slack connection not found");
	}

	let supersetMcp: Client | null = null;
	let cleanupSuperset: (() => Promise<void>) | null = null;

	try {
		const [threadContext, supersetMcpResult] = await Promise.all([
			fetchThreadContext({
				token: params.slackToken,
				channelId: params.channelId,
				threadTs: params.threadTs,
			}),
			createSupersetMcpClient({
				userId: connection.userId,
			}),
		]);

		supersetMcp = supersetMcpResult.client;
		cleanupSuperset = supersetMcpResult.cleanup;

		const [supersetToolsResult, agentContext] = await Promise.all([
			supersetMcp.listTools(),
			fetchAgentContext({
				mcpClient: supersetMcp,
			}),
		]);

		const supersetTools = supersetToolsResult.tools
			.filter((t) => !DENIED_SUPERSET_TOOLS.has(t.name))
			.map((t) => mcpToolToAnthropicTool(t, "superset"));

		const tools: Anthropic.Messages.ToolUnion[] = [
			...supersetTools,
			SLACK_GET_CHANNEL_HISTORY_TOOL,
			{
				type: "web_search_20250305" as const,
				name: "web_search" as const,
				max_uses: 1,
			},
		];

		const systemPrompt = `You are Superset Bot, an AI assistant that helps users with tasks and work management.\n\n${agentContext}\n\nWhen users ask about creating tasks, always use the create_task tool. Be concise and helpful.`;

		const userContent = threadContext
			? `${threadContext}\n\n${params.prompt}`
			: params.prompt;

		let messages: Anthropic.Messages.MessageParam[] = [
			{
				role: "user",
				content: userContent,
			},
		];

		let iterations = 0;
		const maxIterations = 10;

		while (iterations < maxIterations) {
			iterations++;

			await params.onProgress?.(`Thinking... (turn ${iterations})`);

			const response = await anthropic.messages.create({
				model: "claude-sonnet-4-20250514",
				max_tokens: 4096,
				system: systemPrompt,
				messages,
				tools,
			});

			// Note: pause_turn handling removed - not supported in current Anthropic SDK version

			// Handle tool use
			const toolUse = response.content.find(
				(b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
			);

			if (!toolUse) {
				// No tool use - return final response
				return {
					text: parseTextContent(response.content),
					actions,
				};
			}

			// Execute tool
			const { prefix, toolName } = parseToolName(toolUse.name);

			if (SERVER_SIDE_TOOLS.has(toolName)) {
				console.warn(
					"[slack-agent] Client-side handling of server tool:",
					toolName,
				);
			}

			await params.onProgress?.(`Running ${toolName}...`);

			let toolResult: unknown;
			if (prefix === "superset") {
				toolResult = await supersetMcp.callTool({
					name: toolName,
					arguments: toolUse.input as Record<string, unknown>,
				});
			} else if (toolName === "slack_get_channel_history") {
				const input = toolUse.input as { channel_id: string; limit?: number };
				toolResult = await handleGetChannelHistory(
					supersetMcp,
					params.slackToken,
					input.channel_id,
					input.limit,
				);
			} else {
				toolResult = { error: `Unknown tool: ${toolUse.name}` };
			}

			// Convert tool result to action if applicable
			const action = getActionFromToolResult(toolName, toolResult);
			if (action) {
				actions.push(action);
			}

			// Continue conversation with tool result
			messages = [
				...messages,
				{
					role: "assistant",
					content: response.content,
				},
				{
					role: "user",
					content: [
						{
							type: "tool_result" as const,
							tool_use_id: toolUse.id,
							content: JSON.stringify(toolResult),
						},
					],
				},
			];
		}

		return {
			text: "I've reached the maximum number of tool calls. Please try a more specific request.",
			actions,
		};
	} finally {
		await cleanupSuperset?.();
	}
}
