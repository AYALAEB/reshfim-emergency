import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertContactSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ─── Events ────────────────────────────────────────────────
  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  app.post("/api/events", async (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const event = await storage.createEvent(parsed.data);
    res.status(201).json(event);
  });

  app.patch("/api/events/:id", async (req, res) => {
    const event = await storage.updateEvent(Number(req.params.id), req.body);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  app.delete("/api/events/:id", async (req, res) => {
    await storage.deleteEvent(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Contacts ──────────────────────────────────────────────
  app.get("/api/contacts", async (_req, res) => {
    const contacts = await storage.getContacts();
    res.json(contacts);
  });

  app.get("/api/contacts/:id", async (req, res) => {
    const contact = await storage.getContact(Number(req.params.id));
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  });

  app.post("/api/contacts", async (req, res) => {
    const parsed = insertContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const contact = await storage.createContact(parsed.data);
    res.status(201).json(contact);
  });

  app.post("/api/contacts/bulk", async (req, res) => {
    const schema = z.array(insertContactSchema);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const contacts = await storage.bulkCreateContacts(parsed.data);
    res.status(201).json(contacts);
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    const contact = await storage.updateContact(Number(req.params.id), req.body);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    await storage.deleteContact(Number(req.params.id));
    res.status(204).send();
  });

  // ─── Reports ───────────────────────────────────────────────
  app.get("/api/events/:eventId/reports", async (req, res) => {
    const reports = await storage.getReports(Number(req.params.eventId));
    res.json(reports);
  });

  app.post("/api/reports", async (req, res) => {
    const parsed = insertReportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    // If contactId provided, check for existing report and update
    if (parsed.data.contactId) {
      const existing = await storage.getReportByEventAndContact(
        parsed.data.eventId,
        parsed.data.contactId
      );
      if (existing) {
        // Update existing
        const updated = await storage.createReport(parsed.data); // just create new entry
        return res.status(201).json(updated);
      }
    }
    const report = await storage.createReport(parsed.data);
    res.status(201).json(report);
  });

  // Get contact info for report form pre-fill
  app.get("/api/report-info/:eventId/:contactId", async (req, res) => {
    const event = await storage.getEvent(Number(req.params.eventId));
    const contact = await storage.getContact(Number(req.params.contactId));
    if (!event || !contact) return res.status(404).json({ message: "Not found" });
    res.json({ event, contact });
  });

  return httpServer;
}
