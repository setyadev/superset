/**
 * Chat Pane - workspace chat interface using AI elements
 *
 * Messages are materialized from the durable stream via useChatSession.
 * This mirrors the dashboard ChatView but with improved UI using AI elements.
 */

import type { BetaContentBlock, ToolResult } from "@superset/ai-chat/stream";
import { useChatSession } from "@superset/ai-chat/stream";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@superset/ui/ai-elements/conversation";
import { Loader } from "@superset/ui/ai-elements/loader";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@superset/ui/ai-elements/message";
import { Button } from "@superset/ui/button";
import { CornerDownLeft, MessageCircle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MosaicBranch } from "react-mosaic-component";
import { env } from "renderer/env.renderer";
import { authClient } from "renderer/lib/auth-client";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { getMostRecentWorkspacePath } from "renderer/lib/workspace-utils";
import { useTabsStore } from "renderer/stores/tabs/store";
import type { Tab } from "renderer/stores/tabs/types";
import { BasePaneWindow, PaneToolbarActions } from "../components";

interface ChatPaneProps {
	paneId: string;
	path: MosaicBranch[];
	isActive: boolean;
	tabId: string;
	splitPaneAuto: (
		tabId: string,
		sourcePaneId: string,
		dimensions: { width: number; height: number },
		path?: MosaicBranch[],
	) => void;
	splitPaneHorizontal: (
		tabId: string,
		sourcePaneId: string,
		path?: MosaicBranch[],
	) => void;
	splitPaneVertical: (
		tabId: string,
		sourcePaneId: string,
		path?: MosaicBranch[],
	) => void;
	removePane: (paneId: string) => void;
	setFocusedPane: (tabId: string, paneId: string) => void;
	availableTabs: Tab[];
	onMoveToTab: (targetTabId: string) => void;
	onMoveToNewTab: () => void;
}

interface ChatMessageItem {
	id: string;
	role: "user" | "assistant";
	content: string;
	contentBlocks?: BetaContentBlock[];
	toolResults?: Map<string, ToolResult>;
	isStreaming?: boolean;
}

function ChatMessageBlock({ msg }: { msg: ChatMessageItem }) {
	if (msg.role === "user") {
		return (
			<Message from="user">
				<MessageContent>{msg.content}</MessageContent>
			</Message>
		);
	}

	// Extract text from content blocks, falling back to content string
	const textContent =
		msg.contentBlocks
			?.filter(
				(b): b is BetaContentBlock & { type: "text" } => b.type === "text",
			)
			.map((b) => b.text)
			.join("\n") || msg.content;

	return (
		<Message from="assistant">
			<MessageContent>
				<MessageResponse mode={msg.isStreaming ? "streaming" : "static"}>
					{textContent}
				</MessageResponse>
			</MessageContent>
		</Message>
	);
}

