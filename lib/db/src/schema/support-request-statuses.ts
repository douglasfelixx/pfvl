import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const supportRequestStatusesTable = pgTable(
  "pfvl_support_request_statuses",
  {
    id: serial("id").primaryKey(),
    requestType: varchar("request_type", { length: 24 }).notNull(),
    key: varchar("key", { length: 40 }).notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    labelEn: varchar("label_en", { length: 80 }).notNull(),
    active: boolean("active").notNull().default(true),
    isInitial: boolean("is_initial").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "pfvl_support_request_statuses_type_check",
      sql`${table.requestType} IN ('support', 'suggestion')`,
    ),
    check(
      "pfvl_support_request_statuses_key_check",
      sql`${table.key} ~ '^[a-z0-9_-]+$'`,
    ),
    check(
      "pfvl_support_request_statuses_sort_order_check",
      sql`${table.sortOrder} >= 0`,
    ),
    uniqueIndex("pfvl_support_request_statuses_type_key_idx").on(
      table.requestType,
      table.key,
    ),
    uniqueIndex("pfvl_support_request_statuses_type_label_idx").on(
      table.requestType,
      sql`lower(${table.label})`,
    ),
    uniqueIndex("pfvl_support_request_statuses_initial_idx")
      .on(table.requestType)
      .where(sql`${table.isInitial}`),
    index("pfvl_support_request_statuses_flow_order_idx").on(
      table.requestType,
      table.sortOrder,
      table.id,
    ),
  ],
);

export type SupportRequestStatusEntry =
  typeof supportRequestStatusesTable.$inferSelect;
