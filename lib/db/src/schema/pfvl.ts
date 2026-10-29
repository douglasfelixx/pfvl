import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("pfvl_users", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 24 }).notNull().default("member"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  preferredLanguage: varchar("preferred_language", { length: 5 })
    .notNull()
    .default("pt-BR"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pollsTable = pgTable(
  "pfvl_polls",
  {
    id: serial("id").primaryKey(),
    question: varchar("question", { length: 220 }).notNull(),
    details: text("details").notNull().default(""),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    createdBy: integer("created_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "pfvl_polls_status_check",
      sql`${table.status} IN ('active', 'closed')`,
    ),
    uniqueIndex("pfvl_polls_single_active_idx")
      .on(table.status)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const pollVotesTable = pgTable(
  "pfvl_poll_votes",
  {
    id: serial("id").primaryKey(),
    pollId: integer("poll_id")
      .notNull()
      .references(() => pollsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vote: varchar("vote", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "pfvl_poll_votes_vote_check",
      sql`${table.vote} IN ('like', 'dislike')`,
    ),
    uniqueIndex("pfvl_poll_votes_user_poll_idx").on(
      table.pollId,
      table.userId,
    ),
  ],
);

export const postsTable = pgTable("pfvl_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull(),
  kind: varchar("kind", { length: 24 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  tags: text("tags").array().notNull().default([]),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorUserId: integer("author_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  coverImageUrl: text("cover_image_url"),
  videoUrl: text("video_url"),
  status: varchar("status", { length: 24 }).notNull().default("published"),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commentsTable = pgTable("pfvl_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  parentCommentId: integer("parent_comment_id"),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorUserId: integer("author_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("published"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const suggestionsTable = pgTable("pfvl_suggestions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  details: text("details").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("under_review"),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  authorUserId: integer("author_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
