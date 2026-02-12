import { expo } from "@better-auth/expo";
import { oauthProvider } from "@better-auth/oauth-provider";
import { db } from "@superset/db/client";
import * as authSchema from "@superset/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, bearer, customSession } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { env } from "./env";

export const auth = betterAuth({
	baseURL: env.NEXT_PUBLIC_API_URL,
	secret: env.BETTER_AUTH_SECRET,
	disabledPaths: ["/token"],
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
		schema: authSchema,
	}),
	trustedOrigins: [
		env.NEXT_PUBLIC_WEB_URL,
		env.NEXT_PUBLIC_API_URL,
		env.NEXT_PUBLIC_MARKETING_URL,
		env.NEXT_PUBLIC_ADMIN_URL,
		...(env.NEXT_PUBLIC_DESKTOP_URL ? [env.NEXT_PUBLIC_DESKTOP_URL] : []),
		"superset://app",
		"superset://",
		...(process.env.NODE_ENV === "development"
			? ["exp://", "exp://**", "exp://192.168.*.*:*/**"]
			: []),
	],
	session: {
		expiresIn: 60 * 60 * 24 * 30,
		updateAge: 60 * 60 * 24,
		storeSessionInDatabase: true,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
			domain: env.NEXT_PUBLIC_COOKIE_DOMAIN,
		},
		database: {
			generateId: false,
		},
	},
	socialProviders: {
		github: {
			clientId: env.GH_CLIENT_ID,
			clientSecret: env.GH_CLIENT_SECRET,
		},
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	plugins: [
		apiKey({
			enableMetadata: true,
			enableSessionForAPIKeys: true,
			defaultPrefix: "sk_live_",
		}),
		jwt({
			jwks: {
				keyPairConfig: { alg: "RS256" },
			},
			jwt: {
				issuer: env.NEXT_PUBLIC_API_URL,
				audience: env.NEXT_PUBLIC_API_URL,
				expirationTime: "1h",
			},
		}),
		oauthProvider({
			loginPage: `${env.NEXT_PUBLIC_WEB_URL}/sign-in`,
			consentPage: `${env.NEXT_PUBLIC_WEB_URL}/oauth/consent`,
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
			validAudiences: [env.NEXT_PUBLIC_API_URL, `${env.NEXT_PUBLIC_API_URL}/`],
			silenceWarnings: {
				oauthAuthServerConfig: true,
				openidConfig: true,
			},
		}),
		expo(),
		bearer(),
		customSession(async ({ user, session }) => {
			return {
				user,
				session,
			};
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
