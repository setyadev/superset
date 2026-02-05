import Image from "next/image";
import {
	LuChevronDown,
	LuFile,
	LuFilePlus,
	LuFolder,
	LuFolderGit2,
	LuGitPullRequest,
	LuPencil,
	LuPlus,
	LuTerminal,
	LuX,
} from "react-icons/lu";

/**
 * OG image preview route.
 * Visit /og-preview, set viewport to 1200x630, and screenshot.
 * This is a static version of the hero AppMockup optimized for OG dimensions.
 */

const WORKSPACES = [
	{
		name: "use any agents",
		branch: "use-any-agents",
		add: 46,
		del: 1,
		pr: "#733",
		isActive: true,
		status: "working" as const,
	},
	{
		name: "create parallel branches",
		branch: "create-parallel-branches",
		add: 193,
		del: 0,
		pr: "#815",
		status: "review" as const,
	},
	{
		name: "see changes",
		branch: "see-changes",
		add: 394,
		del: 23,
		pr: "#884",
	},
	{
		name: "open in any IDE",
		branch: "open-in-any-ide",
		add: 33,
		del: 0,
		pr: "#816",
		status: "permission" as const,
	},
	{
		name: "forward ports",
		branch: "forward-ports",
		add: 127,
		del: 8,
		pr: "#902",
	},
];

const FILE_CHANGES = [
	{ path: "bun.lock", add: 38, del: 25, type: "edit" },
	{ path: "packages/db/src/schema", type: "folder" },
	{ path: "cloud-workspace.ts", add: 119, del: 0, type: "add", indent: 1 },
	{ path: "enums.ts", add: 21, del: 0, type: "edit", indent: 1 },
	{ path: "apps/desktop/src/renderer", type: "folder" },
	{ path: "CloudTerminal.tsx", add: 169, del: 0, type: "add", indent: 1 },
	{
		path: "useCloudWorkspaces...",
		add: 84,
		del: 0,
		type: "add",
		indent: 1,
	},
	{ path: "WorkspaceSidebar.tsx", add: 14, del: 0, type: "edit", indent: 1 },
	{ path: "apps/api/src/trpc/routers", type: "folder" },
	{ path: "ssh-manager.ts", add: 277, del: 0, type: "add", indent: 1 },
	{ path: "index.ts", add: 7, del: 0, type: "edit", indent: 1 },
];

const PORTS = [
	{ workspace: "use any agents", ports: ["3002"] },
	{ workspace: "see changes", ports: ["3000", "3001", "5678"] },
];

