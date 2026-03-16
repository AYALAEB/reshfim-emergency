import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertEventSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ---- CONTACTS ----
  app.get("/api/contacts", (req, res) => {
    res.json(storage.getContacts());
  });

  app.get("/api/contacts/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const contact = storage.getContact(id);
    if (!contact) return res.status(404).json({ error: "Not found" });
    res.json(contact);
  });

  app.post("/api/contacts", (req, res) => {
    const parsed = insertContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const contact = storage.addContact(parsed.data);
    res.json(contact);
  });

  app.put("/api/contacts/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertContactSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const updated = storage.updateContact(id, parsed.data);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/contacts/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const ok = storage.deleteContact(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  // Bulk import
  app.post("/api/contacts/bulk", (req, res) => {
    const schema = z.array(insertContactSchema);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const added = parsed.data.map(c => storage.addContact(c));
    res.json(added);
  });

  // Clear all contacts
  app.delete("/api/contacts", (req, res) => {
    storage.clearContacts();
    res.json({ success: true });
  });

  // ---- EVENTS ----
  app.get("/api/events", (req, res) => {
    res.json(storage.getEvents());
  });

  app.get("/api/events/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const event = storage.getEvent(id);
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json(event);
  });

  app.post("/api/events", (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const event = storage.createEvent(parsed.data);
    res.json(event);
  });

  app.delete("/api/events/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const ok = storage.deleteEvent(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  // ---- REPORTS ----
  app.get("/api/events/:id/reports", (req, res) => {
    const id = parseInt(req.params.id);
    const reports = storage.getReportsByEvent(id);
    res.json(reports);
  });

  app.post("/api/events/:id/reports", (req, res) => {
    const eventId = parseInt(req.params.id);
    const parsed = insertReportSchema.safeParse({ ...req.body, eventId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const report = storage.addReport(parsed.data);
    res.json(report);
  });

  return httpServer;
}
