import { relations } from "drizzle-orm/relations";
import { template, templateShare, user, account, session, sow } from "./schema";

export const templateShareRelations = relations(templateShare, ({one}) => ({
	template: one(template, {
		fields: [templateShare.templateId],
		references: [template.id]
	}),
	user: one(user, {
		fields: [templateShare.sharedWithUserId],
		references: [user.id]
	}),
}));

export const templateRelations = relations(template, ({one, many}) => ({
	templateShares: many(templateShare),
	user: one(user, {
		fields: [template.ownerId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	templateShares: many(templateShare),
	accounts: many(account),
	sessions: many(session),
	sows: many(sow),
	templates: many(template),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const sowRelations = relations(sow, ({one}) => ({
	user: one(user, {
		fields: [sow.ownerId],
		references: [user.id]
	}),
}));