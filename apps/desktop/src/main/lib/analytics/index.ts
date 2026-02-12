let _userId: string | null = null;

export function setUserId(id: string | null): void {
	_userId = id;
}

export function track(
	_event: string,
	_properties?: Record<string, unknown>,
): void {
	// Analytics disabled - PostHog removed
	// console.log(`[analytics] ${event}`, { userId, ...properties });
}
