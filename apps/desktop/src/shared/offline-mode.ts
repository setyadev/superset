/**
 * Offline/Local Mode - Allows using the app without authentication
 *
 * When offline/local mode is active:
 * - Auth requirements are bypassed (useful for "Skip Login" feature)
 * - Cloud-dependent features are disabled/hidden
 * - Analytics are disabled
 * - Local data (workspaces, terminals, git) is still available
 *
 * This mode is activated when:
 * 1. User clicks "Skip Login" on sign-in page
 * 2. User chooses "Continue Offline" when internet is unavailable
 */

// Local storage key for persisting offline mode preference
export const OFFLINE_MODE_KEY = "superset_offline_mode";

// Mock values used when in offline/local mode
export const OFFLINE_MOCKS = {
	USER_ID: "offline-user",
	USER: {
		id: "offline-user",
		email: "local@superset.sh",
		name: "Local User",
		image: null,
	},
	SESSION: {
		id: "offline-session",
		userId: "offline-user",
	},
} as const;

/**
 * Check if offline mode is enabled
 */
export function isOfflineMode(): boolean {
	if (typeof window === "undefined") return false;
	return localStorage.getItem(OFFLINE_MODE_KEY) === "true";
}

/**
 * Enable offline mode
 */
export function enableOfflineMode(): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(OFFLINE_MODE_KEY, "true");
}

/**
 * Disable offline mode (will require auth on next load)
 */
export function disableOfflineMode(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(OFFLINE_MODE_KEY);
}

/**
 * Clear offline mode data (sign out equivalent)
 */
export function clearOfflineMode(): void {
	disableOfflineMode();
}

/**
 * Get mock session for offline mode
 */
export function getOfflineSession() {
	return {
		user: OFFLINE_MOCKS.USER,
		session: OFFLINE_MOCKS.SESSION,
	};
}
