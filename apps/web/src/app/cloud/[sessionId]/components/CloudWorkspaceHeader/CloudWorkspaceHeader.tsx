"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@superset/ui/alert-dialog";
import { Badge } from "@superset/ui/badge";
import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { Input } from "@superset/ui/input";
import { SidebarTrigger } from "@superset/ui/sidebar";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	LuArchive,
	LuEllipsis,
	LuExternalLink,
	LuFile,
	LuGitBranch,
	LuGithub,
	LuGitPullRequest,
	LuGlobe,
	LuLoader,
	LuPencil,
	LuWifi,
	LuWifiOff,
} from "react-icons/lu";

import { useTRPC } from "@/trpc/react";
import type { CloudWorkspace } from "../../../components/CloudSidebar";
import type {
	Artifact,
	CloudSessionState,
	FileChange,
	ParticipantPresence,
} from "../../hooks";

interface CloudWorkspaceHeaderProps {
	workspace: CloudWorkspace;
	sessionState: CloudSessionState | null;
	isConnected: boolean;
	isConnecting: boolean;
	isReconnecting: boolean;
	reconnectAttempt: number;
	isSpawning: boolean;
	spawnAttempt: number;
	maxSpawnAttempts: number;
}

export function CloudWorkspaceHeader({
	workspace,
	sessionState,
	isConnected,
	isConnecting,
	isReconnecting,
	reconnectAttempt,
	isSpawning,
	spawnAttempt,
	maxSpawnAttempts,
}: CloudWorkspaceHeaderProps) {
	const trpc = useTRPC();
	const router = useRouter();

	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editedTitle, setEditedTitle] = useState(workspace.title);
	const [isMounted, setIsMounted] = useState(false);
	const [showArchiveDialog, setShowArchiveDialog] = useState(false);
	const titleInputRef = useRef<HTMLInputElement>(null);

	// Track hydration to avoid Radix ID mismatch
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Update title mutation
	const updateMutation = useMutation(
		trpc.cloudWorkspace.update.mutationOptions({
			onSuccess: () => {
				setIsEditingTitle(false);
				router.refresh();
			},
		}),
	);

	// Archive mutation
	const archiveMutation = useMutation(
		trpc.cloudWorkspace.archive.mutationOptions({
			onSuccess: () => {
				router.push("/cloud");
			},
		}),
	);

	const handleTitleSave = useCallback(() => {
		if (editedTitle.trim() && editedTitle !== workspace.title) {
			updateMutation.mutate({ id: workspace.id, title: editedTitle.trim() });
		} else {
			setIsEditingTitle(false);
			setEditedTitle(workspace.title);
		}
	}, [editedTitle, workspace.title, workspace.id, updateMutation]);

	const handleTitleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				handleTitleSave();
			} else if (e.key === "Escape") {
				setIsEditingTitle(false);
				setEditedTitle(workspace.title);
			}
		},
		[handleTitleSave, workspace.title],
	);

	const handleArchive = useCallback(() => {
		archiveMutation.mutate({ id: workspace.id });
	}, [archiveMutation, workspace.id]);

	// Focus title input when editing starts
	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
			titleInputRef.current.select();
		}
	}, [isEditingTitle]);

	return (
		<>
			<header className="h-14 flex items-center gap-3 border-b px-4">
				<SidebarTrigger />
				<div className="flex-1 min-w-0">
					{isEditingTitle ? (
						<div className="flex items-center gap-1">
							<Input
								ref={titleInputRef}
								value={editedTitle}
								onChange={(e) => setEditedTitle(e.target.value)}
								onKeyDown={handleTitleKeyDown}
								onBlur={handleTitleSave}
								className="h-7 text-sm font-semibold"
								disabled={updateMutation.isPending}
							/>
							{updateMutation.isPending && (
								<LuLoader className="size-4 animate-spin" />
							)}
						</div>
					) : (
						<button
							type="button"
							onClick={() => setIsEditingTitle(true)}
							className="text-sm font-semibold truncate hover:text-muted-foreground transition-colors text-left w-full flex items-center gap-1 group"
						>
							<span className="truncate">{workspace.title}</span>
							<LuPencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
						</button>
					)}
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<LuGithub className="size-3" />
						<span className="truncate">
							{workspace.repoOwner}/{workspace.repoName}
						</span>
						<LuGitBranch className="size-3" />
						<span className="truncate">{workspace.branch}</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{/* Connection status */}
					<Badge
						variant={isConnected ? "default" : "secondary"}
						className="gap-1"
					>
						{isConnecting || isReconnecting ? (
							<LuLoader className="size-3 animate-spin" />
						) : isConnected ? (
							<LuWifi className="size-3" />
						) : (
							<LuWifiOff className="size-3" />
						)}
						{isReconnecting
							? `Reconnecting (${reconnectAttempt}/5)...`
							: isConnecting
								? "Connecting..."
								: isConnected
									? "Connected"
									: "Disconnected"}
					</Badge>
					<Badge variant="outline">{workspace.status}</Badge>
					{(sessionState?.sandboxStatus ||
						workspace.sandboxStatus ||
						isSpawning) && (
						<Badge
							variant={
								(sessionState?.sandboxStatus || workspace.sandboxStatus) ===
								"ready"
									? "default"
									: "secondary"
							}
							className="gap-1"
						>
							{(isSpawning ||
								sessionState?.sandboxStatus === "warming" ||
								sessionState?.sandboxStatus === "syncing") && (
								<LuLoader className="size-3 animate-spin" />
							)}
							{isSpawning
								? spawnAttempt > 0
									? `Spawning (${spawnAttempt + 1}/${maxSpawnAttempts})...`
									: "Spawning..."
								: sessionState?.sandboxStatus === "warming"
									? "Warming..."
									: sessionState?.sandboxStatus || workspace.sandboxStatus}
						</Badge>
					)}
					{/* Artifacts - PR and Preview links */}
					{sessionState?.artifacts && sessionState.artifacts.length > 0 && (
						<div className="flex items-center gap-1">
							{sessionState.artifacts.map((artifact) => (
								<ArtifactButton key={artifact.id} artifact={artifact} />
							))}
						</div>
					)}
					{/* Files changed indicator */}
					{sessionState?.filesChanged &&
						sessionState.filesChanged.length > 0 &&
						isMounted && (
							<FilesChangedDropdown files={sessionState.filesChanged} />
						)}
					{/* Participant avatars */}
					{sessionState?.participants &&
						sessionState.participants.length > 0 && (
							<ParticipantAvatars participants={sessionState.participants} />
						)}
					{/* Session menu - only render after hydration to avoid Radix ID mismatch */}
					{isMounted ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="size-8">
									<LuEllipsis className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
									<LuPencil className="size-4 mr-2" />
									Rename
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setShowArchiveDialog(true)}
									className="text-destructive focus:text-destructive"
								>
									<LuArchive className="size-4 mr-2" />
									Archive Session
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button variant="ghost" size="icon" className="size-8">
							<LuEllipsis className="size-4" />
						</Button>
					)}
				</div>
			</header>

			{/* Archive Confirmation Dialog */}
			<AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Archive this session?</AlertDialogTitle>
						<AlertDialogDescription>
							This will archive the session and stop the cloud sandbox. You can
							view and restore archived sessions from the home page.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleArchive}
							disabled={archiveMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{archiveMutation.isPending ? (
								<>
									<LuLoader className="size-4 mr-2 animate-spin" />
									Archiving...
								</>
							) : (
								"Archive"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function ArtifactButton({ artifact }: { artifact: Artifact }) {
	if (!artifact.url) return null;

	const getIcon = () => {
		switch (artifact.type) {
			case "pr":
				return <LuGitPullRequest className="size-3" />;
			case "preview":
				return <LuGlobe className="size-3" />;
			default:
				return <LuExternalLink className="size-3" />;
		}
	};

	const getLabel = () => {
		switch (artifact.type) {
			case "pr":
				return artifact.title || "PR";
			case "preview":
				return "Preview";
			default:
				return artifact.title || "Link";
		}
	};

	return (
		<Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
			<a href={artifact.url} target="_blank" rel="noopener noreferrer">
				{getIcon()}
				{getLabel()}
			</a>
		</Button>
	);
}

function ParticipantAvatars({
	participants,
}: {
	participants: ParticipantPresence[];
}) {
	const onlineParticipants = participants.filter((p) => p.isOnline);
	const offlineParticipants = participants.filter((p) => !p.isOnline);

	// Show up to 3 online avatars, then +N
	const visibleOnline = onlineParticipants.slice(0, 3);
	const remainingCount =
		onlineParticipants.length - 3 + offlineParticipants.length;

	if (participants.length === 0) return null;

	return (
		<div className="flex items-center -space-x-2">
			{visibleOnline.map((p) => (
				<div key={p.id} className="relative" title={`${p.userName} (online)`}>
					{p.avatarUrl ? (
						<img
							src={p.avatarUrl}
							alt={p.userName}
							className="size-7 rounded-full border-2 border-background"
						/>
					) : (
						<div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
							{p.userName.charAt(0).toUpperCase()}
						</div>
					)}
					<span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 border border-background" />
				</div>
			))}
			{remainingCount > 0 && (
				<div
					className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
					title={`${remainingCount} more participant${remainingCount > 1 ? "s" : ""}`}
				>
					+{remainingCount}
				</div>
			)}
		</div>
	);
}

function FilesChangedDropdown({ files }: { files: FileChange[] }) {
	const getFileIcon = (type: FileChange["type"]) => {
		switch (type) {
			case "added":
				return <span className="text-green-500">+</span>;
			case "modified":
				return <span className="text-amber-500">~</span>;
			case "deleted":
				return <span className="text-red-500">-</span>;
			default:
				return <LuFile className="size-3" />;
		}
	};

	const getFileName = (path: string) => {
		const parts = path.split("/");
		return parts[parts.length - 1];
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
					<LuFile className="size-3" />
					{files.length} file{files.length !== 1 ? "s" : ""} changed
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="max-h-64 overflow-auto w-64">
				{files.slice(0, 20).map((file) => (
					<DropdownMenuItem
						key={file.path}
						className="flex items-center gap-2 font-mono text-xs"
						title={file.path}
					>
						{getFileIcon(file.type)}
						<span className="truncate">{getFileName(file.path)}</span>
					</DropdownMenuItem>
				))}
				{files.length > 20 && (
					<div className="px-2 py-1 text-xs text-muted-foreground">
						+{files.length - 20} more files
					</div>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
