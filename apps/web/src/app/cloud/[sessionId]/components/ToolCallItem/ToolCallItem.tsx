"use client";

import {
	CodeBlock,
	CodeBlockCopyButton,
} from "@superset/ui/ai-elements/code-block";
import { Tool, ToolContent } from "@superset/ui/ai-elements/tool";
import { Badge } from "@superset/ui/badge";
import { CollapsibleTrigger } from "@superset/ui/collapsible";
import { cn } from "@superset/ui/utils";
import {
	CheckCircleIcon,
	ChevronDownIcon,
	CircleIcon,
	ClockIcon,
} from "lucide-react";

import type { CloudEvent } from "../../hooks";
import { formatToolCall } from "../../lib/tool-formatters";
import { ToolIcon } from "../ToolIcon";

interface ToolCallItemProps {
	event: CloudEvent;
	isExpanded: boolean;
	onToggle: () => void;
	showTime?: boolean;
	isPending?: boolean;
}

export function ToolCallItem({
	event,
	isExpanded,
	onToggle,
	showTime = true,
	isPending = false,
}: ToolCallItemProps) {
	const formatted = formatToolCall(event);
	const time = new Date(event.timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	const { args, output } = formatted.getDetails();
	// Check for explicit error field in event data first, then fall back to string patterns
	const eventData = event.data as { error?: string } | undefined;
	const hasExplicitError = Boolean(eventData?.error);
	// Only use string matching as fallback, and look for actual error patterns
	const hasErrorPattern =
		output?.startsWith("Error:") || output?.startsWith("error:");
	const hasError = hasExplicitError || hasErrorPattern;

	const getStatusBadge = () => {
		if (isPending) {
			return (
				<Badge
					variant="secondary"
					className="gap-1 rounded-full text-[10px] px-1.5 py-0"
				>
					<ClockIcon className="size-3 animate-pulse" />
					Running
				</Badge>
			);
		}
		if (hasError) {
			return (
				<Badge
					variant="destructive"
					className="gap-1 rounded-full text-[10px] px-1.5 py-0"
				>
					<CircleIcon className="size-3" />
					Error
				</Badge>
			);
		}
		if (output) {
			return (
				<Badge
					variant="secondary"
					className="gap-1 rounded-full text-[10px] px-1.5 py-0 text-green-600"
				>
					<CheckCircleIcon className="size-3" />
					Done
				</Badge>
			);
		}
		return null;
	};

	return (
		<Tool
			open={isExpanded}
			onOpenChange={onToggle}
			className="mb-2 border-border/50 bg-transparent"
		>
			<CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-2 text-xs hover:bg-muted/50 rounded-md transition-colors">
				<div className="flex items-center gap-2 min-w-0">
					<ToolIcon name={formatted.icon} className="shrink-0 size-4" />
					<span className="font-medium text-foreground shrink-0">
						{formatted.toolName}
					</span>
					<span className="text-muted-foreground/70 truncate">
						{formatted.summary}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{getStatusBadge()}
					{showTime && !isPending && (
						<span className="text-[10px] text-muted-foreground/50 tabular-nums">
							{time}
						</span>
					)}
					<ChevronDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isExpanded && "rotate-180",
						)}
					/>
				</div>
			</CollapsibleTrigger>

			<ToolContent>
				<div className="px-2 pb-2 space-y-3">
					{args && Object.keys(args).length > 0 && (
						<div>
							<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
								Arguments
							</h4>
							<CodeBlock
								code={JSON.stringify(args, null, 2)}
								language="json"
								className="text-xs border-border/50"
							>
								<CodeBlockCopyButton className="size-6" />
							</CodeBlock>
						</div>
					)}
					{output && (
						<div>
							<h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
								{hasError ? "Error" : "Output"}
							</h4>
							<CodeBlock
								code={output}
								language="json"
								className={cn(
									"text-xs max-h-48 overflow-y-auto border-border/50",
									hasError && "border-destructive/50",
								)}
							>
								<CodeBlockCopyButton className="size-6" />
							</CodeBlock>
						</div>
					)}
					{!args && !output && (
						<p className="text-xs text-muted-foreground/60 italic px-1">
							No details available
						</p>
					)}
				</div>
			</ToolContent>
		</Tool>
	);
}
