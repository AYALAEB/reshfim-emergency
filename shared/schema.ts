import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Contacts (kibbutz members)
export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  phoneNormalized: text("phone_normalized").notNull().default(""),
});

export const insertContactSchema = createInsertSchema(contacts);
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// Events (emergency incidents)
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertEventSchema = createInsertSchema(events);
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Reports (individual status reports)
export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: text("event_id").notNull(),
  contactId: text("contact_id").notNull(),
  status: text("status").notNull(), // 'in' | 'out' | 'help'
  details: text("details").default(""),
  reportedAt: text("reported_at").notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
