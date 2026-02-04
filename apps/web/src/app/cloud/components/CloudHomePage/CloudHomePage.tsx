"use client";

import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@superset/ui/sidebar";

import { CloudPromptInput } from "../CloudPromptInput";
import { CloudSidebar, type CloudWorkspace } from "../CloudSidebar";

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

interface CloudHomePageProps {
	organizationId: string;
	workspaces: CloudWorkspace[];
	hasGitHubInstallation: boolean;
	githubRepositories: GitHubRepository[];
}

export function CloudHomePage({
	organizationId,
	workspaces: initialWorkspaces,
	hasGitHubInstallation,
	githubRepositories,
}: CloudHomePageProps) {
	// Calculate stats for the main content area
	const activeWorkspacesCount = initialWorkspaces.filter((w) => {
		const now = new Date();
		const diff = now.getTime() - new Date(w.updatedAt).getTime();
		const days = diff / (1000 * 60 * 60 * 24);
		return days <= 7;
	}).length;

	const thisWeekCount = initialWorkspaces.filter((w) => {
		const diff = Date.now() - new Date(w.createdAt).getTime();
		return diff < 7 * 24 * 60 * 60 * 1000;
	}).length;

	return (
		<SidebarProvider>
			<CloudSidebar initialWorkspaces={initialWorkspaces} />

			<SidebarInset className="bg-neutral-50 dark:bg-[#141414]">
				<header className="h-14 flex items-center gap-3 border-b px-4">
					<SidebarTrigger />
				</header>
				<main className="flex-1 flex flex-col items-center justify-center p-8 relative">
					{/* Centered prompt input */}
					<CloudPromptInput
						organizationId={organizationId}
						hasGitHubInstallation={hasGitHubInstallation}
						githubRepositories={githubRepositories}
						recentWorkspaces={initialWorkspaces}
					/>

					{/* Stats cards */}
					<div className="w-full max-w-2xl mt-12 grid grid-cols-3 gap-4">
						<StatsCard
							label="Sessions"
							value={initialWorkspaces.length.toString()}
						/>
						<StatsCard
							label="Active"
							value={activeWorkspacesCount.toString()}
						/>
						<StatsCard label="This week" value={thisWeekCount.toString()} />
					</div>
				</main>

				{/* Footer */}
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2">
					<span className="text-xs text-muted-foreground flex items-center gap-1.5">
						<span className="size-1.5 rounded-full bg-green-500" />
						{initialWorkspaces.length} cloud sessions
					</span>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

const SPARKLINE_HEIGHTS = [45, 65, 35, 80, 50, 70, 40, 85, 55, 75, 30, 60];

function StatsCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-background/80 backdrop-blur border rounded-xl p-4">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-2xl font-semibold mt-1">{value}</p>
			{/* Mini sparkline */}
			<div className="mt-3 h-8 flex items-end gap-0.5">
				{SPARKLINE_HEIGHTS.map((height, i) => (
					<div
						key={i}
						className="flex-1 bg-primary/20 rounded-sm"
						style={{ height: `${height}%` }}
					/>
				))}
			</div>
		</div>
	);
}
