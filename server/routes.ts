import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertEventSchema, insertReportSchema } from "@shared/schema";
import { nanoid } from "nanoid";

export function registerRoutes(httpServer: Server, app: Express) {

  // ---- CONTACTS ----
  app.get("/api/contacts", (_req, res) => {
    res.json(storage.getContacts());
  });

  app.post("/api/contacts", (req, res) => {
    const parsed = insertContactSchema.safeParse({ ...req.body, id: nanoid() });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const contact = storage.addContact(parsed.data);
    res.json(contact);
  });

  app.delete("/api/contacts/:id", (req, res) => {
    storage.deleteContact(req.params.id);
    res.json({ ok: true });
  });

  // Bulk import contacts
  app.post("/api/contacts/bulk", (req, res) => {
    const { items } = req.body as { items: { name: string; phone: string }[] };
    if (!Array.isArray(items)) return res.status(400).json({ error: "items must be array" });
    const added: any[] = [];
    for (const item of items) {
      try {
        const c = storage.addContact({ id: nanoid(), name: item.name, phone: item.phone });
        added.push(c);
      } catch {}
    }
    res.json({ added: added.length, contacts: added });
  });

  // ---- EVENTS ----
  app.get("/api/events", (_req, res) => {
    const evs = storage.getEvents().reverse(); // newest first
    res.json(evs);
  });

  app.post("/api/events", (req, res) => {
    const now = new Date().toLocaleString("he-IL");
    const parsed = insertEventSchema.safeParse({ ...req.body, id: nanoid(), createdAt: now });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const ev = storage.createEvent(parsed.data);
    res.json(ev);
  });

  app.get("/api/events/:id", (req, res) => {
    const ev = storage.getEvent(req.params.id);
    if (!ev) return res.status(404).json({ error: "not found" });
    res.json(ev);
  });

  // ---- REPORTS ----
  app.get("/api/events/:eventId/reports", (req, res) => {
    const reps = storage.getReports(req.params.eventId);
    res.json(reps);
  });

  app.post("/api/events/:eventId/report/:contactId", (req, res) => {
    const { eventId, contactId } = req.params;

    // already reported?
    const existing = storage.getReport(eventId, contactId);
    if (existing) return res.json({ alreadyReported: true, report: existing });

    const parsed = insertReportSchema.safeParse({
      eventId,
      contactId,
      status: req.body.status,
      details: req.body.details ?? "",
      reportedAt: new Date().toLocaleString("he-IL"),
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });

    const report = storage.submitReport(parsed.data);
    res.json({ alreadyReported: false, report });
  });

  // Contact info for report page (no auth needed — used by WA link recipients)
  app.get("/api/report-info/:eventId/:contactId", (req, res) => {
    const { eventId, contactId } = req.params;
    const ev = storage.getEvent(eventId);
    const c  = storage.getContact(contactId);
    if (!ev || !c) return res.status(404).json({ error: "not found" });
    const existing = storage.getReport(eventId, contactId);
    res.json({ event: ev, contact: c, alreadyReported: !!existing, report: existing ?? null });
  });

}
