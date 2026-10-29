import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { check, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const siteMediaTable = pgTable(
  "pfvl_site_media",
  {
    slot: varchar("slot", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 120 }),
    extension: varchar("extension", { length: 8 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "pfvl_site_media_slot_check",
      sql`${table.slot} IN ('home_image', 'presentation_video')`,
    ),
    check(
      "pfvl_site_media_name_check",
      sql`${table.name} IS NULL OR ${table.name} ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'`,
    ),
    check(
      "pfvl_site_media_extension_check",
      sql`(${table.slot} = 'home_image' AND ${table.extension} IN ('jpg', 'jpeg', 'png', 'webp')) OR (${table.slot} = 'presentation_video' AND ${table.extension} IN ('mp4', 'webm'))`,
    ),
  ],
);

export const insertSiteMediaSchema = createInsertSchema(siteMediaTable).omit({
  updatedAt: true,
});
export type InsertSiteMedia = z.infer<typeof insertSiteMediaSchema>;
export type SiteMediaAsset = typeof siteMediaTable.$inferSelect;
