import { pgTable, text, integer, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
});

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  contactId: integer("contact_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull(), // "in_kibbutz" | "out_kibbutz" | "need_help"
  details: text("details"),
  reportedAt: text("reported_at").notNull(),
});

// Insert schemas
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true });

// Types
export type Event = typeof events.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
