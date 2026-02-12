import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { adminProcedure } from "../../trpc";

export interface FunnelStepData {
	name: string;
	count: number;
	conversionRate: number;
}

export interface LeaderboardEntry {
	userId: string;
	name: string;
	email: string;
	image: string | null;
	count: number;
}

// Analytics disabled - PostHog removed
export const analyticsRouter = {
	getActivationFunnel: adminProcedure
		.input(
			z
				.object({
					dateFrom: z.string().optional().default("-7d"),
				})
				.optional(),
		)
		.query(async () => {
			// PostHog analytics disabled
			return [] as FunnelStepData[];
		}),

	getMarketingFunnel: adminProcedure
		.input(
			z
				.object({
					dateFrom: z.string().optional().default("-7d"),
				})
				.optional(),
		)
		.query(async () => {
			// PostHog analytics disabled
			return [] as FunnelStepData[];
		}),

	getWAUTrend: adminProcedure
		.input(
			z
				.object({
					days: z.number().min(7).max(180).optional().default(30),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const days = input?.days ?? 30;
			// PostHog analytics disabled - return empty data
			const filledData: { date: string; count: number }[] = [];
			const now = new Date();
			for (let i = days - 1; i >= 0; i--) {
				const date = new Date(now);
				date.setDate(date.getDate() - i);
				const dateStr = date.toISOString().split("T")[0] as string;
				filledData.push({
					date: dateStr,
					count: 0,
				});
			}
			return filledData;
		}),

	getRetention: adminProcedure.query(async () => {
		// PostHog analytics disabled
		return [];
	}),

	getWorkspacesLeaderboard: adminProcedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).optional().default(10),
					weekOffset: z.number().min(-52).max(0).optional().default(0),
				})
				.optional(),
		)
		.query(async () => {
			// PostHog analytics disabled
			return [] as LeaderboardEntry[];
		}),

	getSignupsTrend: adminProcedure
		.input(
			z
				.object({
					days: z.number().min(7).max(180).optional().default(30),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const days = input?.days ?? 30;
			// PostHog analytics disabled - return empty data
			const filledData: { date: string; count: number }[] = [];
			const now = new Date();
			for (let i = days - 1; i >= 0; i--) {
				const date = new Date(now);
				date.setDate(date.getDate() - i);
				const dateStr = date.toISOString().split("T")[0] as string;
				filledData.push({
					date: dateStr,
					count: 0,
				});
			}
			return filledData;
		}),

	getTrafficSources: adminProcedure
		.input(
			z
				.object({
					days: z.number().min(7).max(180).optional().default(30),
				})
				.optional(),
		)
		.query(async () => {
			// PostHog analytics disabled
			return [] as { source: string; count: number }[];
		}),

	getRevenueTrend: adminProcedure
		.input(
			z
				.object({
					days: z.number().min(7).max(180).optional().default(30),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const days = input?.days ?? 30;
			const filledData: { date: string; revenue: number; mrr: number }[] = [];
			const now = new Date();

			for (let i = days - 1; i >= 0; i--) {
				const date = new Date(now);
				date.setDate(date.getDate() - i);
				const dateStr = date.toISOString().split("T")[0] as string;
				filledData.push({
					date: dateStr,
					revenue: 0,
					mrr: 0,
				});
			}

			return filledData;
		}),
} satisfies TRPCRouterRecord;
