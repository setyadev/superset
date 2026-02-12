import { z } from "zod";

import { protectedProcedure } from "../../trpc";

export const apiKeyRouter = {
	create: protectedProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.auth.api.createApiKey({
				headers: ctx.headers,
				body: {
					name: input.name,
				},
			});

			return { key: result.key };
		}),
};
