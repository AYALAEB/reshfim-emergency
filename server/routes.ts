import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertContactSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ---- EVENTS ----
  app.get("/api/events", async (req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.status(404).json({ message: "אירוע לא נמצא" });
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
    if (!event) return res.status(404).json({ message: "אירוע לא נמצא" });
    res.json(event);
  });

  app.delete("/api/events/:id", async (req, res) => {
    await storage.deleteEvent(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- CONTACTS ----
  app.get("/api/contacts", async (req, res) => {
    const contacts = await storage.getContacts();
    res.json(contacts);
  });

  app.get("/api/contacts/:id", async (req, res) => {
    const contact = await storage.getContact(Number(req.params.id));
    if (!contact) return res.status(404).json({ message: "איש קשר לא נמצא" });
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
    if (!contact) return res.status(404).json({ message: "איש קשר לא נמצא" });
    res.json(contact);
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    await storage.deleteContact(Number(req.params.id));
    res.json({ ok: true });
  });

  // ---- REPORTS ----
  app.get("/api/events/:eventId/reports", async (req, res) => {
    const reports = await storage.getReportsByEvent(Number(req.params.eventId));
    res.json(reports);
  });

  app.post("/api/reports", async (req, res) => {
    const parsed = insertReportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const report = await storage.createReport(parsed.data);
    res.status(201).json(report);
  });

  // Check if contact already reported for an event
  app.get("/api/events/:eventId/reports/contact/:contactId", async (req, res) => {
    const report = await storage.getReportByEventAndContact(
      Number(req.params.eventId),
      Number(req.params.contactId)
    );
    res.json(report || null);
  });

  return httpServer;
}
