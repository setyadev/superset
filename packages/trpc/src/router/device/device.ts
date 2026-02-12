import { db } from "@superset/db/client";
import { devicePresence, deviceTypeValues } from "@superset/db/schema";
import type { TRPCRouterRecord } from "@trpc/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

const OFFLINE_THRESHOLD_MS = 60_000;

export const deviceRouter = {
	/**
	 * Register or update device presence (heartbeat)
	 * Called by desktop/mobile apps to indicate they're online
	 */
	heartbeat: protectedProcedure
		.input(
			z.object({
				deviceId: z.string().min(1),
				deviceName: z.string().min(1),
				deviceType: z.enum(deviceTypeValues),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const now = new Date();

			const [device] = await db
				.insert(devicePresence)
				.values({
					userId,
					deviceId: input.deviceId,
					deviceName: input.deviceName,
					deviceType: input.deviceType,
					lastSeenAt: now,
					createdAt: now,
				})
				.onConflictDoUpdate({
					target: [devicePresence.userId, devicePresence.deviceId],
					set: {
						deviceName: input.deviceName,
						deviceType: input.deviceType,
						lastSeenAt: now,
					},
				})
				.returning();

			return { device, timestamp: now };
		}),

	/**
	 * List online devices for the current user
	 */
	listOnlineDevices: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session.user.id;
		const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

		const devices = await db
			.select({
				id: devicePresence.id,
				deviceId: devicePresence.deviceId,
				deviceName: devicePresence.deviceName,
				deviceType: devicePresence.deviceType,
				lastSeenAt: devicePresence.lastSeenAt,
				createdAt: devicePresence.createdAt,
			})
			.from(devicePresence)
			.where(
				and(
					eq(devicePresence.userId, userId),
					gt(devicePresence.lastSeenAt, threshold),
				),
			);

		return devices;
	}),
} satisfies TRPCRouterRecord;
