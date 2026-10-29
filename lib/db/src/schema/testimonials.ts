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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./pfvl.js";

export const testimonialsTable = pgTable(
  "pfvl_testimonials",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    authorName: varchar("author_name", { length: 100 }).notNull(),
    rating: integer("rating").notNull().default(5),
    body: text("body").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "pfvl_testimonials_rating_check",
      sql`${table.rating} BETWEEN 1 AND 5`,
    ),
    check(
      "pfvl_testimonials_status_check",
      sql`${table.status} IN ('pending', 'approved', 'rejected')`,
    ),
    uniqueIndex("pfvl_testimonials_user_id_idx").on(table.userId),
  ],
);

export const insertTestimonialSchema = createInsertSchema(
  testimonialsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;
