"use client";

import {
	CodeBlock,
	CodeBlockCopyButton,
} from "@superset/ui/ai-elements/code-block";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@superset/ui/ai-elements/message";
import {
	PromptInput,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@superset/ui/ai-elements/prompt-input";
import { Shimmer } from "@superset/ui/ai-elements/shimmer";
import { ScrollArea } from "@superset/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@superset/ui/sidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	LuCheck,
	LuGitBranch,
	LuLoader,
	LuTerminal,
	LuX,
} from "react-icons/lu";

import { env } from "@/env";
import {
	CloudSidebar,
	type CloudWorkspace,
} from "../../../components/CloudSidebar";
import { type CloudEvent, useCloudSession } from "../../hooks";
import { CloudWorkspaceHeader } from "../CloudWorkspaceHeader";
import { ToolCallGroup } from "../ToolCallGroup";

type GroupedEvent =
	| { type: "assistant_message"; id: string; text: string }
	| { type: "user_message"; id: string; content: string }
	| {
			type: "tool_call_group";
			id: string;
			events: CloudEvent[];
			toolName: string;
	  }
	| { type: "other"; event: CloudEvent };

function groupEvents(events: CloudEvent[]): GroupedEvent[] {
	const result: GroupedEvent[] = [];
	let currentTokenGroup: { id: string; tokens: string[] } | null = null;
	let currentToolGroup: {
		id: string;
		events: CloudEvent[];
		toolName: string;
	} | null = null;

	const flushTokens = () => {
		if (currentTokenGroup) {
			result.push({
				type: "assistant_message",
				id: currentTokenGroup.id,
				text: currentTokenGroup.tokens.join(""),
			});
			currentTokenGroup = null;
		}
	};

	const flushTools = () => {
		if (currentToolGroup) {
			result.push({
				type: "tool_call_group",
				id: currentToolGroup.id,
				events: currentToolGroup.events,
				toolName: currentToolGroup.toolName,
			});
			currentToolGroup = null;
		}
	};

	for (const event of events) {
		if (event.type === "heartbeat") continue;

		if (event.type === "user_message") {
			flushTokens();
			flushTools();
			const data = event.data as { content?: string };
			result.push({
				type: "user_message",
				id: event.id,
				content: data.content || "",
			});
		} else if (event.type === "token") {
			flushTools();
			// OpenCode sends cumulative content, not individual tokens
			const data = event.data as { content?: string; token?: string };
			const text = data.content || data.token;
			if (text) {
				// Since content is cumulative, we replace rather than append
				if (!currentTokenGroup) {
					currentTokenGroup = { id: event.id, tokens: [] };
				}
				// Clear previous tokens and set the cumulative text
				currentTokenGroup.tokens = [text];
			}
		} else if (event.type === "tool_call") {
			flushTokens();
			const data = event.data as { name?: string };
			const toolName = data.name || "Unknown";

			if (currentToolGroup && currentToolGroup.toolName === toolName) {
				currentToolGroup.events.push(event);
			} else {
				flushTools();
				currentToolGroup = {
					id: event.id,
					events: [event],
					toolName,
				};
			}
		} else {
			flushTokens();
			flushTools();
			result.push({ type: "other", event });
		}
	}

	flushTokens();
	flushTools();

	return result;
}

interface CloudWorkspaceContentProps {
	workspace: CloudWorkspace;
	workspaces: CloudWorkspace[];
}

const CONTROL_PLANE_URL =
	env.NEXT_PUBLIC_CONTROL_PLANE_URL ||
	"https://superset-control-plane.avi-6ac.workers.dev";

