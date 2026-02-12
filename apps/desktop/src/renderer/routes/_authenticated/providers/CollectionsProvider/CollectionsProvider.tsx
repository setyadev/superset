import { createContext, type ReactNode, useContext, useMemo } from "react";
import { getCollections } from "./collections";

type Collections = ReturnType<typeof getCollections>;

const CollectionsContext = createContext<Collections | null>(null);

export function CollectionsProvider({ children }: { children: ReactNode }) {
	const collections = useMemo(() => {
		return getCollections();
	}, []);

	return (
		<CollectionsContext.Provider value={collections}>
			{children}
		</CollectionsContext.Provider>
	);
}

export function useCollections(): Collections {
	const context = useContext(CollectionsContext);
	if (!context) {
		throw new Error("useCollections must be used within CollectionsProvider");
	}
	return context;
}
