interface Tab {
	id: string;
	title: string;
	icon?: string;
	url?: string;
	type: "terminal" | "browser" | "folder";
}

interface SidebarProps {
	onTabSelect: (tabId: string) => void;
	activeTabId?: string;
	onCollapse: () => void;
}

export function Sidebar({ onTabSelect, activeTabId, onCollapse }: SidebarProps) {
	const tab: Tab = { id: "1", title: "Terminal", type: "terminal" };

	return (
		<div className="flex flex-col h-full w-64 select-none bg-neutral-900 text-neutral-300 border-r border-neutral-800">
			{/* Top Section - Window Controls */}
			<div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-neutral-800">
				<div className="flex gap-2">
					<div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
					<div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
					<div className="w-3 h-3 rounded-full bg-[#28C840]" />
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={onCollapse}
						className="p-2 rounded opacity-70 hover:opacity-100 hover:bg-neutral-800 transition-all"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M10 4L6 8L10 12"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>
			</div>

			{/* Tabs Section */}
			<div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
				{/* New Tab Button */}
				<button className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm opacity-70 hover:opacity-100 hover:bg-neutral-800 transition-all">
					<span>+</span>
					<span>New Tab</span>
				</button>

				{/* Terminal Tab */}
				<button
					onClick={() => onTabSelect(tab.id)}
					className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
						activeTabId === tab.id
							? "opacity-100 bg-neutral-800 border border-neutral-700"
							: "opacity-70 hover:opacity-100 hover:bg-neutral-800"
					}`}
				>
					<span>▶︎</span>
					<span className="truncate">{tab.title}</span>
				</button>
			</div>
		</div>
	);
}
