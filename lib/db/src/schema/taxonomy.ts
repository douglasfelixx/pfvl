import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  check,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const taxonomyTable = pgTable(
  "pfvl_taxonomy",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 16 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "pfvl_taxonomy_type_check",
      sql`${table.type} IN ('category', 'tag')`,
    ),
    uniqueIndex("pfvl_taxonomy_type_name_idx").on(
      table.type,
      sql`lower(${table.name})`,
    ),
  ],
);

export const insertTaxonomySchema = createInsertSchema(taxonomyTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTaxonomy = z.infer<typeof insertTaxonomySchema>;
export type Taxonomy = typeof taxonomyTable.$inferSelect;
