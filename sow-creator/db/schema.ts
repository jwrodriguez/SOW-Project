/**
 * Database Schema: all tables in one place.
 *
 * Two groups:
 *   1. Auth tables (user, session, account, verification), required by Better Auth.
 *   2. App tables (sow, template, template_share).
 *
 * All PKs use Postgres-native gen_random_uuid().
 */
import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// ─── Auth Tables (Better Auth) ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // Custom field. `input: false` in auth.ts prevents users from self-assigning roles.
  role: text("role").default("USER"),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

// Links users to auth providers (email/password, Microsoft SSO, etc.).
// One row per provider so a user can have multiple sign-in methods.
export const account = pgTable(
  "account",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ─── Auth Relations ─────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  sows: many(sows),
  templates: many(templates),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ─── Application Tables ────────────────────────────────────────────────────

// Full editor state (sections, blanks, cover page, etc.) stored as JSONB.
export const sows = pgTable("sow", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  status: text("status").notNull().default("DRAFT"),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reusable starting points for SOWs. `icon` and `color` reference
// the design token registry in lib/template-styles.ts.
export const templates = pgTable("template", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  content: jsonb("content").notNull(),
  tags: text("tags").array().notNull().default([]),
  icon: text("icon").notNull().default("file"),
  color: text("color").notNull().default("blue"),
  isShared: boolean("is_shared").notNull().default(false),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Per-user sharing. `isShared` on template = global visibility;
// rows here = explicit access for specific users.
export const templateShares = pgTable("template_share", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  sharedWithUserId: uuid("shared_with_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Application Relations ──────────────────────────────────────────────────

export const sowsRelations = relations(sows, ({ one }) => ({
  owner: one(user, {
    fields: [sows.ownerId],
    references: [user.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  owner: one(user, {
    fields: [templates.ownerId],
    references: [user.id],
  }),
  shares: many(templateShares),
}));

export const templateSharesRelations = relations(
  templateShares,
  ({ one }) => ({
    template: one(templates, {
      fields: [templateShares.templateId],
      references: [templates.id],
    }),
    sharedWithUser: one(user, {
      fields: [templateShares.sharedWithUserId],
      references: [user.id],
    }),
  }),
);

// Better Auth uses singular `user`, some of our code uses `users`.
export const users = user;
