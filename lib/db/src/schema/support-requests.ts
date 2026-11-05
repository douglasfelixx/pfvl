import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./pfvl.js";

export const supportRequestSubjectsTable = pgTable(
  "pfvl_support_request_subjects",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    systemKey: varchar("system_key", { length: 40 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pfvl_support_request_subjects_name_idx").on(
      sql`lower(${table.name})`,
    ),
    uniqueIndex("pfvl_support_request_subjects_system_key_idx").on(
      table.systemKey,
    ),
  ],
);

export const supportRequestCategoriesTable = pgTable(
  "pfvl_support_request_categories",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => supportRequestSubjectsTable.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pfvl_support_request_categories_subject_name_idx").on(
      table.subjectId,
      sql`lower(${table.name})`,
    ),
    index("pfvl_support_request_categories_subject_active_idx").on(
      table.subjectId,
      table.active,
    ),
  ],
);

export const supportRequestSequencesTable = pgTable(
  "pfvl_support_request_sequences",
  {
    year: integer("year").primaryKey(),
    lastSequence: integer("last_sequence").notNull().default(0),
  },
  (table) => [
    check(
      "pfvl_support_request_sequences_year_check",
      sql`${table.year} BETWEEN 1000 AND 9999`,
    ),
    check(
      "pfvl_support_request_sequences_last_sequence_check",
      sql`${table.lastSequence} BETWEEN 0 AND 99999999`,
    ),
  ],
);

export const supportRequestsTable = pgTable(
  "pfvl_support_requests",
  {
    id: serial("id").primaryKey(),
    protocol: varchar("protocol", { length: 12 }).notNull().unique(),
    requestYear: integer("request_year").notNull(),
    requestSequence: integer("request_sequence").notNull(),
    requestType: varchar("request_type", { length: 24 }).notNull().default("support"),
    subjectId: integer("subject_id").references(
      () => supportRequestSubjectsTable.id,
      { onDelete: "set null" },
    ),
    subjectName: varchar("subject_name", { length: 120 }).notNull(),
    title: varchar("title", { length: 220 }),
    categoryId: integer("category_id").references(
      () => supportRequestCategoriesTable.id,
      { onDelete: "restrict" },
    ),
    categoryName: varchar("category_name", { length: 120 }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    requesterUserId: integer("requester_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    requesterName: varchar("requester_name", { length: 100 }).notNull(),
    requesterEmail: varchar("requester_email", { length: 320 }).notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "pfvl_support_requests_type_check",
      sql`${table.requestType} IN ('support', 'suggestion')`,
    ),
    check(
      "pfvl_support_requests_status_check",
      sql`${table.status} IN ('new', 'in_progress', 'completed')`,
    ),
    check(
      "pfvl_support_requests_sequence_check",
      sql`${table.requestSequence} BETWEEN 1 AND 99999999`,
    ),
    index("pfvl_support_requests_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    index("pfvl_support_requests_roadmap_approved_at_idx")
      .on(table.approvedAt, table.id)
      .where(sql`${table.requestType} = 'suggestion' AND ${table.approvedAt} IS NOT NULL`),
    index("pfvl_support_requests_requester_user_id_idx").on(
      table.requesterUserId,
    ),
  ],
);

export const supportRequestCommentsTable = pgTable(
  "pfvl_support_request_comments",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => supportRequestsTable.id, { onDelete: "restrict" }),
    authorUserId: integer("author_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    authorName: varchar("author_name", { length: 100 }).notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pfvl_support_request_comments_request_created_idx").on(
      table.requestId,
      table.createdAt,
    ),
  ],
);

export type SupportRequestSubject =
  typeof supportRequestSubjectsTable.$inferSelect;
export type SupportRequestCategory =
  typeof supportRequestCategoriesTable.$inferSelect;
export type SupportRequest = typeof supportRequestsTable.$inferSelect;
export type SupportRequestComment =
  typeof supportRequestCommentsTable.$inferSelect;
