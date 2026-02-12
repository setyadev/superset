import { relations } from "drizzle-orm";

import { accounts, sessions, users } from "./auth";
import {
	githubInstallations,
	githubPullRequests,
	githubRepositories,
} from "./github";
import {
	agentCommands,
	devicePresence,
	integrationConnections,
	repositories,
	subscriptions,
	taskStatuses,
	tasks,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	createdTasks: many(tasks, { relationName: "creator" }),
	assignedTasks: many(tasks, { relationName: "assignee" }),
	connectedIntegrations: many(integrationConnections),
	githubInstallations: many(githubInstallations),
	devicePresence: many(devicePresence),
	agentCommands: many(agentCommands),
	repositories: many(repositories),
	subscriptions: many(subscriptions),
	tasks: many(tasks),
	taskStatuses: many(taskStatuses),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id],
	}),
}));

export const repositoriesRelations = relations(
	repositories,
	({ one, many }) => ({
		user: one(users, {
			fields: [repositories.userId],
			references: [users.id],
		}),
		tasks: many(tasks),
	}),
);

export const tasksRelations = relations(tasks, ({ one }) => ({
	repository: one(repositories, {
		fields: [tasks.repositoryId],
		references: [repositories.id],
	}),
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id],
	}),
	status: one(taskStatuses, {
		fields: [tasks.statusId],
		references: [taskStatuses.id],
	}),
	assignee: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
		relationName: "assignee",
	}),
	creator: one(users, {
		fields: [tasks.creatorId],
		references: [users.id],
		relationName: "creator",
	}),
}));

export const taskStatusesRelations = relations(
	taskStatuses,
	({ one, many }) => ({
		user: one(users, {
			fields: [taskStatuses.userId],
			references: [users.id],
		}),
		tasks: many(tasks),
	}),
);

export const integrationConnectionsRelations = relations(
	integrationConnections,
	({ one }) => ({
		user: one(users, {
			fields: [integrationConnections.userId],
			references: [users.id],
		}),
	}),
);

// GitHub relations
export const githubInstallationsRelations = relations(
	githubInstallations,
	({ one, many }) => ({
		user: one(users, {
			fields: [githubInstallations.userId],
			references: [users.id],
		}),
		repositories: many(githubRepositories),
	}),
);

export const githubRepositoriesRelations = relations(
	githubRepositories,
	({ one, many }) => ({
		installation: one(githubInstallations, {
			fields: [githubRepositories.installationId],
			references: [githubInstallations.id],
		}),
		pullRequests: many(githubPullRequests),
	}),
);

export const githubPullRequestsRelations = relations(
	githubPullRequests,
	({ one }) => ({
		repository: one(githubRepositories, {
			fields: [githubPullRequests.repositoryId],
			references: [githubRepositories.id],
		}),
	}),
);

// Agent relations
export const devicePresenceRelations = relations(devicePresence, ({ one }) => ({
	user: one(users, {
		fields: [devicePresence.userId],
		references: [users.id],
	}),
}));

export const agentCommandsRelations = relations(agentCommands, ({ one }) => ({
	user: one(users, {
		fields: [agentCommands.userId],
		references: [users.id],
	}),
	parentCommand: one(agentCommands, {
		fields: [agentCommands.parentCommandId],
		references: [agentCommands.id],
		relationName: "parentCommand",
	}),
}));
