import { type AuthProvider, COMPANY } from "@superset/shared/constants";
import { Button } from "@superset/ui/button";
import { Spinner } from "@superset/ui/spinner";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineWifi } from "react-icons/hi2";
import { env } from "renderer/env.renderer";
import { useOnlineStatus } from "renderer/hooks/useOnlineStatus";
import { authClient } from "renderer/lib/auth-client";
import { electronTrpc } from "renderer/lib/electron-trpc";
import { enableOfflineMode, isOfflineMode } from "shared/offline-mode";
import { SupersetLogo } from "./components/SupersetLogo";

export const Route = createFileRoute("/sign-in/")({
	component: SignInPage,
});

function SignInPage() {
	const { data: session, isPending } = authClient.useSession();
	const signInMutation = electronTrpc.auth.signIn.useMutation();
	const isOnline = useOnlineStatus();

	// Dev bypass: skip sign-in entirely
	if (env.SKIP_ENV_VALIDATION) {
		return <Navigate to="/workspace" replace />;
	}

	// If already signed in, redirect to workspace
	if (session?.user) {
		return <Navigate to="/workspace" replace />;
	}

	// If in offline mode, redirect to workspace
	if (isOfflineMode()) {
		return <Navigate to="/workspace" replace />;
	}

	// Show loading while session is being fetched
	if (isPending) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<Spinner className="size-8" />
			</div>
		);
	}

	const signIn = (provider: AuthProvider) => {
		signInMutation.mutate({ provider });
	};

	const continueOffline = () => {
		enableOfflineMode();
		window.location.href = "/workspace";
	};

	return (
		<div className="flex flex-col h-full w-full bg-background">
			<div className="h-12 w-full drag shrink-0" />

			<div className="flex flex-1 items-center justify-center">
				<div className="flex flex-col items-center w-full max-w-md px-8">
					<div className="mb-8">
						<SupersetLogo className="h-12 w-auto" />
					</div>

					<div className="text-center mb-8">
						<h1 className="text-xl font-semibold text-foreground mb-2">
							Welcome to Superset
						</h1>
						<p className="text-sm text-muted-foreground">
							Sign in to get started
						</p>
					</div>

					{isOnline ? (
						<div className="flex flex-col gap-3 w-full max-w-xs">
							<Button
								variant="outline"
								size="lg"
								onClick={() => signIn("github")}
								className="w-full gap-3"
							>
								<FaGithub className="size-5" />
								Continue with GitHub
							</Button>

							<Button
								variant="outline"
								size="lg"
								onClick={() => signIn("google")}
								className="w-full gap-3"
							>
								<FcGoogle className="size-5" />
								Continue with Google
							</Button>

							<div className="relative my-2">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t border-border" />
								</div>
								<span className="relative flex justify-center text-xs text-muted-foreground bg-background px-2">
									or
								</span>
							</div>

							<Button
								variant="secondary"
								size="lg"
								onClick={continueOffline}
								className="w-full"
							>
								Skip Login
							</Button>

							<p className="text-xs text-muted-foreground text-center">
								Use locally without cloud features
							</p>
						</div>
					) : (
						<div className="flex flex-col items-center gap-4 w-full max-w-xs p-6 border border-dashed border-border rounded-lg bg-muted/50">
							<HiOutlineWifi className="size-8 text-muted-foreground" />
							<div className="text-center">
								<p className="text-sm text-muted-foreground">
									You're currently offline
								</p>
							</div>
							<Button
								variant="secondary"
								size="lg"
								onClick={continueOffline}
								className="w-full"
							>
								Continue Offline
							</Button>
						</div>
					)}

					<p className="mt-8 text-xs text-muted-foreground/70 text-center max-w-xs">
						By signing in, you agree to our{" "}
						<a
							href={COMPANY.TERMS_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-muted-foreground transition-colors"
						>
							Terms of Service
						</a>{" "}
						and{" "}
						<a
							href={COMPANY.PRIVACY_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-muted-foreground transition-colors"
						>
							Privacy Policy
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
