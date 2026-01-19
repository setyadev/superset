import crypto from "node:crypto";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "node:events";
import { env } from "main/env.main";
import { z } from "zod";
import { publicProcedure, router } from "../..";
import { loadToken } from "../auth/utils/auth-functions";

/**
 * Mobile pairing and relay for the desktop app.
 *
 * Handles:
 * - QR code generation for pairing
 * - SSE connection to relay server
 * - Receiving and executing mobile commands
 */

// Event emitter for mobile commands
export const mobileEvents = new EventEmitter();

// Active relay connection
let activeRelayAbortController: AbortController | null = null;
let activeSessionId: string | null = null;

interface MobileCommand {
	id: string;
	transcript: string;
	targetType: "terminal" | "claude" | "task";
	targetId: string | null;
	createdAt: string;
}

/**
 * Generate a unique desktop instance ID
 */
function getDesktopInstanceId(): string {
	// Use a combination of machine-specific info and random bytes
	// In production, this could be stored persistently
	return `desktop-${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Connect to the relay server to receive mobile commands
 */
async function connectToRelay(sessionId: string): Promise<void> {
	// Disconnect any existing connection
	disconnectFromRelay();

	const { token } = await loadToken();
	if (!token) {
		console.error("[mobile] No auth token available");
		return;
	}

	const abortController = new AbortController();
	activeRelayAbortController = abortController;
	activeSessionId = sessionId;

	const relayUrl = new URL(`${env.NEXT_PUBLIC_API_URL}/api/mobile/relay`);
	relayUrl.searchParams.set("sessionId", sessionId);

	try {
		const response = await fetch(relayUrl.toString(), {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			signal: abortController.signal,
		});

		if (!response.ok) {
			console.error("[mobile] Relay connection failed:", response.status);
			return;
		}

		const reader = response.body?.getReader();
		if (!reader) {
			console.error("[mobile] No response body");
			return;
		}

		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Process SSE events
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					try {
						const data = JSON.parse(line.slice(6));
						if (data.type === "command") {
							mobileEvents.emit("command", data as MobileCommand);
						} else if (data.type === "connected") {
							console.log("[mobile] Connected to relay");
							mobileEvents.emit("connected");
						}
					} catch {
						// Ignore invalid JSON
					}
				}
			}
		}
	} catch (err) {
		if (!abortController.signal.aborted) {
			console.error("[mobile] Relay error:", err);
		}
	} finally {
		if (activeRelayAbortController === abortController) {
			activeRelayAbortController = null;
			activeSessionId = null;
		}
	}
}

/**
 * Disconnect from the relay server
 */
function disconnectFromRelay(): void {
	if (activeRelayAbortController) {
		activeRelayAbortController.abort();
		activeRelayAbortController = null;
		activeSessionId = null;
	}
}

/**
 * Acknowledge a command was executed
 */
async function acknowledgeCommand(
	commandId: string,
	success: boolean,
	error?: string,
): Promise<void> {
	const { token } = await loadToken();
	if (!token) return;

	try {
		await fetch(`${env.NEXT_PUBLIC_API_URL}/api/mobile/relay`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ commandId, success, error }),
		});
	} catch (err) {
		console.error("[mobile] Failed to acknowledge command:", err);
	}
}

export const createMobileRouter = () => {
	return router({
		/**
		 * Generate a QR code for pairing with mobile
		 */
		generatePairingQR: publicProcedure
			.input(
				z.object({
					workspaceId: z.string().optional(),
					workspaceName: z.string().optional(),
					projectPath: z.string().optional(),
				}),
			)
			.mutation(async ({ input }) => {
				const { token } = await loadToken();
				if (!token) {
					return { success: false, error: "Not authenticated" };
				}

				try {
					// Call the cloud API to create a pairing session
					const response = await fetch(
						`${env.NEXT_PUBLIC_API_URL}/api/trpc/mobile.createPairingSession`,
						{
							method: "POST",
							headers: {
								Authorization: `Bearer ${token}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								json: {
									desktopInstanceId: getDesktopInstanceId(),
									activeWorkspaceId: input.workspaceId,
									activeWorkspaceName: input.workspaceName,
									activeProjectPath: input.projectPath,
								},
							}),
						},
					);

					if (!response.ok) {
						const error = await response.text();
						console.error("[mobile] Failed to create pairing session:", error);
						return { success: false, error: "Failed to create pairing session" };
					}

					const data = await response.json();
					const { pairingToken, expiresAt } = data.result.data.json;

					// Generate QR code data URL
					// Format: superset://pair?token=XXX
					const qrData =
						env.NODE_ENV === "development"
							? `superset-dev://pair?token=${pairingToken}`
							: `superset://pair?token=${pairingToken}`;

					return {
						success: true,
						qrData,
						pairingToken,
						expiresAt,
					};
				} catch (err) {
					console.error("[mobile] Error generating QR:", err);
					return {
						success: false,
						error: err instanceof Error ? err.message : "Unknown error",
					};
				}
			}),

		/**
		 * Start listening for mobile commands on a pairing session
		 */
		startRelayConnection: publicProcedure
			.input(z.object({ sessionId: z.string() }))
			.mutation(async ({ input }) => {
				// Start connection in background
				connectToRelay(input.sessionId).catch(console.error);
				return { success: true };
			}),

		/**
		 * Stop the relay connection
		 */
		stopRelayConnection: publicProcedure.mutation(() => {
			disconnectFromRelay();
			return { success: true };
		}),

		/**
		 * Get current relay connection status
		 */
		getRelayStatus: publicProcedure.query(() => {
			return {
				connected: activeRelayAbortController !== null,
				sessionId: activeSessionId,
			};
		}),

		/**
		 * Subscribe to mobile commands
		 */
		onMobileCommand: publicProcedure.subscription(() => {
			return observable<MobileCommand>((emit) => {
				const handler = (command: MobileCommand) => {
					emit.next(command);
				};

				mobileEvents.on("command", handler);

				return () => {
					mobileEvents.off("command", handler);
				};
			});
		}),

		/**
		 * Subscribe to connection status changes
		 */
		onConnectionChange: publicProcedure.subscription(() => {
			return observable<{ connected: boolean }>((emit) => {
				const connectedHandler = () => {
					emit.next({ connected: true });
				};
				const disconnectedHandler = () => {
					emit.next({ connected: false });
				};

				mobileEvents.on("connected", connectedHandler);
				mobileEvents.on("disconnected", disconnectedHandler);

				// Emit initial state
				emit.next({ connected: activeRelayAbortController !== null });

				return () => {
					mobileEvents.off("connected", connectedHandler);
					mobileEvents.off("disconnected", disconnectedHandler);
				};
			});
		}),

		/**
		 * Acknowledge a command was executed
		 */
		acknowledgeCommand: publicProcedure
			.input(
				z.object({
					commandId: z.string(),
					success: z.boolean(),
					error: z.string().optional(),
				}),
			)
			.mutation(async ({ input }) => {
				await acknowledgeCommand(input.commandId, input.success, input.error);
				return { success: true };
			}),
	});
};

export type MobileRouter = ReturnType<typeof createMobileRouter>;
