import {
	agentCommands,
	apikeys,
	devicePresence,
	integrationConnections,
	repositories,
	taskStatuses,
	tasks,
	users,
} from "@superset/db/schema";
import { eq, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { QueryBuilder } from "drizzle-orm/pg-core";

export type AllowedTable =
	| "tasks"
	| "task_statuses"
	| "repositories"
	| "auth.users"
	| "auth.apikeys"
	| "device_presence"
	| "agent_commands"
	| "integration_connections";

interface WhereClause {
	fragment: string;
	params: unknown[];
}

function build(table: PgTable, column: PgColumn, id: string): WhereClause {
	const whereExpr = eq(sql`${sql.identifier(column.name)}`, id);
	const qb = new QueryBuilder();
	const { sql: query, params } = qb
		.select()
		.from(table)
		.where(whereExpr)
		.toSQL();
	const fragment = query.replace(/^select .* from .* where\s+/i, "");
	return { fragment, params };
}

export async function buildWhereClause(
	tableName: string,
	userId: string,
): Promise<WhereClause | null> {
	switch (tableName) {
		case "tasks":
			return build(tasks, tasks.userId, userId);

		case "task_statuses":
			return build(taskStatuses, taskStatuses.userId, userId);

		case "repositories":
			return build(repositories, repositories.userId, userId);

		case "auth.users":
			return build(users, users.id, userId);

		case "device_presence":
			return build(devicePresence, devicePresence.userId, userId);

		case "agent_commands":
			return build(agentCommands, agentCommands.userId, userId);

		case "auth.apikeys":
			return build(apikeys, apikeys.userId, userId);

		case "integration_connections":
			return build(
				integrationConnections,
				integrationConnections.userId,
				userId,
			);

		default:
			return null;
	}
}
