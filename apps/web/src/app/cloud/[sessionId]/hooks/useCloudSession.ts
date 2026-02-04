"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CloudEvent {
	id: string;
	type:
		| "tool_call"
		| "tool_result"
		| "token"
		| "error"
		| "git_sync"
		| "execution_complete"
		| "heartbeat"
		| "user_message";
	timestamp: number;
	data: unknown;
	messageId?: string;
}

export interface HistoricalMessage {
	id: string;
	content: string;
	role: string;
	status: string;
	participantId: string | null;
	createdAt: number;
	completedAt: number | null;
}

export type ArtifactType = "pr" | "preview" | "screenshot" | "file";

export interface Artifact {
	id: string;
	type: ArtifactType;
	url: string | null;
	title: string | null;
	description: string | null;
	metadata: Record<string, unknown> | null;
	status: "active" | "deleted";
	createdAt: number;
	updatedAt: number;
}

export interface FileChange {
	path: string;
	type: "added" | "modified" | "deleted";
	lastModified: number;
}

export interface ParticipantPresence {
	id: string;
	userId: string;
	userName: string;
	avatarUrl?: string;
	source: "web" | "desktop" | "slack";
	isOnline: boolean;
	lastSeenAt: number;
}

export interface CloudSessionState {
	sessionId: string;
	status: string;
	sandboxStatus: string;
	repoOwner: string;
	repoName: string;
	branch: string;
	baseBranch: string;
	model: string;
	participants: ParticipantPresence[];
	artifacts: Artifact[];
	filesChanged: FileChange[];
	messageCount: number;
	eventCount: number;
}

interface UseCloudSessionOptions {
	controlPlaneUrl: string;
	sessionId: string;
	authToken?: string;
}

interface PendingPrompt {
	content: string;
	timestamp: number;
}

interface UseCloudSessionReturn {
	isConnected: boolean;
	isConnecting: boolean;
	isReconnecting: boolean;
	reconnectAttempt: number;
	isLoadingHistory: boolean;
	isSpawning: boolean;
	isProcessing: boolean;
	isSandboxReady: boolean;
	isControlPlaneAvailable: boolean;
	spawnAttempt: number;
	maxSpawnAttempts: number;
	error: string | null;
	sessionState: CloudSessionState | null;
	events: CloudEvent[];
	pendingPrompts: PendingPrompt[];
	sendPrompt: (content: string) => void;
	sendStop: () => void;
	sendTyping: () => void;
	spawnSandbox: () => Promise<void>;
	connect: () => void;
	disconnect: () => void;
	clearError: () => void;
}

