import { createContext, useContext, useEffect, useState } from "react";

interface WindowIdContextValue {
	windowId: string | null;
	isLoading: boolean;
}

const WindowIdContext = createContext<WindowIdContextValue>({
	windowId: null,
	isLoading: true,
});

export function WindowIdProvider({ children }: { children: React.ReactNode }) {
	const [windowId, setWindowId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function fetchWindowId() {
			try {
				const id = await window.ipcRenderer.invoke("window-get-id");
				console.log("[WindowIdContext] Got window ID:", id);
				setWindowId(id);
			} catch (error) {
				console.error("[WindowIdContext] Failed to get window ID:", error);
			} finally {
				setIsLoading(false);
			}
		}
		fetchWindowId();
	}, []);

	return (
		<WindowIdContext.Provider value={{ windowId, isLoading }}>
			{children}
		</WindowIdContext.Provider>
	);
}

export function useWindowId(): string | null {
	const { windowId } = useContext(WindowIdContext);
	return windowId;
}

export function useWindowIdContext(): WindowIdContextValue {
	return useContext(WindowIdContext);
}
