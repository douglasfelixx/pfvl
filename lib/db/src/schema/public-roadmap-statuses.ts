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

export const publicRoadmapStatusesTable = pgTable(
  "pfvl_public_roadmap_statuses",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 40 }).notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    labelEn: varchar("label_en", { length: 80 }).notNull(),
    active: boolean("active").notNull().default(true),
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
      "pfvl_public_roadmap_statuses_key_check",
      sql`${table.key} ~ '^[a-z0-9_-]+$'`,
    ),
    check(
      "pfvl_public_roadmap_statuses_sort_order_check",
      sql`${table.sortOrder} >= 0`,
    ),
    uniqueIndex("pfvl_public_roadmap_statuses_key_idx").on(table.key),
    uniqueIndex("pfvl_public_roadmap_statuses_label_idx").on(
      sql`lower(${table.label})`,
    ),
    index("pfvl_public_roadmap_statuses_order_idx").on(
      table.sortOrder,
      table.id,
    ),
  ],
);

export type PublicRoadmapStatusEntry =
  typeof publicRoadmapStatusesTable.$inferSelect;
