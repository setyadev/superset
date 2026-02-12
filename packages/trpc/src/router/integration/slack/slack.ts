import { db } from "@superset/db/client";
import { integrationConnections } from "@superset/db/schema";
import type { TRPCRouterRecord } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../../trpc";

export const slackRouter = {
	getConnection: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const connection = await db.query.integrationConnections.findFirst({
			where: and(
				eq(integrationConnections.userId, userId),
				eq(integrationConnections.provider, "slack"),
			),
			columns: {
				id: true,
				createdAt: true,
			},
		});

		if (!connection) return null;

		return {
			id: connection.id,
			connectedAt: connection.createdAt,
		};
	}),

	disconnect: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		const result = await db
			.delete(integrationConnections)
			.where(
				and(
					eq(integrationConnections.userId, userId),
					eq(integrationConnections.provider, "slack"),
				),
			)
			.returning({ id: integrationConnections.id });

		if (result.length === 0) {
			return { success: false, error: "No connection found" };
		}

		return { success: true };
	}),
} satisfies TRPCRouterRecord;
