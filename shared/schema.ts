import { z } from "zod";

// Contacts
export const insertContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
});
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = InsertContact & { id: number };

// Events
export const insertEventSchema = z.object({
  name: z.string().min(1),
  createdAt: z.string(),
  active: z.string().default("true"),
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = InsertEvent & { id: number };

// Reports
export const insertReportSchema = z.object({
  eventId: z.number(),
  contactId: z.number(),
  contactName: z.string(),
  contactPhone: z.string(),
  status: z.string(),
  details: z.string().nullable().optional(),
  reportedAt: z.string(),
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = InsertReport & { id: number; details: string | null };
