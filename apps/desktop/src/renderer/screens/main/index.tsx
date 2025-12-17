import { Button } from "@superset/ui/button";
import { useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { useHotkeys } from "react-hotkeys-hook";
import { HiArrowPath } from "react-icons/hi2";

// Flag set by main process for windows opened via File > New Window
declare global {
	interface Window {
		__FRESH_WINDOW__?: boolean;
	}
}

import { SetupConfigModal } from "renderer/components/SetupConfigModal";
import { useWindowId } from "renderer/contexts/WindowIdContext";
import { trpc } from "renderer/lib/trpc";
import { useCurrentView, useOpenSettings } from "renderer/stores/app-state";
import { useSidebarStore } from "renderer/stores/sidebar-state";
import { getPaneDimensions } from "renderer/stores/tabs/pane-refs";
import { useWindowsStore } from "renderer/stores/tabs/store";
import { useAgentHookListener } from "renderer/stores/tabs/useAgentHookListener";
import { HOTKEYS } from "shared/hotkeys";
import { dragDropManager } from "../../lib/dnd";
import { AppFrame } from "./components/AppFrame";
import { Background } from "./components/Background";
import { SettingsView } from "./components/SettingsView";
import { StartView } from "./components/StartView";
import { TopBar } from "./components/TopBar";
import { WorkspaceView } from "./components/WorkspaceView";

function LoadingSpinner() {
	return (
		<div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
	);
}

export function MainScreen() {
	const currentView = useCurrentView();
	const openSettings = useOpenSettings();
	const { toggleSidebar } = useSidebarStore();
	const windowId = useWindowId();
	const utils = trpc.useUtils();
	// Query the window's state (open workspaces and active workspace)
	const { data: windowState, isLoading: isWindowStateLoading } =
		trpc.workspaces.getWindowState.useQuery(
			{ windowId: windowId ?? "" },
			{ enabled: windowId !== null },
		);
	const {
		data: activeWorkspace,
		isLoading,
		isError,
		failureCount,
		refetch,
	} = trpc.workspaces.getActive.useQuery(
		{ windowId: windowId ?? undefined },
		{ enabled: windowId !== null },
	);
	const [isRetrying, setIsRetrying] = useState(false);
	const splitPaneAuto = useWindowsStore((s) => s.splitPaneAuto);
	const splitPaneVertical = useWindowsStore((s) => s.splitPaneVertical);
	const splitPaneHorizontal = useWindowsStore((s) => s.splitPaneHorizontal);
	const activeWindowIds = useWindowsStore((s) => s.activeWindowIds);
	const focusedPaneIds = useWindowsStore((s) => s.focusedPaneIds);

	// Restoration mutation
	const restoreState = trpc.workspaces.restoreWindowState.useMutation({
		onSuccess: (result) => {
			if (result.restored && windowId) {
				// Invalidate queries to show restored state
				utils.workspaces.getWindowState.invalidate({ windowId });
				utils.workspaces.getOpenWorkspaces.invalidate({ windowId });
				utils.workspaces.getActive.invalidate({ windowId });
			}
		},
	});

	// Save state mutation (for window close)
	const saveState = trpc.workspaces.saveRestoreState.useMutation();

	// Track if we've attempted restoration
	const hasAttemptedRestore = useRef(false);
	// Track if this is a fresh window (via File > New Window)
	const isFreshWindowRef = useRef(window.__FRESH_WINDOW__ ?? false);

	// Listen for agent completion hooks from main process
	useAgentHookListener();

	// Attempt to restore state on first load (only for non-fresh windows)
	useEffect(() => {
		if (
			windowId &&
			!hasAttemptedRestore.current &&
			!isWindowStateLoading &&
			windowState?.openWorkspaceIds.length === 0 &&
			!isFreshWindowRef.current
		) {
			hasAttemptedRestore.current = true;
			restoreState.mutate({ windowId });
		}
		// Clear fresh window flag after first check
		if (window.__FRESH_WINDOW__) {
			delete window.__FRESH_WINDOW__;
		}
	}, [windowId, isWindowStateLoading, windowState, restoreState]);

	// Save state when window is about to close
	useEffect(() => {
		const handleBeforeUnload = () => {
			if (windowId && windowState && windowState.openWorkspaceIds.length > 0) {
				// Use sendBeacon or sync approach since mutation may not complete
				saveState.mutate({ windowId });
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [windowId, windowState, saveState]);

	// Fresh window detection: window has no open workspaces and is marked as fresh
	const isFreshWindow =
		!isWindowStateLoading &&
		windowState?.openWorkspaceIds.length === 0 &&
		(isFreshWindowRef.current || hasAttemptedRestore.current);

	const activeWorkspaceId = activeWorkspace?.id;
	const activeWindowId = activeWorkspaceId
		? activeWindowIds[activeWorkspaceId]
		: null;
	const focusedPaneId = activeWindowId ? focusedPaneIds[activeWindowId] : null;
	const isWorkspaceView = currentView === "workspace";

	// Register global shortcuts
	useHotkeys(HOTKEYS.SHOW_HOTKEYS.keys, () => openSettings("keyboard"), [
		openSettings,
	]);

	useHotkeys(HOTKEYS.TOGGLE_SIDEBAR.keys, () => {
		if (isWorkspaceView) toggleSidebar();
	}, [toggleSidebar, isWorkspaceView]);

	useHotkeys(HOTKEYS.SPLIT_AUTO.keys, () => {
		if (isWorkspaceView && activeWindowId && focusedPaneId) {
			const dimensions = getPaneDimensions(focusedPaneId);
			if (dimensions) {
				splitPaneAuto(activeWindowId, focusedPaneId, dimensions);
			}
		}
	}, [activeWindowId, focusedPaneId, splitPaneAuto, isWorkspaceView]);

	useHotkeys(HOTKEYS.SPLIT_RIGHT.keys, () => {
		if (isWorkspaceView && activeWindowId && focusedPaneId) {
			splitPaneVertical(activeWindowId, focusedPaneId);
		}
	}, [activeWindowId, focusedPaneId, splitPaneVertical, isWorkspaceView]);

	useHotkeys(HOTKEYS.SPLIT_DOWN.keys, () => {
		if (isWorkspaceView && activeWindowId && focusedPaneId) {
			splitPaneHorizontal(activeWindowId, focusedPaneId);
		}
	}, [activeWindowId, focusedPaneId, splitPaneHorizontal, isWorkspaceView]);

	const showStartView =
		!isLoading &&
		(!activeWorkspace || isFreshWindow) &&
		currentView !== "settings";

	// Determine which content view to show
	const renderContent = () => {
		if (currentView === "settings") {
			return <SettingsView />;
		}
		return <WorkspaceView />;
	};

	// Show loading spinner while query is in flight or waiting for windowId
	if (isLoading || windowId === null) {
		return (
			<DndProvider manager={dragDropManager}>
				<Background />
				<AppFrame>
					<div className="flex h-full w-full items-center justify-center bg-background">
						<LoadingSpinner />
					</div>
				</AppFrame>
			</DndProvider>
		);
	}

	// Show error state with retry option
	// Note: failureCount resets automatically on successful query
	if (isError) {
		const hasRepeatedFailures = failureCount >= 5;

		const handleRetry = async () => {
			setIsRetrying(true);
			await refetch();
			setIsRetrying(false);
		};

		return (
			<DndProvider manager={dragDropManager}>
				<Background />
				<AppFrame>
					<div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background">
						<div className="flex flex-col items-center gap-2 text-center">
							<p className="text-sm text-muted-foreground">
								Failed to load workspace
							</p>
							{hasRepeatedFailures && (
								<p className="text-xs text-muted-foreground/70 max-w-xs">
									This may indicate a connection issue. Try restarting the app
									if the problem persists.
								</p>
							)}
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRetry}
							disabled={isRetrying}
							className="gap-2"
						>
							{isRetrying ? (
								<LoadingSpinner />
							) : (
								<HiArrowPath className="h-4 w-4" />
							)}
							{isRetrying ? "Retrying..." : "Retry"}
						</Button>
					</div>
				</AppFrame>
			</DndProvider>
		);
	}

	return (
		<DndProvider manager={dragDropManager}>
			<Background />
			<AppFrame>
				{showStartView ? (
					<StartView />
				) : (
					<div className="flex flex-col h-full w-full">
						<TopBar />
						<div className="flex flex-1 overflow-hidden">{renderContent()}</div>
					</div>
				)}
			</AppFrame>
			<SetupConfigModal />
		</DndProvider>
	);
}