export function ChatPane({
	paneId,
	path,
	isActive,
	tabId,
	splitPaneAuto,
	splitPaneHorizontal: _splitPaneHorizontal,
	splitPaneVertical: _splitPaneVertical,
	removePane,
	setFocusedPane,
	availableTabs: _availableTabs,
	onMoveToTab: _onMoveToTab,
	onMoveToNewTab: _onMoveToNewTab,
}: ChatPaneProps) {
	const sessionId = useTabsStore((s) => s.panes[paneId]?.chat?.sessionId);
	const paneName = useTabsStore((s) => s.panes[paneId]?.name);

	const { data: session } = authClient.useSession();
	const user = session?.user
		? { userId: session.user.id, name: session.user.name ?? "Unknown" }
		: null;

	// Hook up to durable stream - same as dashboard ChatView
	const {
		messages,
		streamingMessage,
		draft,
		setDraft,
		sendMessage,
		connectionStatus,
		isLoading,
	} = useChatSession({
		proxyUrl: env.NEXT_PUBLIC_STREAMS_URL,
		sessionId: sessionId ?? "",
		user,
		autoConnect: !!user && !!sessionId,
	});

	const startSessionMutation = electronTrpc.aiChat.startSession.useMutation();
	const { data: isSessionActive, refetch: refetchIsActive } =
		electronTrpc.aiChat.isSessionActive.useQuery(
			{ sessionId: sessionId ?? "" },
			{ enabled: !!sessionId },
		);

	const { data: workspaceGroups } =
		electronTrpc.workspaces.getAllGrouped.useQuery();
	const mostRecentWorkspacePath = useMemo(
		() =>
			workspaceGroups ? getMostRecentWorkspacePath(workspaceGroups) : null,
		[workspaceGroups],
	);

	// Auto-start session when pane mounts and session is not active
	const hasAutoStarted = useRef(false);
	useEffect(() => {
		if (
			hasAutoStarted.current ||
			!sessionId ||
			isSessionActive ||
			isSessionActive === undefined ||
			!mostRecentWorkspacePath ||
			startSessionMutation.isPending
		) {
			return;
		}

		hasAutoStarted.current = true;
		startSessionMutation
			.mutateAsync({ sessionId, cwd: mostRecentWorkspacePath })
			.then(() => refetchIsActive())
			.catch((err) =>
				console.error("[ChatPane] Failed to auto-start session:", err),
			);
	}, [
		sessionId,
		isSessionActive,
		mostRecentWorkspacePath,
		startSessionMutation,
		refetchIsActive,
	]);

	const [isSending, setIsSending] = useState(false);
	const handleSend = useCallback(
		async (content: string) => {
			setIsSending(true);
			setDraft("");
			try {
				await sendMessage(content);
			} finally {
				setIsSending(false);
			}
		},
		[sendMessage, setDraft],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				if (draft.trim() && isSessionActive && !isSending) {
					handleSend(draft);
				}
			}
		},
		[draft, isSessionActive, isSending, handleSend],
	);

	// Build allMessages array - same pattern as dashboard ChatView
	const allMessages = useMemo((): ChatMessageItem[] => {
		const result: ChatMessageItem[] = messages.map((m) => ({
			id: m.id,
			role: m.role as "user" | "assistant",
			content: m.content,
			contentBlocks: m.contentBlocks,
			toolResults: m.toolResults,
		}));
		if (streamingMessage) {
			result.push({
				id: "streaming",
				role: "assistant",
				content: streamingMessage.content,
				contentBlocks: streamingMessage.contentBlocks,
				toolResults: streamingMessage.toolResults,
				isStreaming: true,
			});
		}
		return result;
	}, [messages, streamingMessage]);

	const renderToolbar = useCallback(
		(handlers: {
			splitOrientation: "horizontal" | "vertical";
			onSplitPane: (e: React.MouseEvent) => void;
			onClosePane: (e: React.MouseEvent) => void;
		}) => (
			<div className="flex h-full w-full items-center justify-between px-3">
				<div className="flex items-center gap-2 text-muted-foreground">
					<MessageCircle className="size-4" />
					<span className="text-sm truncate max-w-[150px]">
						{paneName ?? "Chat"}
					</span>
				</div>
				<PaneToolbarActions
					splitOrientation={handlers.splitOrientation}
					onSplitPane={handlers.onSplitPane}
					onClosePane={handlers.onClosePane}
					closeHotkeyId="CLOSE_TERMINAL"
				/>
			</div>
		),
		[paneName],
	);

	if (!sessionId) {
		return (
			<BasePaneWindow
				paneId={paneId}
				path={path}
				tabId={tabId}
				isActive={isActive}
				splitPaneAuto={splitPaneAuto}
				removePane={removePane}
				setFocusedPane={setFocusedPane}
				renderToolbar={renderToolbar}
			>
				<div className="flex h-full items-center justify-center text-muted-foreground">
					Session not found
				</div>
			</BasePaneWindow>
		);
	}

	const hasMessages = allMessages.length > 0;
	const inputDisabled = !isSessionActive || isSending;

	// Show thinking when we just sent a message and no streaming response yet
	const isThinking = isSending && !streamingMessage;

	return (
		<BasePaneWindow
			paneId={paneId}
			path={path}
			tabId={tabId}
			isActive={isActive}
			splitPaneAuto={splitPaneAuto}
			removePane={removePane}
			setFocusedPane={setFocusedPane}
			renderToolbar={renderToolbar}
		>
			<div className="flex flex-col h-full">
				<Conversation className="flex-1 min-h-0">
					{hasMessages || isThinking ? (
						<ConversationContent className="gap-4 px-2 max-w-2xl mx-auto">
							{allMessages.map((msg) => (
								<ChatMessageBlock key={msg.id} msg={msg} />
							))}
							{isThinking && (
								<Message from="assistant">
									<MessageContent>
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader size={14} />
											<span className="text-sm">Thinking...</span>
										</div>
									</MessageContent>
								</Message>
							)}
						</ConversationContent>
					) : (
						<ConversationEmptyState
							icon={<Sparkles className="size-8" />}
							title="Start a conversation"
							description={
								isLoading
									? `Connecting... (${connectionStatus})`
									: "Ask anything to get started"
							}
						/>
					)}
					<ConversationScrollButton />
				</Conversation>

				<div className="px-3 pb-3 relative z-10">
					<div className="w-full max-w-2xl mx-auto">
						<div className="border border-input rounded-xl p-2 transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
							<textarea
								value={draft}
								onChange={(e) => setDraft(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Type a message..."
								disabled={inputDisabled}
								rows={1}
								className="w-full min-h-10 max-h-48 resize-none border-0 bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 field-sizing-content"
							/>
							<div className="flex justify-end">
								<Button
									type="button"
									variant="default"
									size="icon"
									className="size-7 rounded-lg"
									onClick={() => draft.trim() && handleSend(draft)}
									disabled={inputDisabled || !draft.trim()}
								>
									<CornerDownLeft className="size-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</BasePaneWindow>
	);
}
