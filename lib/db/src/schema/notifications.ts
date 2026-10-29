import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
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

export const notificationsTable = pgTable(
  "pfvl_notifications",
  {
    id: serial("id").primaryKey(),
    recipientUserId: integer("recipient_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    actorUserId: integer("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    eventKey: varchar("event_key", { length: 255 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    message: text("message").notNull(),
    href: varchar("href", { length: 500 }).notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "pfvl_notifications_type_check",
      sql`${table.type} IN ('new_update', 'new_publication', 'comment_reply', 'new_suggestion', 'suggestion_status')`,
    ),
    uniqueIndex("pfvl_notifications_recipient_event_key_idx").on(
      table.recipientUserId,
      table.eventKey,
    ),
    index("pfvl_notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
  ],
);

export const insertNotificationSchema = createInsertSchema(
  notificationsTable,
).omit({ id: true, createdAt: true, isRead: true });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
