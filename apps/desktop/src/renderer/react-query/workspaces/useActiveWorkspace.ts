import { useWindowId } from "renderer/contexts/WindowIdContext";
import { trpc } from "renderer/lib/trpc";

/**
 * Hook to get the active workspace for the current window.
 * Automatically passes the windowId for per-window workspace tracking.
 */
export function useActiveWorkspace() {
	const windowId = useWindowId();

	return trpc.workspaces.getActive.useQuery(
		{ windowId: windowId ?? undefined },
		{ enabled: windowId !== null },
	);
}
