import type { DetectedPort, MergedPort, StaticPort } from "shared/types";

/**
 * Merge static port configuration with dynamically detected ports.
 *
 * Logic:
 * 1. Start with all static ports (always shown, even when inactive)
 * 2. For dynamic ports matching a static port number: merge process info, mark active
 * 3. For dynamic ports not in static config: add as dynamic-only entries
 * 4. Sort by port number
 */
export function mergePorts({
	staticPorts,
	dynamicPorts,
	workspaceId,
}: {
	staticPorts: StaticPort[];
	dynamicPorts: DetectedPort[];
	workspaceId: string;
}): MergedPort[] {
	// Filter dynamic ports for current workspace
	const workspaceDynamicPorts = dynamicPorts.filter(
		(p) => p.workspaceId === workspaceId,
	);

	// Create a map of port number -> dynamic port info
	const dynamicByPort = new Map(workspaceDynamicPorts.map((p) => [p.port, p]));

	// Create a set of port numbers that have static config
	const staticPortNumbers = new Set(staticPorts.map((p) => p.port));

	const merged: MergedPort[] = [];

	// 1. Process all static ports (they always appear)
	for (const staticPort of staticPorts) {
		const dynamic = dynamicByPort.get(staticPort.port);
		merged.push({
			port: staticPort.port,
			workspaceId,
			label: staticPort.label,
			isActive: !!dynamic,
			pid: dynamic?.pid ?? null,
			processName: dynamic?.processName ?? null,
			paneId: dynamic?.paneId ?? null,
			address: dynamic?.address ?? null,
			detectedAt: dynamic?.detectedAt ?? null,
		});
	}

	// 2. Add dynamic-only ports (not in static config)
	for (const dynamic of workspaceDynamicPorts) {
		if (!staticPortNumbers.has(dynamic.port)) {
			merged.push({
				port: dynamic.port,
				workspaceId,
				label: null,
				isActive: true,
				pid: dynamic.pid,
				processName: dynamic.processName,
				paneId: dynamic.paneId,
				address: dynamic.address,
				detectedAt: dynamic.detectedAt,
			});
		}
	}

	// Sort by port number
	return merged.sort((a, b) => a.port - b.port);
}
