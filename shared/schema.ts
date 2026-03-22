import { z } from "zod";

// Contact
export const contactSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  phone: z.string().min(1),
});

export const insertContactSchema = contactSchema.omit({ id: true });

export type Contact = z.infer<typeof contactSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;

// Event
export const eventSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.string(),
});

export const insertEventSchema = eventSchema.omit({ id: true, createdAt: true });

export type Event = z.infer<typeof eventSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Report
export type ReportStatus = "in_kibbutz" | "outside_kibbutz" | "needs_help";

export const reportSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  contactId: z.string().optional(),
  name: z.string(),
  phone: z.string(),
  status: z.enum(["in_kibbutz", "outside_kibbutz", "needs_help"]),
  reportedAt: z.string(),
});

export const insertReportSchema = z.object({
  eventId: z.string(),
  contactId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  status: z.enum(["in_kibbutz", "outside_kibbutz", "needs_help"]),
});

export type Report = z.infer<typeof reportSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
