import { auth } from "@superset/auth/server";
import { registerTools } from "@superset/mcp";
import type { McpContext } from "@superset/mcp/auth";
import { verifyAccessToken } from "better-auth/oauth2";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { env } from "@/env";

async function verifyToken(req: Request, bearerToken?: string) {
	// 1. Try session auth (for desktop/web app)
	const session = await auth.api.getSession({ headers: req.headers });
	if (session?.session) {
		const extendedSession = session.session as {
			userId?: string;
		};
		if (!extendedSession.userId) {
			console.error("[mcp/auth] Session missing userId");
			return undefined;
		}
		return {
			token: "session",
			clientId: "session",
			scopes: ["mcp:full"],
			extra: {
				mcpContext: {
					userId: extendedSession.userId,
				} satisfies McpContext,
			},
		};
	}

	// 2. Try API key verification (for sk_live_ tokens)
	if (bearerToken) {
		try {
			const result = await auth.api.verifyApiKey({
				body: { key: bearerToken },
			});
			if (result.valid && result.key) {
				const userId = result.key.userId;
				if (!userId) {
					console.error("[mcp/auth] API key missing userId");
					return undefined;
				}
				return {
					token: "api-key",
					clientId: "api-key",
					scopes: ["mcp:full"],
					extra: {
						mcpContext: {
							userId,
						} satisfies McpContext,
					},
				};
			}
		} catch (error) {
			console.error("[mcp/auth] API key verification failed:", error);
		}
	}

	// 3. Try OAuth access token verification via JWKS
	if (bearerToken) {
		try {
			const payload = await verifyAccessToken(bearerToken, {
				jwksUrl: `${env.NEXT_PUBLIC_API_URL}/api/auth/jwks`,
				verifyOptions: {
					issuer: env.NEXT_PUBLIC_API_URL,
					audience: [env.NEXT_PUBLIC_API_URL, `${env.NEXT_PUBLIC_API_URL}/`],
				},
			});
			if (!payload?.sub || !payload.userId) {
				console.error("[mcp/auth] Access token missing sub or userId claim");
				return undefined;
			}

			const scopes = Array.isArray(payload.scope)
				? (payload.scope as string[])
				: typeof payload.scope === "string"
					? payload.scope.split(" ")
					: [];

			return {
				token: bearerToken,
				clientId: (payload.azp as string) ?? "mcp-client",
				scopes,
				extra: {
					mcpContext: {
						userId: payload.userId as string,
					} satisfies McpContext,
				},
			};
		} catch (error) {
			console.error("[mcp/auth] Access token verification failed:", error);
			return undefined;
		}
	}

	return undefined;
}

const baseHandler = createMcpHandler(
	(server) => registerTools(server),
	{ capabilities: { tools: {} } },
	{
		redisUrl: env.KV_URL,
		basePath: "/api/agent",
		verboseLogs: env.NODE_ENV === "development",
		maxDuration: 60,
	},
);

const handler = withMcpAuth(baseHandler, verifyToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
