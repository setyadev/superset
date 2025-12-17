import { toast } from "@superset/ui/sonner";
import { useCallback } from "react";
import { useWindowId } from "renderer/contexts/WindowIdContext";
import { trpc } from "renderer/lib/trpc";
import { useOpenConfigModal } from "renderer/stores/config-modal";
import { useWindowsStore } from "renderer/stores/tabs/store";

/**
 * Mutation hook for creating a new workspace
 * Automatically invalidates all workspace queries on success
 * Creates a terminal window with setup commands if present
 * Shows config toast if no setup commands are configured
 * Uses per-window workspace tracking via windowId
 */
export function useCreateWorkspace(
	options?: Parameters<typeof trpc.workspaces.create.useMutation>[0],
) {
	const utils = trpc.useUtils();
	const addWindow = useWindowsStore((state) => state.addWindow);
	const createOrAttach = trpc.terminal.createOrAttach.useMutation();
	const openConfigModal = useOpenConfigModal();
	const dismissConfigToast = trpc.config.dismissConfigToast.useMutation();
	const windowId = useWindowId();

	const mutation = trpc.workspaces.create.useMutation({
		...options,
		onSuccess: async (data, ...rest) => {
			// Auto-invalidate all workspace queries for this window
			if (windowId) {
				await Promise.all([
					utils.workspaces.getActive.invalidate({ windowId }),
					utils.workspaces.getOpenWorkspaces.invalidate({ windowId }),
					utils.workspaces.getWindowState.invalidate({ windowId }),
				]);
			}
			await utils.workspaces.invalidate();

			// Create terminal window with setup commands if present
			if (
				Array.isArray(data.initialCommands) &&
				data.initialCommands.length > 0
			) {
				const { paneId } = addWindow(data.workspace.id);
				// Pre-create terminal session with initial commands
				// Terminal component will attach to this session when it mounts
				createOrAttach.mutate({
					tabId: paneId,
					workspaceId: data.workspace.id,
					tabTitle: "Terminal",
					initialCommands: data.initialCommands,
				});
			} else {
				// Show config toast if no setup commands
				toast.info("No setup script configured", {
					description: "Automate workspace setup with a config.json file",
					action: {
						label: "Configure",
						onClick: () => openConfigModal(data.projectId),
					},
					onDismiss: () => {
						dismissConfigToast.mutate({ projectId: data.projectId });
					},
				});
			}

			// Call user's onSuccess if provided
			await options?.onSuccess?.(data, ...rest);
		},
	});

	// Wrap mutate to inject windowId
	const mutate = useCallback(
		(
			input: { projectId: string; name?: string },
			mutateOptions?: Parameters<typeof mutation.mutate>[1],
		) => {
			console.log(
				"[useCreateWorkspace] mutate called with windowId:",
				windowId,
			);
			mutation.mutate(
				{ ...input, windowId: windowId ?? undefined },
				mutateOptions,
			);
		},
		[mutation, windowId],
	);

	const mutateAsync = useCallback(
		async (
			input: { projectId: string; name?: string },
			mutateOptions?: Parameters<typeof mutation.mutateAsync>[1],
		) => {
			return mutation.mutateAsync(
				{ ...input, windowId: windowId ?? undefined },
				mutateOptions,
			);
		},
		[mutation, windowId],
	);

	return {
		...mutation,
		mutate,
		mutateAsync,
	};
}
