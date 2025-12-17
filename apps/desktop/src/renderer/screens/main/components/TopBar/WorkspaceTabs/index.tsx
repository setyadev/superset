import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useWindowId } from "renderer/contexts/WindowIdContext";
import { trpc } from "renderer/lib/trpc";
import {
	useActiveWorkspace,
	useSetActiveWorkspace,
} from "renderer/react-query/workspaces";
import {
	useCurrentView,
	useIsSettingsTabOpen,
} from "renderer/stores/app-state";
import { HOTKEYS } from "shared/hotkeys";
import { SettingsTab } from "./SettingsTab";
import { WorkspaceDropdown } from "./WorkspaceDropdown";
import { WorkspaceGroup } from "./WorkspaceGroup";

const MIN_WORKSPACE_WIDTH = 60;
const MAX_WORKSPACE_WIDTH = 160;
const ADD_BUTTON_WIDTH = 48;

export function WorkspacesTabs() {
	const windowId = useWindowId();
	// Get only workspaces that are open in this window
	const { data: openWorkspaces = [] } =
		trpc.workspaces.getOpenWorkspaces.useQuery(
			{ windowId: windowId ?? "" },
			{ enabled: windowId !== null },
		);
	const { data: activeWorkspace } = useActiveWorkspace();
	const activeWorkspaceId = activeWorkspace?.id || null;

	// Group open workspaces by project for display
	const groups = useMemo(() => {
		const projectMap = new Map<
			string,
			{
				project: { id: string; name: string; color: string; tabOrder: number };
				workspaces: typeof openWorkspaces;
			}
		>();

		for (const workspace of openWorkspaces) {
			if (!workspace.project) continue;

			if (!projectMap.has(workspace.project.id)) {
				projectMap.set(workspace.project.id, {
					project: {
						id: workspace.project.id,
						name: workspace.project.name,
						color: workspace.project.color,
						tabOrder: 0, // We'll sort by first workspace appearance
					},
					workspaces: [],
				});
			}
			projectMap.get(workspace.project.id)?.workspaces.push(workspace);
		}

		return Array.from(projectMap.values());
	}, [openWorkspaces]);
	const setActiveWorkspace = useSetActiveWorkspace();
	const currentView = useCurrentView();
	const isSettingsTabOpen = useIsSettingsTabOpen();
	const isSettingsActive = currentView === "settings";
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [showStartFade, setShowStartFade] = useState(false);
	const [showEndFade, setShowEndFade] = useState(false);
	const [workspaceWidth, setWorkspaceWidth] = useState(MAX_WORKSPACE_WIDTH);
	const [hoveredWorkspaceId, setHoveredWorkspaceId] = useState<string | null>(
		null,
	);

	// Flatten workspaces for keyboard navigation
	const allWorkspaces = groups.flatMap((group) => group.workspaces);

	// Workspace switching shortcuts (⌘+1-9) - combined into single hook call
	const workspaceKeys = Array.from(
		{ length: 9 },
		(_, i) => `meta+${i + 1}`,
	).join(", ");
	useHotkeys(
		workspaceKeys,
		(event) => {
			const num = Number(event.key);
			if (num >= 1 && num <= 9) {
				const workspace = allWorkspaces[num - 1];
				if (workspace) {
					setActiveWorkspace.mutate({ id: workspace.id });
				}
			}
		},
		[allWorkspaces, setActiveWorkspace],
	);

	// Navigate to previous workspace (⌘+←)
	useHotkeys(HOTKEYS.PREV_WORKSPACE.keys, () => {
		if (!activeWorkspaceId) return;
		const currentIndex = allWorkspaces.findIndex(
			(w) => w.id === activeWorkspaceId,
		);
		if (currentIndex > 0) {
			setActiveWorkspace.mutate({ id: allWorkspaces[currentIndex - 1].id });
		}
	}, [activeWorkspaceId, allWorkspaces, setActiveWorkspace]);

	// Navigate to next workspace (⌘+→)
	useHotkeys(HOTKEYS.NEXT_WORKSPACE.keys, () => {
		if (!activeWorkspaceId) return;
		const currentIndex = allWorkspaces.findIndex(
			(w) => w.id === activeWorkspaceId,
		);
		if (currentIndex < allWorkspaces.length - 1) {
			setActiveWorkspace.mutate({ id: allWorkspaces[currentIndex + 1].id });
		}
	}, [activeWorkspaceId, allWorkspaces, setActiveWorkspace]);

	useEffect(() => {
		const checkScroll = () => {
			if (!scrollRef.current) return;

			const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
			setShowStartFade(scrollLeft > 0);
			setShowEndFade(scrollLeft < scrollWidth - clientWidth - 1);
		};

		const updateWorkspaceWidth = () => {
			if (!containerRef.current) return;

			const containerWidth = containerRef.current.offsetWidth;
			const availableWidth = containerWidth - ADD_BUTTON_WIDTH;

			// Calculate width: fill available space but respect min/max
			const calculatedWidth = Math.max(
				MIN_WORKSPACE_WIDTH,
				Math.min(MAX_WORKSPACE_WIDTH, availableWidth / allWorkspaces.length),
			);
			setWorkspaceWidth(calculatedWidth);
		};

		checkScroll();
		updateWorkspaceWidth();

		const scrollElement = scrollRef.current;
		if (scrollElement) {
			scrollElement.addEventListener("scroll", checkScroll);
		}

		window.addEventListener("resize", updateWorkspaceWidth);

		return () => {
			if (scrollElement) {
				scrollElement.removeEventListener("scroll", checkScroll);
			}
			window.removeEventListener("resize", updateWorkspaceWidth);
		};
	}, [allWorkspaces]);

	return (
		<div ref={containerRef} className="flex items-center h-full w-full">
			<div className="flex items-center h-full min-w-0">
				<div className="relative h-full overflow-hidden min-w-0">
					<div
						ref={scrollRef}
						className="flex h-full overflow-x-auto hide-scrollbar gap-4"
					>
						{groups.map((group, groupIndex) => (
							<Fragment key={group.project.id}>
								<WorkspaceGroup
									projectId={group.project.id}
									projectName={group.project.name}
									projectColor={group.project.color}
									projectIndex={groupIndex}
									workspaces={group.workspaces}
									activeWorkspaceId={
										isSettingsActive ? null : activeWorkspaceId
									}
									workspaceWidth={workspaceWidth}
									hoveredWorkspaceId={hoveredWorkspaceId}
									onWorkspaceHover={setHoveredWorkspaceId}
								/>
								{groupIndex < groups.length - 1 && (
									<div className="flex items-center h-full py-2">
										<div className="w-px h-full bg-border" />
									</div>
								)}
							</Fragment>
						))}
						{isSettingsTabOpen && (
							<>
								{groups.length > 0 && (
									<div className="flex items-center h-full py-2">
										<div className="w-px h-full bg-border" />
									</div>
								)}
								<SettingsTab
									width={workspaceWidth}
									isActive={isSettingsActive}
								/>
							</>
						)}
					</div>

					{/* Fade effects for scroll indication */}
					{showStartFade && (
						<div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-linear-to-r from-background to-transparent" />
					)}
					{showEndFade && (
						<div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-linear-to-l from-background to-transparent" />
					)}
				</div>
				<WorkspaceDropdown className="no-drag" />
			</div>
		</div>
	);
}