function SupersetLogo() {
	return (
		<svg
			viewBox="0 0 392 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-label="Superset"
			className="h-5 w-auto"
		>
			<title>Superset</title>
			<path
				d="M25.2727 -0.00017944H37.9091V12.6362H25.2727V-0.00017944ZM12.6364 -0.00017944H25.2727V12.6362H12.6364V-0.00017944ZM0 12.6362H12.6364V25.2725H0V12.6362ZM0 25.2725H12.6364V37.9089H0V25.2725ZM12.6364 25.2725H25.2727V37.9089H12.6364V25.2725ZM25.2727 25.2725H37.9091V37.9089H25.2727V25.2725ZM25.2727 37.9089H37.9091V50.5453H25.2727V37.9089ZM25.2727 50.5453H37.9091V63.1816H25.2727V50.5453ZM12.6364 50.5453H25.2727V63.1816H12.6364V50.5453ZM0 50.5453H12.6364V63.1816H0V50.5453ZM0 -0.00017944H12.6364V12.6362H0V-0.00017944ZM50.4961 -0.00017944H63.1325V12.6362H50.4961V-0.00017944ZM50.4961 12.6362H63.1325V25.2725H50.4961V12.6362ZM50.4961 25.2725H63.1325V37.9089H50.4961V25.2725ZM50.4961 37.9089H63.1325V50.5453H50.4961V37.9089ZM50.4961 50.5453H63.1325V63.1816H50.4961V50.5453ZM63.1325 50.5453H75.7688V63.1816H63.1325V50.5453ZM75.7688 50.5453H88.4052V63.1816H75.7688V50.5453ZM75.7688 37.9089H88.4052V50.5453H75.7688V37.9089ZM75.7688 25.2725H88.4052V37.9089H75.7688V25.2725ZM75.7688 12.6362H88.4052V25.2725H75.7688V12.6362ZM75.7688 -0.00017944H88.4052V12.6362H75.7688V-0.00017944ZM100.992 -0.00017944H113.629V12.6362H100.992V-0.00017944ZM100.992 12.6362H113.629V25.2725H100.992V12.6362ZM100.992 25.2725H113.629V37.9089H100.992V25.2725ZM100.992 37.9089H113.629V50.5453H100.992V37.9089ZM100.992 50.5453H113.629V63.1816H100.992V50.5453ZM113.629 -0.00017944H126.265V12.6362H113.629V-0.00017944ZM126.265 -0.00017944H138.901V12.6362H126.265V-0.00017944ZM126.265 12.6362H138.901V25.2725H126.265V12.6362ZM126.265 25.2725H138.901V37.9089H126.265V25.2725ZM113.629 25.2725H126.265V37.9089H113.629V25.2725ZM151.488 -0.00017944H164.125V12.6362H151.488V-0.00017944ZM151.488 12.6362H164.125V25.2725H151.488V12.6362ZM151.488 25.2725H164.125V37.9089H151.488V25.2725ZM151.488 37.9089H164.125V50.5453H151.488V37.9089ZM151.488 50.5453H164.125V63.1816H151.488V50.5453ZM164.125 -0.00017944H176.761V12.6362H164.125V-0.00017944ZM164.125 50.5453H176.761V63.1816H164.125V50.5453ZM164.125 25.2725H176.761V37.9089H164.125V25.2725ZM176.761 -0.00017944H189.397V12.6362H176.761V-0.00017944ZM176.761 50.5453H189.397V63.1816H176.761V50.5453ZM201.984 50.5453H214.621V63.1816H201.984V50.5453ZM201.984 37.9089H214.621V50.5453H201.984V37.9089ZM201.984 25.2725H214.621V37.9089H201.984V25.2725ZM201.984 12.6362H214.621V25.2725H201.984V12.6362ZM201.984 -0.00017944H214.621V12.6362H201.984V-0.00017944ZM214.621 -0.00017944H227.257V12.6362H214.621V-0.00017944ZM227.257 -0.00017944H239.893V12.6362H227.257V-0.00017944ZM227.257 12.6362H239.893V25.2725H227.257V12.6362ZM214.621 25.2725H227.257V37.9089H214.621V25.2725ZM227.257 37.9089H239.893V50.5453H227.257V37.9089ZM227.257 50.5453H239.893V63.1816H227.257V50.5453ZM277.753 -0.00017944H290.39V12.6362H277.753V-0.00017944ZM265.117 -0.00017944H277.753V12.6362H265.117V-0.00017944ZM252.48 12.6362H265.117V25.2725H252.48V12.6362ZM252.48 25.2725H265.117V37.9089H252.48V25.2725ZM265.117 25.2725H277.753V37.9089H265.117V25.2725ZM277.753 25.2725H290.39V37.9089H277.753V25.2725ZM277.753 37.9089H290.39V50.5453H277.753V37.9089ZM277.753 50.5453H290.39V63.1816H277.753V50.5453ZM265.117 50.5453H277.753V63.1816H265.117V50.5453ZM252.48 50.5453H265.117V63.1816H252.48V50.5453ZM252.48 -0.00017944H265.117V12.6362H252.48V-0.00017944ZM302.977 -0.00017944H315.613V12.6362H302.977V-0.00017944ZM302.977 12.6362H315.613V25.2725H302.977V12.6362ZM302.977 25.2725H315.613V37.9089H302.977V25.2725ZM302.977 37.9089H315.613V50.5453H302.977V37.9089ZM302.977 50.5453H315.613V63.1816H302.977V50.5453ZM315.613 -0.00017944H328.249V12.6362H315.613V-0.00017944ZM315.613 50.5453H328.249V63.1816H315.613V50.5453ZM315.613 25.2725H328.249V37.9089H315.613V25.2725ZM328.249 -0.00017944H340.886V12.6362H328.249V-0.00017944ZM328.249 50.5453H340.886V63.1816H328.249V50.5453ZM353.473 -0.00017944H366.109V12.6362H353.473V-0.00017944ZM366.109 -0.00017944H378.745V12.6362H366.109V-0.00017944ZM378.745 -0.00017944H391.382V12.6362H378.745V-0.00017944ZM366.109 12.6362H378.745V25.2725H366.109V12.6362ZM366.109 25.2725H378.745V37.9089H366.109V25.2725ZM366.109 37.9089H378.745V50.5453H366.109V37.9089ZM366.109 50.5453H378.745V63.1816H366.109V50.5453Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function StatusDot({
	status,
}: {
	status: "permission" | "working" | "review";
}) {
	const color = {
		permission: "bg-red-500",
		working: "bg-amber-500",
		review: "bg-green-500",
	}[status];

	return <span className={`inline-flex size-2 rounded-full ${color}`} />;
}

