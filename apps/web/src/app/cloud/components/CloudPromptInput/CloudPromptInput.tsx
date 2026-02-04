"use client";

import { Button } from "@superset/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@superset/ui/dropdown-menu";
import { cn } from "@superset/ui/utils";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuGithub, LuLoader, LuLock } from "react-icons/lu";

import { env } from "@/env";
import { useTRPC } from "@/trpc/react";
import type { CloudWorkspace } from "../CloudSidebar";

interface GitHubRepository {
	id: string;
	repoId: string;
	installationId: string;
	owner: string;
	name: string;
	fullName: string;
	defaultBranch: string;
	isPrivate: boolean;
	createdAt: Date;
	updatedAt: Date;
}

interface CloudPromptInputProps {
	organizationId: string;
	hasGitHubInstallation: boolean;
	githubRepositories: GitHubRepository[];
	recentWorkspaces: CloudWorkspace[];
}

export function CloudPromptInput({
	organizationId,
	hasGitHubInstallation,
	githubRepositories,
	recentWorkspaces,
}: CloudPromptInputProps) {
	const trpc = useTRPC();
	const router = useRouter();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [promptInput, setPromptInput] = useState("");
	const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(
		null,
	);
	const [selectedModel, setSelectedModel] = useState<
		"claude-sonnet-4" | "claude-opus-4" | "claude-haiku-3-5"
	>("claude-sonnet-4");
	const [error, setError] = useState<string | null>(null);

	// Get recent repos (from recent workspaces)
	const recentRepos = useMemo(() => {
		const repoMap = new Map<string, GitHubRepository>();
		for (const ws of recentWorkspaces.slice(0, 5)) {
			const repo = githubRepositories.find(
				(r) => r.owner === ws.repoOwner && r.name === ws.repoName,
			);
			if (repo && !repoMap.has(repo.id)) {
				repoMap.set(repo.id, repo);
			}
		}
		return Array.from(repoMap.values()).slice(0, 3);
	}, [recentWorkspaces, githubRepositories]);

	// Preselect the most recently used repo
	useEffect(() => {
		if (!selectedRepo && recentRepos.length > 0) {
			setSelectedRepo(recentRepos[0] ?? null);
		}
	}, [recentRepos, selectedRepo]);

	const createMutation = useMutation(
		trpc.cloudWorkspace.create.mutationOptions({
			onSuccess: (workspace) => {
				if (workspace) {
					const prompt = promptInput.trim();
					const url = prompt
						? `/cloud/${workspace.sessionId}?prompt=${encodeURIComponent(prompt)}`
						: `/cloud/${workspace.sessionId}`;
					router.push(url);
				}
			},
			onError: (err) => {
				console.error("[CloudPromptInput] Create error:", err);
				setError(err.message || "Failed to create session");
			},
		}),
	);

	const handleSubmit = () => {
		if (!selectedRepo) return;
		setError(null);

		const title =
			promptInput.trim() || `${selectedRepo.owner}/${selectedRepo.name}`;

		createMutation.mutate({
			repoOwner: selectedRepo.owner,
			repoName: selectedRepo.name,
			title,
			model: selectedModel,
			baseBranch: selectedRepo.defaultBranch,
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (
			e.key === "Enter" &&
			!e.shiftKey &&
			selectedRepo &&
			promptInput.trim()
		) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const modelLabels = {
		"claude-sonnet-4": "Sonnet 4",
		"claude-opus-4": "Opus 4",
		"claude-haiku-3-5": "Haiku 3.5",
	};

	const canSubmit =
		selectedRepo && promptInput.trim() && !createMutation.isPending;

	// Auto-resize textarea
	const adjustTextareaHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		// Reset height to auto to get the correct scrollHeight
		textarea.style.height = "auto";
		// Set to scrollHeight, capped at max height (150px ~ 6 lines)
		const maxHeight = 150;
		textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
	}, []);

	useEffect(() => {
		adjustTextareaHeight();
	}, [adjustTextareaHeight]);

	// Show connect GitHub prompt if no installation
	if (!hasGitHubInstallation) {
		return (
			<div className="w-full max-w-[566px] text-center space-y-4">
				<div className="rounded-[13px] border-[0.5px] border-[#D3D3D3] dark:border-[#353535] bg-white dark:bg-[#1C1C1C] px-4 py-6">
					<p className="text-sm text-[#A9A9A9] dark:text-[#717171] mb-4">
						Connect GitHub to create cloud sessions with your repositories
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							window.location.href = `${env.NEXT_PUBLIC_API_URL}/api/github/install?organizationId=${organizationId}`;
						}}
						className="gap-2"
					>
						<LuGithub className="size-4" />
						Connect GitHub
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-[566px]">
			{error && (
				<div className="text-sm text-destructive text-center mb-3">{error}</div>
			)}

			<div
				className="relative flex w-full flex-col gap-[13px] rounded-[13px] border-[0.5px] border-[#D3D3D3] dark:border-[#353535] bg-white dark:bg-[#1C1C1C] px-[13px] py-[9px]"
				onClick={() => textareaRef.current?.focus()}
			>
				{/* Input area */}
				<div className="relative flex w-full min-h-[20px]">
					<textarea
						ref={textareaRef}
						value={promptInput}
						onChange={(e) => setPromptInput(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={!selectedRepo || createMutation.isPending}
						placeholder={
							selectedRepo
								? "What do you want to build?"
								: "Select a repository to get started"
						}
						className={cn(
							"w-full resize-none border-none bg-transparent p-0 text-sm leading-5 antialiased outline-none",
							"placeholder:text-[#A9A9A9] dark:placeholder:text-[#717171]",
							"text-[#2E2E2E] dark:text-white",
							"min-h-5 overflow-y-auto",
							"disabled:cursor-not-allowed disabled:opacity-50",
						)}
						rows={1}
						style={{
							fontFamily: "var(--font-inter), system-ui, sans-serif",
						}}
					/>
				</div>

				{/* Bottom toolbar */}
				<div className="relative flex w-full flex-wrap items-center justify-between gap-2">
					<div className="flex min-w-0 flex-wrap items-center justify-start gap-[5px]">
						{/* Repository selector */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className={cn(
										"relative flex h-[23px] cursor-pointer items-center gap-[7px] rounded-md px-[7px] py-[3px]",
										"border-[0.5px] border-neutral-400 dark:border-[#303030]",
										"bg-transparent dark:bg-[#212121]",
										"hover:bg-neutral-100 hover:border-neutral-500 dark:hover:bg-[#212121] dark:hover:border-[#303030]",
										"transition-colors",
									)}
								>
									<LuGithub className="size-[14px] opacity-60 dark:opacity-40" />
									<span className="text-[14px] leading-4 font-[429] [font-variation-settings:'wght'_429] text-[#191919] dark:text-[#F5F5F5] whitespace-nowrap">
										{selectedRepo ? (
											<span className="flex items-center gap-1">
												{selectedRepo.isPrivate && (
													<LuLock className="size-3" />
												)}
												{selectedRepo.name}
											</span>
										) : (
											"Repository"
										)}
									</span>
									<LuChevronDown className="size-[11px] text-neutral-500 dark:text-neutral-400/40" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-64">
								{recentRepos.length > 0 && (
									<>
										<div className="px-2 py-1.5 text-xs text-muted-foreground">
											Recent
										</div>
										{recentRepos.map((repo) => (
											<DropdownMenuItem
												key={repo.id}
												onClick={() => setSelectedRepo(repo)}
												className="flex items-center gap-2"
											>
												{repo.isPrivate && <LuLock className="size-3" />}
												<span className="truncate">{repo.fullName}</span>
											</DropdownMenuItem>
										))}
										<DropdownMenuSeparator />
									</>
								)}
								<div className="px-2 py-1.5 text-xs text-muted-foreground">
									All repositories
								</div>
								{githubRepositories.map((repo) => (
									<DropdownMenuItem
										key={repo.id}
										onClick={() => setSelectedRepo(repo)}
										className="flex items-center gap-2"
									>
										{repo.isPrivate && <LuLock className="size-3" />}
										<span className="truncate">{repo.fullName}</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Model selector */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className={cn(
										"relative flex h-[23px] cursor-pointer items-center gap-[3px] rounded-md px-[7px] py-[3px]",
										"outline outline-[0.5px] outline-neutral-400 dark:outline-[#303030]",
										"bg-transparent dark:bg-[#212121]",
										"hover:bg-neutral-100 hover:outline-neutral-500 dark:hover:bg-[#212121] dark:hover:outline-[#303030]",
										"transition-colors",
									)}
								>
									<span className="text-[14px] leading-4 font-[429] [font-variation-settings:'wght'_429] text-[#191919] dark:text-white whitespace-nowrap">
										{modelLabels[selectedModel]}
									</span>
									<LuChevronDown className="size-[11px] text-neutral-500/60 dark:text-neutral-400/40" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem
									onClick={() => setSelectedModel("claude-sonnet-4")}
								>
									<div className="flex flex-col">
										<span>Claude Sonnet 4</span>
										<span className="text-xs text-muted-foreground">
											Balanced performance
										</span>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setSelectedModel("claude-opus-4")}
								>
									<div className="flex flex-col">
										<span>Claude Opus 4</span>
										<span className="text-xs text-muted-foreground">
											Most capable
										</span>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setSelectedModel("claude-haiku-3-5")}
								>
									<div className="flex flex-col">
										<span>Claude Haiku 3.5</span>
										<span className="text-xs text-muted-foreground">
											Fast and affordable
										</span>
									</div>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Send button */}
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!canSubmit}
						aria-label="Send message"
						className={cn(
							"relative flex size-[23px] shrink-0 items-center justify-center rounded-full",
							"border border-transparent",
							"bg-[#ECECEC] dark:bg-neutral-950",
							"transition-opacity hover:opacity-80",
							"disabled:opacity-50 disabled:cursor-not-allowed",
							"focus-visible:outline-2 focus-visible:outline-[#C0C0C0] dark:focus-visible:outline-[#1F1F1F]",
						)}
					>
						{createMutation.isPending ? (
							<LuLoader className="size-[13px] animate-spin text-[#888888] dark:text-[#666666]" />
						) : (
							<svg
								className="text-[#888888] dark:text-[#666666]"
								width="13"
								height="13"
								viewBox="0 0 13 13"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6.5 10.5V3M3.5 5.5L6.5 2.5L9.5 5.5"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
