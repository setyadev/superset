import { useParams } from "@tanstack/react-router";
import { HiOutlineWifi } from "react-icons/hi2";
import { MdComputer } from "react-icons/md";
import { useOnlineStatus } from "renderer/hooks/useOnlineStatus";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { isOfflineMode } from "shared/offline-mode";
import { NavigationControls } from "./components/NavigationControls";
import { OpenInMenuButton } from "./components/OpenInMenuButton";
import { SidebarToggle } from "./components/SidebarToggle";
import { UserDropdown } from "./components/UserDropdown";
import { WindowControls } from "./components/WindowControls";

export function TopBar() {
	const { data: platform } = electronTrpc.window.getPlatform.useQuery();
	const { workspaceId } = useParams({ strict: false });
	const { data: workspace } = electronTrpc.workspaces.get.useQuery(
		{ id: workspaceId ?? "" },
		{ enabled: !!workspaceId },
	);
	const isOnline = useOnlineStatus();
	const offlineMode = isOfflineMode();
	// Default to Mac layout while loading to avoid overlap with traffic lights
	const isMac = platform === undefined || platform === "darwin";

	return (
		<div className="drag gap-2 h-12 w-full flex items-center justify-between bg-background border-b border-border relative">
			<div
				className="flex items-center gap-1.5 h-full"
				style={{
					paddingLeft: isMac ? "88px" : "16px",
				}}
			>
				<SidebarToggle />
				<NavigationControls />
			</div>

			{workspace?.project?.name && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<span className="text-sm text-muted-foreground font-medium truncate max-w-[calc(100vw-36rem)] lg:max-w-[calc(100vw-52rem)]">
						{[workspace.project.name, workspace.name]
							.filter(Boolean)
							.join(" - ")}
					</span>
				</div>
			)}

			<div className="flex items-center gap-3 h-full pr-4 shrink-0">
				{offlineMode && (
					<div className="no-drag flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 px-2 py-1 rounded">
						<MdComputer className="size-3.5" />
						<span>Local Mode</span>
					</div>
				)}
				{!isOnline && (
					<div className="no-drag flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
						<HiOutlineWifi className="size-3.5" />
						<span>Offline</span>
					</div>
				)}
				{workspace?.worktreePath && (
					<OpenInMenuButton
						worktreePath={workspace.worktreePath}
						branch={workspace.worktree?.branch}
					/>
				)}
				<UserDropdown />
				{!isMac && <WindowControls />}
			</div>
		</div>
	);
}