export function useCloudSession({
	controlPlaneUrl,
	sessionId,
	authToken,
}: UseCloudSessionOptions): UseCloudSessionReturn {
	// Connection state
	const [isConnected, setIsConnected] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isReconnecting, setIsReconnecting] = useState(false);
	const [reconnectAttempt, setReconnectAttempt] = useState(0);
	const [isControlPlaneAvailable, setIsControlPlaneAvailable] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Session state
	const [sessionState, setSessionState] = useState<CloudSessionState | null>(
		null,
	);
	const [events, setEvents] = useState<CloudEvent[]>([]);
	const [pendingPrompts, setPendingPrompts] = useState<PendingPrompt[]>([]);

	// Loading states
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);
	const [isSpawning, setIsSpawning] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [spawnAttempt, setSpawnAttempt] = useState(0);

	// Computed
	const isSandboxReady =
		sessionState?.sandboxStatus === "ready" ||
		sessionState?.sandboxStatus === "running";

	// Refs
	const wsRef = useRef<WebSocket | null>(null);
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const spawnRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttempts = useRef(0);
	const spawnAttempts = useRef(0);
	const isCleaningUp = useRef(false);
	const hasAttemptedSpawn = useRef(false);
	const seenEventIds = useRef<Set<string>>(new Set());
	const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
	const hasTypedRef = useRef(false);

	// Config ref to avoid dependency changes
	const configRef = useRef({ controlPlaneUrl, sessionId, authToken });
	configRef.current = { controlPlaneUrl, sessionId, authToken };

	const maxReconnectAttempts = 5;
	const maxSpawnAttempts = 3;

	const cleanup = useCallback(() => {
		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current);
			pingIntervalRef.current = null;
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		if (spawnRetryTimeoutRef.current) {
			clearTimeout(spawnRetryTimeoutRef.current);
			spawnRetryTimeoutRef.current = null;
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Simple message handler
	const handleMessage = useCallback(
		(message: {
			type: string;
			sessionId?: string;
			state?: CloudSessionState;
			event?: CloudEvent;
			messages?: HistoricalMessage[];
			artifacts?: Artifact[];
			participants?: ParticipantPresence[];
			action?: "join" | "leave" | "idle" | "active";
			participant?: ParticipantPresence;
			message?: string;
			messageId?: string;
			status?: "forwarded" | "queued" | "sent" | "failed";
		}) => {
			switch (message.type) {
				case "subscribed":
					console.log(
						"[cloud-session] Subscribed, sandboxStatus:",
						message.state?.sandboxStatus,
					);
					if (message.state) {
						setSessionState(message.state);
					}
					break;

				case "history":
					// Load historical messages
					if (message.messages && message.messages.length > 0) {
						const sortedMessages = [...message.messages].sort(
							(a, b) => a.createdAt - b.createdAt,
						);
						const historicalEvents: CloudEvent[] = sortedMessages.map((m) => ({
							id: m.id,
							type:
								m.role === "user"
									? ("user_message" as const)
									: ("token" as const),
							timestamp: m.createdAt,
							data:
								m.role === "user"
									? { content: m.content }
									: { content: m.content },
							messageId: m.id,
						}));

						for (const e of historicalEvents) {
							seenEventIds.current.add(e.id);
						}

						setEvents(historicalEvents);
					}
					setIsLoadingHistory(false);
					break;

				case "event":
					if (message.event) {
						const event = message.event;

						// Skip duplicates
						if (seenEventIds.current.has(event.id)) {
							// Still handle execution_complete for state
							if (event.type === "execution_complete") {
								setIsProcessing(false);
							}
							return;
						}

						seenEventIds.current.add(event.id);

						// Add event to list (skip heartbeats from display)
						if (event.type !== "heartbeat") {
							setEvents((prev) => [...prev, event]);
						}

						// Handle processing state
						if (event.type === "execution_complete" || event.type === "error") {
							setIsProcessing(false);
						}
					}
					break;

				case "state_update":
					if (message.state) {
						setSessionState((prev) =>
							prev
								? { ...prev, ...message.state }
								: (message.state as CloudSessionState),
						);
					}
					break;

				case "artifacts_update":
					if (message.artifacts) {
						setSessionState((prev) =>
							prev
								? { ...prev, artifacts: message.artifacts as Artifact[] }
								: null,
						);
					}
					break;

				case "presence_sync":
					if (message.participants) {
						setSessionState((prev) =>
							prev
								? {
										...prev,
										participants: message.participants as ParticipantPresence[],
									}
								: null,
						);
					}
					break;

				case "presence_update":
					if (message.participant && message.action) {
						setSessionState((prev) => {
							if (!prev) return null;
							const participant = message.participant as ParticipantPresence;
							const action = message.action;

							if (action === "join") {
								const exists = prev.participants.some(
									(p) => p.id === participant.id,
								);
								if (exists) {
									return {
										...prev,
										participants: prev.participants.map((p) =>
											p.id === participant.id
												? { ...participant, isOnline: true }
												: p,
										),
									};
								}
								return {
									...prev,
									participants: [
										...prev.participants,
										{ ...participant, isOnline: true },
									],
								};
							}

							if (action === "leave") {
								return {
									...prev,
									participants: prev.participants.map((p) =>
										p.id === participant.id
											? {
													...p,
													isOnline: false,
													lastSeenAt: participant.lastSeenAt,
												}
											: p,
									),
								};
							}

							return prev;
						});
					}
					break;

				case "error":
					setError(message.message || "Unknown error");
					setIsLoadingHistory(false);
					setIsProcessing(false);
					break;

				case "prompt_ack":
					if (message.status === "queued") {
						// Sandbox not ready, message queued
						console.log("[cloud-session] Prompt queued:", message.messageId);
						if (message.message) {
							setError(message.message);
						}
					} else if (message.status === "forwarded") {
						// Prompt sent to sandbox, keep processing true
						console.log("[cloud-session] Prompt forwarded:", message.messageId);
					}
					break;

				case "pong":
					break;
			}
		},
		[],
	);

	const connectInternal = useCallback(() => {
		if (isCleaningUp.current) return;
		if (
			wsRef.current?.readyState === WebSocket.OPEN ||
			wsRef.current?.readyState === WebSocket.CONNECTING
		) {
			return;
		}

		const { controlPlaneUrl, sessionId, authToken } = configRef.current;

		setIsConnecting(true);
		setError(null);

		const wsUrl = controlPlaneUrl
			.replace("https://", "wss://")
			.replace("http://", "ws://");
		const url = `${wsUrl}/api/sessions/${sessionId}/ws`;

		try {
			const ws = new WebSocket(url);
			wsRef.current = ws;

			ws.onopen = () => {
				if (isCleaningUp.current) {
					ws.close();
					return;
				}

				setIsConnecting(false);
				setIsReconnecting(false);
				setReconnectAttempt(0);
				setIsConnected(true);
				setIsControlPlaneAvailable(true);
				reconnectAttempts.current = 0;

				ws.send(JSON.stringify({ type: "subscribe", token: authToken || "" }));

				pingIntervalRef.current = setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({ type: "ping" }));
					}
				}, 30000);
			};

			ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data as string);
					handleMessage(message);
				} catch (e) {
					console.error("[cloud-session] Failed to parse message:", e);
				}
			};

			ws.onclose = () => {
				cleanup();
				setIsConnected(false);
				wsRef.current = null;

				if (isCleaningUp.current) {
					setIsReconnecting(false);
					setReconnectAttempt(0);
					return;
				}

				if (reconnectAttempts.current < maxReconnectAttempts) {
					reconnectAttempts.current++;
					setIsReconnecting(true);
					setReconnectAttempt(reconnectAttempts.current);
					const delay = 1000 * 2 ** (reconnectAttempts.current - 1);
					reconnectTimeoutRef.current = setTimeout(() => {
						connectInternal();
					}, delay);
				} else {
					setIsReconnecting(false);
					setIsControlPlaneAvailable(false);
					setError("Connection lost. Control plane may be unavailable.");
				}
			};

			ws.onerror = () => {
				setError("WebSocket connection error");
				setIsConnecting(false);
			};
		} catch (_e) {
			setError("Failed to create WebSocket connection");
			setIsConnecting(false);
		}
	}, [cleanup, handleMessage]);

	const disconnectInternal = useCallback(() => {
		isCleaningUp.current = true;
		cleanup();
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setIsConnected(false);
		reconnectAttempts.current = maxReconnectAttempts;
	}, [cleanup]);

	const connect = useCallback(() => {
		isCleaningUp.current = false;
		reconnectAttempts.current = 0;
		connectInternal();
	}, [connectInternal]);

	const disconnect = useCallback(() => {
		disconnectInternal();
	}, [disconnectInternal]);

	const sendPrompt = useCallback((content: string) => {
		// Add user message optimistically
		const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const userEvent: CloudEvent = {
			id: localId,
			type: "user_message",
			timestamp: Date.now(),
			data: { content },
		};

		seenEventIds.current.add(localId);
		setEvents((prev) => [...prev, userEvent]);
		setIsProcessing(true);

		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "prompt",
					content,
					authorId: "web-user",
				}),
			);
		} else {
			setPendingPrompts((prev) => [
				...prev,
				{ content, timestamp: Date.now() },
			]);
		}
	}, []);

	const sendStop = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ type: "stop" }));
			setIsProcessing(false);
		}
	}, []);

	const sendTyping = useCallback(() => {
		if (hasTypedRef.current || isSandboxReady) return;

		if (typingDebounceRef.current) {
			clearTimeout(typingDebounceRef.current);
		}

		typingDebounceRef.current = setTimeout(() => {
			if (
				wsRef.current?.readyState === WebSocket.OPEN &&
				!hasTypedRef.current &&
				!isSandboxReady
			) {
				hasTypedRef.current = true;
				wsRef.current.send(JSON.stringify({ type: "typing" }));
			}
		}, 500);
	}, [isSandboxReady]);

	const spawnSandbox = useCallback(async () => {
		const { controlPlaneUrl, sessionId } = configRef.current;

		if (isSpawning) return;

		setIsSpawning(true);
		setError(null);

		try {
			const response = await fetch(
				`${controlPlaneUrl}/api/sessions/${sessionId}/spawn-sandbox`,
				{ method: "POST", headers: { "Content-Type": "application/json" } },
			);

			if (!response.ok) {
				throw new Error("Failed to spawn sandbox");
			}

			spawnAttempts.current = 0;
			setSpawnAttempt(0);
		} catch (e) {
			console.error("[cloud-session] Error spawning sandbox:", e);
			spawnAttempts.current++;
			setSpawnAttempt(spawnAttempts.current);

			if (spawnAttempts.current < maxSpawnAttempts) {
				const delay = 2000 * 2 ** (spawnAttempts.current - 1);
				spawnRetryTimeoutRef.current = setTimeout(() => {
					setIsSpawning(false);
					spawnSandbox();
				}, delay);
				return;
			}

			setError(`Failed to spawn sandbox after ${maxSpawnAttempts} attempts.`);
		}

		setIsSpawning(false);
	}, [isSpawning]);

	// Auto-spawn when needed
	useEffect(() => {
		const status = sessionState?.sandboxStatus;
		const needsSpawn =
			status === "stopped" || status === "pending" || status === "failed";
		const isActive =
			status === "warming" ||
			status === "syncing" ||
			status === "ready" ||
			status === "running";

		if (isActive) return;

		if (
			isConnected &&
			needsSpawn &&
			!hasAttemptedSpawn.current &&
			!isSpawning
		) {
			hasAttemptedSpawn.current = true;
			spawnSandbox();
		}
	}, [isConnected, sessionState?.sandboxStatus, isSpawning, spawnSandbox]);

	// Reset on session change
	useEffect(() => {
		hasAttemptedSpawn.current = false;
		hasTypedRef.current = false;
		spawnAttempts.current = 0;
		setSpawnAttempt(0);
		seenEventIds.current.clear();
		setEvents([]);
		setIsProcessing(false);
		setIsLoadingHistory(true);
		if (typingDebounceRef.current) {
			clearTimeout(typingDebounceRef.current);
			typingDebounceRef.current = null;
		}
	}, []);

	// Reset typing state when sandbox ready
	useEffect(() => {
		if (isSandboxReady) {
			hasTypedRef.current = false;
		}
	}, [isSandboxReady]);

	// Send pending prompts
	useEffect(() => {
		if (
			isConnected &&
			isSandboxReady &&
			pendingPrompts.length > 0 &&
			wsRef.current?.readyState === WebSocket.OPEN
		) {
			const [nextPrompt, ...remaining] = pendingPrompts;
			if (nextPrompt) {
				setIsProcessing(true);
				wsRef.current.send(
					JSON.stringify({
						type: "prompt",
						content: nextPrompt.content,
						authorId: "web-user",
					}),
				);
				setPendingPrompts(remaining);
			}
		}
	}, [isConnected, isSandboxReady, pendingPrompts]);

	// Auto-connect
	useEffect(() => {
		if (controlPlaneUrl && sessionId) {
			isCleaningUp.current = false;
			reconnectAttempts.current = 0;
			connectInternal();
		}

		return () => {
			disconnectInternal();
		};
	}, [controlPlaneUrl, sessionId, connectInternal, disconnectInternal]);

	return {
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
		connect,
		disconnect,
		clearError,
	};
}