function WorkspaceItem({
	name,
	branch,
	add,
	del,
	pr,
	isActive,
	status,
}: {
	name: string;
	branch: string;
	add?: number;
	del?: number;
	pr?: string;
	isActive?: boolean;
	status?: "permission" | "working" | "review";
}) {
	return (
		<div
			className={`flex items-start gap-2 px-2 py-1 text-[10px] ${isActive ? "bg-white/10" : ""} relative`}
		>
			{isActive && (
				<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500 rounded-r" />
			)}
			<div className="mt-0.5 text-muted-foreground/50 relative">
				{status === "working" ? (
					<span className="text-amber-500 font-mono text-[10px]">⠹</span>
				) : (
					<LuFolderGit2 className="size-3.5" />
				)}
				{status && status !== "working" && (
					<span className="absolute -top-0.5 -right-0.5">
						<StatusDot status={status} />
					</span>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-1">
					<span
						className={`truncate ${isActive ? "text-foreground font-medium" : "text-foreground/80"}`}
					>
						{name}
					</span>
					{add !== undefined && (
						<span className="text-[9px] shrink-0">
							<span className="text-emerald-400">+{add}</span>
							{del !== undefined && del > 0 && (
								<span className="text-red-400 ml-0.5">-{del}</span>
							)}
						</span>
					)}
				</div>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground/50 truncate text-[9px] font-mono">
						{branch}
					</span>
					{pr && (
						<span className="text-muted-foreground/40 text-[9px] flex items-center gap-0.5">
							<LuGitPullRequest className="size-2.5" />
							{pr}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function FileChangeItem({
	path,
	add = 0,
	del = 0,
	indent = 0,
	type,
}: {
	path: string;
	add?: number;
	del?: number;
	indent?: number;
	type: string;
}) {
	const Icon =
		type === "folder"
			? LuFolder
			: type === "add"
				? LuFilePlus
				: type === "edit"
					? LuPencil
					: LuFile;
	const iconColor =
		type === "add"
			? "text-emerald-400"
			: type === "edit"
				? "text-amber-400"
				: "text-muted-foreground/50";
	const isFolder = type === "folder";

	return (
		<div
			className={`flex items-center justify-between gap-2 px-3 ${isFolder ? "py-1.5 mt-1" : "py-1"}`}
			style={{ paddingLeft: `${12 + (indent || 0) * 14}px` }}
		>
			<div className="flex items-center gap-2 min-w-0">
				<Icon className={`size-3.5 shrink-0 ${iconColor}`} />
				<span
					className={`truncate ${isFolder ? "text-muted-foreground/60 text-[9px]" : "text-muted-foreground/80 text-[10px]"}`}
				>
					{path}
				</span>
			</div>
			{!isFolder && (add > 0 || del > 0) && (
				<span className="shrink-0 tabular-nums text-[9px]">
					{add > 0 && <span className="text-emerald-400">+{add}</span>}
					{del > 0 && <span className="text-red-400 ml-1">-{del}</span>}
				</span>
			)}
		</div>
	);
}

export default function OgPreview() {
	return (
		<div
			className="relative overflow-hidden bg-[#0a0a0a]"
			style={{ width: 1200, height: 630 }}
		>
			{/* Gradient background */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse at 30% 50%, #7f1d1d 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, #991b1b 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, #450a0a 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, #1a1a2e 0%, transparent 60%)",
				}}
			/>
			<div className="absolute inset-0 bg-black/30" />

			{/* Content */}
			<div className="relative flex flex-col h-full p-6">
				{/* Logo */}
				<div className="flex items-center gap-3 pb-4 text-white">
					<SupersetLogo />
				</div>

				{/* App mockup */}
				<div className="flex-1 min-h-0">
					<div className="relative w-full h-full rounded-xl overflow-hidden bg-black/40 backdrop-blur-xl border border-white/[0.08] shadow-2xl">
						{/* Window chrome */}
						<div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
							<div className="flex items-center gap-1.5">
								<div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
								<div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
								<div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
							</div>
							<span className="text-[11px] text-muted-foreground/70">
								superset
							</span>
							<div className="w-12" />
						</div>

						<div className="flex h-[calc(100%-36px)]">
							{/* Left sidebar */}
							<div className="w-[180px] bg-white/[0.02] border-r border-white/[0.06] flex flex-col shrink-0">
								<div className="px-2 py-2 border-b border-white/[0.06]">
									<div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 px-1.5 py-1">
										<LuPlus className="size-3.5" />
										<span>New Workspace</span>
									</div>
								</div>

								<div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.06]">
									<div className="flex items-center gap-2">
										<span className="text-[11px] text-foreground/90">
											superset
										</span>
										<span className="text-[10px] text-muted-foreground/50">
											(5)
										</span>
									</div>
									<div className="flex items-center gap-1 text-muted-foreground/50">
										<LuPlus className="size-3" />
										<LuChevronDown className="size-3" />
									</div>
								</div>

								<div className="flex-1 overflow-hidden">
									{WORKSPACES.map((ws) => (
										<WorkspaceItem
											key={ws.branch}
											name={ws.name}
											branch={ws.branch}
											add={ws.add}
											del={ws.del}
											pr={ws.pr}
											isActive={ws.isActive}
											status={ws.status}
										/>
									))}
								</div>

								<div className="border-t border-white/[0.06]">
									<div className="flex items-center justify-between px-2 py-1.5">
										<div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
											<span>⌥</span>
											<span>Ports</span>
										</div>
										<span className="text-[9px] text-muted-foreground/30">
											4
										</span>
									</div>
									{PORTS.map((port) => (
										<div key={port.workspace} className="px-2 py-1">
											<div className="flex items-center justify-between text-[9px]">
												<span className="text-muted-foreground/50 truncate">
													{port.workspace}
												</span>
												<LuX className="size-2.5 text-muted-foreground/30" />
											</div>
											<div className="flex flex-wrap gap-1 mt-0.5">
												{port.ports.map((p) => (
													<span
														key={p}
														className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-muted-foreground/60 tabular-nums"
													>
														{p}
													</span>
												))}
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Main content area */}
							<div className="flex-1 flex flex-col min-w-0">
								{/* Tab bar */}
								<div className="flex items-center gap-0.5 px-2 py-1 bg-white/[0.02] border-b border-white/[0.06]">
									<div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.06] rounded-t text-[10px] text-foreground/90 border-b-2 border-cyan-500/70">
										<Image
											src="/app-icons/claude.svg"
											alt="Claude"
											width={12}
											height={12}
										/>
										<span>claude</span>
										<LuX className="size-3 text-muted-foreground/50" />
									</div>
									<div className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground/60">
										<Image
											src="/app-icons/codex.svg"
											alt="Codex"
											width={12}
											height={12}
										/>
										<span>codex</span>
										<LuX className="size-3 text-muted-foreground/30" />
									</div>
									<div className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground/60">
										<Image
											src="/app-icons/gemini.svg"
											alt="Gemini"
											width={12}
											height={12}
										/>
										<span>gemini</span>
										<LuX className="size-3 text-muted-foreground/30" />
									</div>
									<div className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground/60">
										<Image
											src="/app-icons/cursor-agent.svg"
											alt="Cursor"
											width={12}
											height={12}
										/>
										<span>cursor</span>
										<LuX className="size-3 text-muted-foreground/30" />
									</div>
									<div className="flex items-center px-2 py-1 text-muted-foreground/40">
										<LuPlus className="size-3.5" />
										<LuChevronDown className="size-3 ml-0.5" />
									</div>
								</div>

								{/* Terminal header */}
								<div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 border-b border-white/[0.04]">
									<LuTerminal className="size-3 text-muted-foreground/40" />
									<span className="text-[10px] text-muted-foreground/60">
										Terminal
									</span>
									<div className="flex-1" />
									<span className="text-muted-foreground/20 text-[10px]">
										□
									</span>
									<LuX className="size-3 text-muted-foreground/20" />
								</div>

								{/* Terminal content */}
								<div className="flex-1 bg-black/30 p-3 font-mono text-[10px] leading-relaxed overflow-hidden">
									{/* Claude ASCII art header */}
									<div className="flex items-start gap-3 mb-3">
										<div className="text-cyan-400 leading-none whitespace-pre text-[9px]">
											{`  * ▐▛███▜▌ *
 * ▝▜█████▛▘ *
  *  ▘▘ ▝▝  *`}
										</div>
										<div className="text-muted-foreground/90 text-[10px]">
											<div>
												<span className="text-foreground font-medium">
													Claude Code
												</span>{" "}
												v2.0.74
											</div>
											<div>Opus 4.5 · Claude Max</div>
											<div className="text-muted-foreground/60">
												~/.superset/worktrees/superset/cloud-ws
											</div>
										</div>
									</div>

									{/* Command prompt */}
									<div className="text-foreground mb-3">
										<span className="text-muted-foreground/60">❯</span>{" "}
										<span className="text-cyan-400">/mcp</span>
									</div>

									{/* MCP output */}
									<div className="border-t border-white/[0.04] pt-3 space-y-2">
										<div>
											<span className="text-foreground font-medium">
												Manage MCP servers
											</span>
										</div>
										<div className="text-muted-foreground/70">1 server</div>

										<div className="mt-2">
											<span className="text-muted-foreground/50">❯</span>
											<span className="text-foreground ml-1">1.</span>
											<span className="text-cyan-400 ml-1">morph-mcp</span>
											<span className="text-emerald-400 ml-2">✓ connected</span>
											<span className="text-muted-foreground/50 ml-2">
												· Enter to view details
											</span>
										</div>

										<div className="mt-3 text-muted-foreground/70">
											<div>MCP Config locations (by scope):</div>
											<div className="ml-2">
												• User config (available in all your projects):
											</div>
											<div className="ml-4 text-muted-foreground/50">
												· /Users/kietho/.claude.json
											</div>
											<div className="ml-2">
												• Project config (shared via .mcp.json):
											</div>
											<div className="ml-4 text-muted-foreground/50">
												·
												/Users/kietho/.superset/worktrees/superset/cloud-ws/.mcp.json
											</div>
											<div className="ml-2">
												• Local config (private to you in this project):
											</div>
											<div className="ml-4 text-muted-foreground/50">
												· /Users/kietho/.claude.json [project: ...]
											</div>
										</div>

										<div className="mt-3 text-muted-foreground/70">
											Tip: Use /mcp enable or /mcp disable to quickly toggle all
											servers
										</div>

										<div className="mt-2 text-muted-foreground/50">
											For help configuring MCP servers, see:{" "}
											<span className="text-cyan-400/70">
												https://code.claude.com/docs/en/mcp
											</span>
										</div>

										<div className="mt-3 text-muted-foreground/60">
											Enter to confirm · Esc to cancel
										</div>
									</div>
								</div>
							</div>

							{/* Right sidebar */}
							<div className="w-[200px] bg-white/[0.02] border-l border-white/[0.06] flex flex-col shrink-0">
								<div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
									<span className="text-[10px] text-foreground/70">
										Review Changes
									</span>
									<div className="flex items-center gap-1 text-[10px]">
										<LuGitPullRequest className="size-3.5 text-cyan-400/70" />
										<span className="text-muted-foreground/60">#827</span>
									</div>
								</div>

								<div className="px-3 py-2 border-b border-white/[0.06] space-y-2">
									<div className="h-7 bg-black/20 rounded border border-white/[0.06] px-2 flex items-center text-[10px] text-muted-foreground/30">
										Commit message...
									</div>
									<div className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] bg-white/[0.06] rounded text-foreground/80">
										<span>↑</span>
										<span>Push</span>
										<span className="text-muted-foreground/50">26</span>
									</div>
								</div>

								<div className="flex-1 overflow-hidden">
									{FILE_CHANGES.map((file, i) => (
										<FileChangeItem
											key={`${file.path}-${i}`}
											path={file.path}
											add={file.add}
											del={file.del}
											indent={file.indent}
											type={file.type}
										/>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
