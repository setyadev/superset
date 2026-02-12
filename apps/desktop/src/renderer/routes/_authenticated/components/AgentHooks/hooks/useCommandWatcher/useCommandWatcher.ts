// Multi-device command watching disabled for solo mode
export function useCommandWatcher() {
	return {
		isWatching: false,
		deviceId: null,
		pendingCount: 0,
	};
}