export function CloudWorkspaceContent({
	workspace,
	workspaces: initialWorkspaces,
}: CloudWorkspaceContentProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialPromptRef = useRef<string | null>(null);
	const hasSentInitialPrompt = useRef(false);

	const [promptInput, setPromptInput] = useState("");
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const {
		isConnected,
		isConnecting,
		isReconnecting,
		reconnectAttempt,
		isLoadingHistory,
		isSpawning,
		isProcessing,
		isSandboxReady,
		isControlPlaneAvailable,
		spawnAttempt,
		maxSpawnAttempts,
		error,
		sessionState,
		events,
		pendingPrompts,
		sendPrompt,
		sendStop,
		sendTyping,
		spawnSandbox,
		clearError,
	} = useCloudSession({
		controlPlaneUrl: CONTROL_PLANE_URL,
		sessionId: workspace.sessionId,
	});

	const isExecuting = isProcessing || sessionState?.sandboxStatus === "running";
	const canSendPrompt = isConnected && isSandboxReady && !isProcessing;

	// Auto-scroll to bottom when new events arrive or processing state changes
	useEffect(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, []);

	const handleSendPrompt = useCallback(() => {
		if (promptInput.trim() && canSendPrompt) {
			sendPrompt(promptInput.trim());
			setPromptInput("");
			textareaRef.current?.focus();
		}
	}, [promptInput, canSendPrompt, sendPrompt]);

	const _handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSendPrompt();
			}
		},
		[handleSendPrompt],
	);

	// Global keyboard shortcuts
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			// ⌘+Enter or Ctrl+Enter to send prompt
			if (modKey && e.key === "Enter") {
				e.preventDefault();
				handleSendPrompt();
				return;
			}

			// Escape to stop execution
			if (e.key === "Escape" && isExecuting) {
				e.preventDefault();
				sendStop();
				return;
			}

			// ⌘+K or Ctrl+K to focus input
			if (modKey && e.key === "k") {
				e.preventDefault();
				textareaRef.current?.focus();
				return;
			}

			// Note: ⌘+B for sidebar toggle is handled by SidebarProvider
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [handleSendPrompt, isExecuting, sendStop]);

	// Auto-send initial prompt from URL when sandbox is ready
	useEffect(() => {
		// Capture initial prompt from URL on mount
		if (initialPromptRef.current === null) {
			const prompt = searchParams.get("prompt");
			initialPromptRef.current = prompt || "";

			// If there's a prompt, pre-populate the input
			if (prompt) {
				setPromptInput(prompt);
				// Clear the URL param to avoid re-sending on refresh
				router.replace(`/cloud/${workspace.sessionId}`, { scroll: false });
			}
		}
	}, [searchParams, router, workspace.sessionId]);

	// Send initial prompt when sandbox becomes ready
	useEffect(() => {
		if (
			isSandboxReady &&
			isConnected &&
			!hasSentInitialPrompt.current &&
			initialPromptRef.current &&
			initialPromptRef.current.trim()
		) {
			hasSentInitialPrompt.current = true;
			const prompt = initialPromptRef.current;
			console.log(
				"[cloud-workspace] Auto-sending initial prompt:",
				prompt.substring(0, 50),
			);
			sendPrompt(prompt);
			setPromptInput("");
		}
	}, [isSandboxReady, isConnected, sendPrompt]);

	const groupedEvents = useMemo(() => groupEvents(events), [events]);

	return (
		<SidebarProvider>
			<CloudSidebar
				initialWorkspaces={initialWorkspaces}
				activeSessionId={workspace.sessionId}
				realtimeSandboxStatus={sessionState?.sandboxStatus}
			/>

			<SidebarInset>
				<CloudWorkspaceHeader
					workspace={workspace}
					sessionState={sessionState}
					isConnected={isConnected}
					isConnecting={isConnecting}
					isReconnecting={isReconnecting}
					reconnectAttempt={reconnectAttempt}
					isSpawning={isSpawning}
					spawnAttempt={spawnAttempt}
					maxSpawnAttempts={maxSpawnAttempts}
				/>

				{/* Main content area */}
				<main className="flex min-h-0 flex-1 flex-col">
					{/* Events display */}
					<ScrollArea ref={scrollAreaRef} className="flex-1 h-full">
						<div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
							{events.length === 0 && !error && (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
										<LuTerminal className="size-5 text-muted-foreground" />
									</div>
									<h3 className="text-sm font-medium text-foreground mb-1">
										{isSpawning
											? "Starting cloud sandbox..."
											: isConnected
												? sessionState?.sandboxStatus === "ready"
													? "Ready to start"
													: "Preparing workspace..."
												: isConnecting
													? "Connecting..."
													: "Waiting for connection..."}
									</h3>
									<p className="text-xs text-muted-foreground max-w-xs">
										{isSpawning
											? "This may take a moment"
											: isConnected && sessionState?.sandboxStatus === "ready"
												? "Send a message to start working with Claude"
												: "Please wait while we set things up"}
									</p>
								</div>
							)}

							{isLoadingHistory && isConnected && events.length === 0 && (
								<div className="flex items-center justify-center py-4">
									<LuLoader className="size-5 animate-spin text-muted-foreground" />
									<Shimmer className="ml-2 text-sm text-muted-foreground">
										Loading history...
									</Shimmer>
								</div>
							)}

							{groupedEvents.map((grouped, index) => {
								if (grouped.type === "user_message") {
									return (
										<UserMessage
											key={`user-${index}-${grouped.id}`}
											content={grouped.content}
										/>
									);
								}
								if (grouped.type === "assistant_message") {
									return (
										<AssistantMessage
											key={`assistant-${index}-${grouped.id}`}
											text={grouped.text}
										/>
									);
								}
								if (grouped.type === "tool_call_group") {
									return (
										<div
											key={`tools-${index}-${grouped.id}`}
											className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2"
										>
											<ToolCallGroup
												events={grouped.events}
												groupId={grouped.id}
											/>
										</div>
									);
								}
								return (
									<EventItem
										key={`event-${index}-${grouped.event.id}`}
										event={grouped.event}
									/>
								);
							})}
							{/* Processing indicator */}
							{isProcessing && (
								<div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-muted/40 border border-border/50">
									<div className="relative flex items-center justify-center">
										<div className="size-2 rounded-full bg-primary animate-pulse" />
										<div className="absolute size-4 rounded-full border-2 border-primary/30 animate-ping" />
									</div>
									<Shimmer className="text-sm text-muted-foreground font-medium">
										Claude is thinking...
									</Shimmer>
								</div>
							)}
						</div>
					</ScrollArea>
				</main>

				{/* Prompt input - sticky at bottom */}
				<div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent relative z-10">
					<div className="max-w-3xl mx-auto">
						<PromptInput
							onSubmit={({ text }) => {
								if (text.trim() && canSendPrompt) {
									sendPrompt(text.trim());
									setPromptInput("");
								}
							}}
							className="rounded-xl"
						>
							<PromptInputTextarea
								value={promptInput}
								onChange={(e) => {
									setPromptInput(e.target.value);
									if (e.target.value.length > 0) {
										sendTyping();
									}
								}}
								placeholder={
									!isConnected
										? "Connecting to cloud workspace..."
										: isSpawning
											? "Starting sandbox..."
											: sessionState?.sandboxStatus === "syncing"
												? "Syncing repository..."
												: !isSandboxReady
													? "Waiting for sandbox..."
													: isProcessing
														? "Processing..."
														: "What do you want to build?"
								}
								disabled={!canSendPrompt}
								className="min-h-12"
							/>
							<PromptInputFooter>
								<PromptInputTools />
								<PromptInputSubmit
									status={
										isProcessing
											? "streaming"
											: !isSandboxReady && isConnected
												? "submitted"
												: undefined
									}
									onStop={sendStop}
									disabled={!canSendPrompt || !promptInput.trim()}
								/>
							</PromptInputFooter>
						</PromptInput>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

interface EventItemProps {
	event: CloudEvent;
}

function EventItem({ event }: EventItemProps) {
	const getEventContent = () => {
		switch (event.type) {
			case "token": {
				const data = event.data as { token?: string };
				return (
					<span className="font-mono text-sm whitespace-pre-wrap">
						{data.token}
					</span>
				);
			}

			case "tool_result": {
				const data = event.data as { result?: unknown; error?: string };
				return (
					<div className="space-y-2">
						{data.error ? (
							<CodeBlock
								code={data.error}
								language="log"
								className="text-xs border-destructive/50 bg-destructive/10 max-h-40 overflow-y-auto"
							>
								<CodeBlockCopyButton className="size-6" />
							</CodeBlock>
						) : (
							<CodeBlock
								code={
									typeof data.result === "string"
										? data.result
										: JSON.stringify(data.result, null, 2)
								}
								language="json"
								className="text-xs border-border/50 max-h-40 overflow-y-auto"
							>
								<CodeBlockCopyButton className="size-6" />
							</CodeBlock>
						)}
					</div>
				);
			}

			case "error": {
				const data = event.data as { message?: string };
				return (
					<div className="flex items-start gap-2 text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
						<LuX className="size-4 shrink-0 mt-0.5" />
						<p className="text-sm">{data.message || "Unknown error"}</p>
					</div>
				);
			}

			case "git_sync": {
				const data = event.data as {
					status?: string;
					action?: string;
					branch?: string;
					repo?: string;
				};
				const action = data.status || data.action || "syncing";
				const detail = data.branch || data.repo || "";
				return (
					<div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
						<LuGitBranch className="size-3" />
						<span>
							{action}
							{detail ? `: ${detail}` : ""}
						</span>
					</div>
				);
			}

			case "execution_complete": {
				return (
					<div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-xs py-1">
						<LuCheck className="size-3" />
						<span className="font-medium">Complete</span>
					</div>
				);
			}

			case "heartbeat":
			case "tool_call":
				// tool_call is handled by ToolCallGroup
				return null;

			default:
				return (
					<CodeBlock
						code={JSON.stringify(event.data, null, 2)}
						language="json"
						className="text-xs border-border/50"
					>
						<CodeBlockCopyButton className="size-6" />
					</CodeBlock>
				);
		}
	};

	// Don't render heartbeat or tool_call events (tool_call handled separately)
	if (event.type === "heartbeat" || event.type === "tool_call") {
		return null;
	}

	return <div>{getEventContent()}</div>;
}

function UserMessage({ content }: { content: string }) {
	return (
		<Message from="user">
			<MessageContent>
				<p className="whitespace-pre-wrap leading-relaxed">{content}</p>
			</MessageContent>
		</Message>
	);
}

function AssistantMessage({ text }: { text: string }) {
	return (
		<Message from="assistant">
			<MessageContent>
				<MessageResponse
					className="prose prose-sm dark:prose-invert max-w-none
						prose-p:text-foreground/80 prose-p:my-1 prose-p:leading-relaxed prose-p:text-sm
						prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
						prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
						prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-li:text-foreground/80 prose-li:text-sm
						prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-2
						prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
						prose-blockquote:border-l-2 prose-blockquote:border-foreground/20 prose-blockquote:pl-4 prose-blockquote:text-foreground/70 prose-blockquote:not-italic
						prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
						prose-strong:text-foreground prose-strong:font-medium"
				>
					{text}
				</MessageResponse>
			</MessageContent>
		</Message>
	);
}
