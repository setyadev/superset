import type React from "react";
import { TRPCProvider } from "./TRPCProvider";
import { WindowIdProvider } from "./WindowIdContext";

interface AppProvidersProps {
	children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
	return (
		<WindowIdProvider>
			<TRPCProvider>{children}</TRPCProvider>
		</WindowIdProvider>
	);
}
