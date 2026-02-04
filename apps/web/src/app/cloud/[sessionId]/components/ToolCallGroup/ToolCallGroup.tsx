"use client";

import { Tool, ToolContent } from "@superset/ui/ai-elements/tool";
import { Badge } from "@superset/ui/badge";
import { CollapsibleTrigger } from "@superset/ui/collapsible";
import { cn } from "@superset/ui/utils";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import type { CloudEvent } from "../../hooks";
import { formatToolGroup } from "../../lib/tool-formatters";
import { ToolCallItem } from "../ToolCallItem";
import { ToolIcon } from "../ToolIcon";

interface ToolCallGroupProps {
	events: CloudEvent[];
	groupId: string;
}

export function ToolCallGroup({ events, groupId }: ToolCallGroupProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

	const firstEvent = events[0];
	if (!firstEvent) {
		return null;
	}

	const formatted = formatToolGroup(events);

	const time = new Date(firstEvent.timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	const toggleItem = (itemId: string) => {
		setExpandedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(itemId)) {
				newSet.delete(itemId);
			} else {
				newSet.add(itemId);
			}
			return newSet;
		});
	};

	// For single tool call, render directly without group wrapper
	if (events.length === 1) {
		return (
			<ToolCallItem
				event={firstEvent}
				isExpanded={expandedItems.has(`${groupId}-0`)}
				onToggle={() => toggleItem(`${groupId}-0`)}
			/>
		);
	}

	return (
		<Tool
			open={isExpanded}
			onOpenChange={setIsExpanded}
			className="mb-2 border-border/50 bg-transparent"
		>
			<CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-2 text-xs hover:bg-muted/50 rounded-md transition-colors">
				<div className="flex items-center gap-2 min-w-0">
					<ToolIcon name={formatted.icon} className="shrink-0 size-4" />
					<span className="font-medium text-foreground shrink-0">
						{formatted.toolName}
					</span>
					<Badge
						variant="secondary"
						className="rounded-full text-[10px] px-1.5 py-0"
					>
						{formatted.count}
					</Badge>
					<span className="text-muted-foreground/70 truncate">
						{formatted.summary}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<span className="text-[10px] text-muted-foreground/50 tabular-nums">
						{time}
					</span>
					<ChevronDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isExpanded && "rotate-180",
						)}
					/>
				</div>
			</CollapsibleTrigger>

			<ToolContent>
				<div className="pl-4 border-l-2 border-border/30 ml-3 space-y-1">
					{events.map((event, index) => (
						<ToolCallItem
							key={`${groupId}-${index}`}
							event={event}
							isExpanded={expandedItems.has(`${groupId}-${index}`)}
							onToggle={() => toggleItem(`${groupId}-${index}`)}
							showTime={false}
						/>
					))}
				</div>
			</ToolContent>
		</Tool>
	);
}
