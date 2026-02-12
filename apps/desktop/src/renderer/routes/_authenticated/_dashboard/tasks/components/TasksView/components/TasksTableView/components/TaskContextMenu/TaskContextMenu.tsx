import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import { useLiveQuery } from "@tanstack/react-db";
import { type ReactNode, useMemo } from "react";
import { HiOutlineDocumentDuplicate, HiOutlineTrash } from "react-icons/hi2";
import { useCollections } from "renderer/routes/_authenticated/providers/CollectionsProvider";
import type { TaskWithStatus } from "../../../../hooks/useTasksTable";
import { compareStatusesForDropdown } from "../../../../utils/sorting";
import { ActiveIcon } from "../../../shared/icons/ActiveIcon";
import { PriorityMenuIcon } from "../../../shared/icons/PriorityMenuIcon";
import { PriorityMenuItems } from "../../../shared/PriorityMenuItems";
import { StatusMenuItems } from "../../../shared/StatusMenuItems";

interface TaskContextMenuProps {
	children: ReactNode;
	task: TaskWithStatus;
	onDelete?: () => void;
}

export function TaskContextMenu({
	children,
	task,
	onDelete,
}: TaskContextMenuProps) {
	const collections = useCollections();

	// Load statuses for the status submenu
	const { data: allStatuses } = useLiveQuery(
		(q) => q.from({ taskStatuses: collections.taskStatuses }),
		[collections],
	);

	const sortedStatuses = useMemo(() => {
		if (!allStatuses) return [];
		return [...allStatuses].sort(compareStatusesForDropdown);
	}, [allStatuses]);

	const handleStatusChange = (status: (typeof allStatuses)[0]) => {
		try {
			collections.tasks.update(task.id, (draft) => {
				draft.statusId = status.id;
			});
		} catch (error) {
			console.error("[TaskContextMenu] Failed to update status:", error);
		}
	};

	const handlePriorityChange = (priority: typeof task.priority) => {
		try {
			collections.tasks.update(task.id, (draft) => {
				draft.priority = priority;
			});
		} catch (error) {
			console.error("[TaskContextMenu] Failed to update priority:", error);
		}
	};

	const handleCopyId = () => {
		navigator.clipboard.writeText(task.slug);
	};

	const handleCopyTitle = () => {
		navigator.clipboard.writeText(task.title);
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-64">
				{/* Status submenu */}
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<ActiveIcon className="mr-2" />
						<span>Status</span>
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-48">
						<div className="max-h-64 overflow-y-auto">
							<StatusMenuItems
								statuses={sortedStatuses}
								currentStatusId={task.statusId}
								onSelect={handleStatusChange}
								MenuItem={ContextMenuItem}
							/>
						</div>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{/* Priority submenu */}
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<PriorityMenuIcon className="mr-1" />
						<span>Priority</span>
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-52">
						<PriorityMenuItems
							currentPriority={task.priority}
							statusType={task.status.type}
							onSelect={handlePriorityChange}
							MenuItem={ContextMenuItem}
						/>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSeparator />

				{/* Copy submenu */}
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<HiOutlineDocumentDuplicate className="mr-2 size-4" />
						<span>Copy</span>
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-48">
						<ContextMenuItem onClick={handleCopyId}>
							<span>Copy ID</span>
						</ContextMenuItem>
						<ContextMenuItem onClick={handleCopyTitle}>
							<span>Copy Title</span>
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSeparator />

				<ContextMenuItem
					onClick={onDelete}
					className="text-destructive focus:text-destructive"
				>
					<HiOutlineTrash className="text-destructive size-4" />
					<span>Delete</span>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
