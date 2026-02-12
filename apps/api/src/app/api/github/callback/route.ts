import { db } from "@superset/db/client";
import { githubInstallations } from "@superset/db/schema";
import { Client } from "@upstash/qstash";

import { env } from "@/env";
import { verifySignedState } from "@/lib/oauth-state";
import { githubApp } from "../octokit";

const qstash = new Client({ token: env.QSTASH_TOKEN });

/**
 * Callback handler for GitHub App installation.
 * GitHub redirects here after the user installs/configures the app.
 */
export async function GET(request: Request) {
	const url = new URL(request.url);
	const installationId = url.searchParams.get("installation_id");
	const setupAction = url.searchParams.get("setup_action");
	const state = url.searchParams.get("state");

	if (setupAction === "cancel") {
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/github?error=installation_cancelled`,
		);
	}

	if (!installationId || !state) {
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/github?error=missing_params`,
		);
	}

	// Verify signed state (prevents forgery)
	const stateData = verifySignedState(state);
	if (!stateData) {
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/github?error=invalid_state`,
		);
	}

	const { userId } = stateData;

	try {
		const octokit = await githubApp.getInstallationOctokit(
			Number(installationId),
		);
		const { data: installation } = await octokit.rest.apps.getInstallation({
			installation_id: Number(installationId),
		});
		const account = installation.account;
		const accountLogin = account
			? "login" in account
				? account.login
				: (account.slug ?? account.name ?? "unknown")
			: "unknown";
		const accountType = account
			? "type" in account
				? account.type
				: "Organization"
			: "Organization";

		// Store installation in database
		await db
			.insert(githubInstallations)
			.values({
				userId,
				installationId: installationId,
				accountLogin,
				accountType,
				permissions: installation.permissions as Record<string, string>,
			})
			.onConflictDoUpdate({
				target: githubInstallations.installationId,
				set: {
					accountLogin,
					accountType,
					permissions: installation.permissions as Record<string, string>,
					suspended: false,
					updatedAt: new Date(),
				},
			});

		// Trigger initial sync
		const syncUrl = `${env.NEXT_PUBLIC_API_URL}/api/github/jobs/initial-sync`;
		const syncBody = { userId };

		if (env.NODE_ENV === "development") {
			fetch(syncUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(syncBody),
			}).catch((error) => {
				console.error("[github/callback] Dev sync failed:", error);
			});
		} else {
			await qstash.publishJSON({
				url: syncUrl,
				body: syncBody,
				retries: 3,
			});
		}

		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/github?success=true`,
		);
	} catch (error) {
		console.error("[github/callback] Error:", error);
		return Response.redirect(
			`${env.NEXT_PUBLIC_WEB_URL}/integrations/github?error=installation_failed`,
		);
	}
}
