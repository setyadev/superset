import { useCallback } from "react";
import { useWindowId } from "renderer/contexts/WindowIdContext";
import { trpc } from "renderer/lib/trpc";

/**
 * Mutation hook for setting the active workspace
 * Automatically invalidates getActive and getAll queries on success
 * Uses per-window workspace tracking via windowId
 */
export function useSetActiveWorkspace(
	options?: Omit<
		Parameters<typeof trpc.workspaces.setActive.useMutation>[0],
		"onSuccess"
	> & {
		onSuccess?: () => void | Promise<void>;
	},
) {
	const utils = trpc.useUtils();
	const windowId = useWindowId();

	const mutation = trpc.workspaces.setActive.useMutation({
		...options,
		onSuccess: async () => {
			// Auto-invalidate workspace queries for this window
			if (windowId) {
				await Promise.all([
					utils.workspaces.getActive.invalidate({ windowId }),
					utils.workspaces.getOpenWorkspaces.invalidate({ windowId }),
					utils.workspaces.getWindowState.invalidate({ windowId }),
				]);
			}
			await utils.workspaces.getAll.invalidate();

			// Call user's onSuccess if provided
			await options?.onSuccess?.();
		},
	});

	// Wrap mutate to inject windowId
	const mutate = useCallback(
		(
			input: { id: string },
			mutateOptions?: Parameters<typeof mutation.mutate>[1],
		) => {
			mutation.mutate(
				{ ...input, windowId: windowId ?? undefined },
				mutateOptions,
			);
		},
		[mutation, windowId],
	);

	const mutateAsync = useCallback(
		async (
			input: { id: string },
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

// Keep for backward compatibility
export const useSetActiveWorkspaceMutation = useSetActiveWorkspace;
