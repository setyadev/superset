import { db } from "@superset/db/client";
import { integrationConnections } from "@superset/db/schema";
import type { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../../trpc";
import { githubRouter } from "./github";
import { linearRouter } from "./linear";
import { slackRouter } from "./slack";

export const integrationRouter = {
	github: githubRouter,
	linear: linearRouter,
	slack: slackRouter,

	list: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		return db.query.integrationConnections.findMany({
			where: eq(integrationConnections.userId, userId),
			columns: {
				id: true,
				provider: true,
				config: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}),
} satisfies TRPCRouterRecord;
