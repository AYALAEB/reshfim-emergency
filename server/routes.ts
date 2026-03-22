import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertEventSchema, insertReportSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== CONTACTS =====

  app.get("/api/contacts", (_req, res) => {
    const contacts = storage.getContacts();
    res.json(contacts);
  });

  app.get("/api/contacts/:id", (req, res) => {
    const contact = storage.getContact(req.params.id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  });

  app.post("/api/contacts", (req, res) => {
    const parsed = insertContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const contact = storage.createContact(parsed.data);
    res.status(201).json(contact);
  });

  app.put("/api/contacts/:id", (req, res) => {
    const parsed = insertContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const contact = storage.updateContact(req.params.id, parsed.data);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  });

  app.delete("/api/contacts/:id", (req, res) => {
    const deleted = storage.deleteContact(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Contact not found" });
    res.status(204).send();
  });

  // Import contacts from file
  app.post("/api/contacts/import", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      const contacts: { name: string; phone: string }[] = [];

      for (const row of data) {
        let name = "";
        let phone = "";

        // Try various Hebrew/English column names
        const nameKeys = ["שם", "name", "Name", "שם מלא", "שם פרטי"];
        const phoneKeys = ["טלפון", "מספר טלפון", "phone", "Phone", "נייד", "מספר", "טל"];

        for (const key of nameKeys) {
          if (row[key]) { name = String(row[key]).trim(); break; }
        }
        for (const key of phoneKeys) {
          if (row[key]) { phone = String(row[key]).trim(); break; }
        }

        // If no named columns found, try first two columns
        if (!name || !phone) {
          const values = Object.values(row).map((v) => String(v).trim());
          if (values.length >= 2) {
            if (!name) name = values[0];
            if (!phone) phone = values[1];
          }
        }

        if (name && phone) {
          contacts.push({ name, phone: normalizePhone(phone) });
        }
      }

      res.json({ contacts });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to parse file: " + error.message });
    }
  });

  // Import from text paste
  app.post("/api/contacts/import-text", (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "No text provided" });

      const lines = text.split("\n").filter((l: string) => l.trim());
      const contacts: { name: string; phone: string }[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // Try comma-separated
        let parts: string[];
        if (trimmed.includes(",")) {
          parts = trimmed.split(",").map((p: string) => p.trim());
        } else if (trimmed.includes("\t")) {
          parts = trimmed.split("\t").map((p: string) => p.trim());
        } else {
          // Space-separated: find the phone number part
          parts = trimmed.split(/\s+/);
        }

        if (parts.length >= 2) {
          // Find which part looks like a phone number
          const phoneIndex = parts.findIndex((p) => /^[\d\-+()]{7,}$/.test(p.replace(/\s/g, "")));
          if (phoneIndex >= 0) {
            const phone = parts[phoneIndex];
            const nameParts = parts.filter((_, i) => i !== phoneIndex);
            contacts.push({
              name: nameParts.join(" "),
              phone: normalizePhone(phone),
            });
          } else {
            // Assume last part is phone
            const phone = parts[parts.length - 1];
            const name = parts.slice(0, -1).join(" ");
            contacts.push({ name, phone: normalizePhone(phone) });
          }
        }
      }

      res.json({ contacts });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to parse text: " + error.message });
    }
  });

  // Bulk create contacts
  app.post("/api/contacts/bulk", (req, res) => {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) return res.status(400).json({ message: "Invalid contacts array" });

    const created = contacts.map((c: { name: string; phone: string }) => {
      return storage.createContact({ name: c.name, phone: normalizePhone(c.phone) });
    });

    res.status(201).json(created);
  });

  // ===== EVENTS =====

  app.get("/api/events", (_req, res) => {
    const events = storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", (req, res) => {
    const event = storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  });

  app.post("/api/events", (req, res) => {
    const parsed = insertEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const event = storage.createEvent(parsed.data);
    res.status(201).json(event);
  });

  app.delete("/api/events/:id", (req, res) => {
    const deleted = storage.deleteEvent(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Event not found" });
    res.status(204).send();
  });

  // ===== REPORTS =====

  app.get("/api/events/:eventId/reports", (req, res) => {
    const reports = storage.getReportsByEvent(req.params.eventId);
    res.json(reports);
  });

  app.get("/api/events/:eventId/stats", (req, res) => {
    const reports = storage.getReportsByEvent(req.params.eventId);
    const contacts = storage.getContacts();

    const stats = {
      total: contacts.length,
      inKibbutz: reports.filter((r) => r.status === "in_kibbutz").length,
      outsideKibbutz: reports.filter((r) => r.status === "outside_kibbutz").length,
      needsHelp: reports.filter((r) => r.status === "needs_help").length,
      reported: reports.length,
      notReported: Math.max(0, contacts.length - reports.length),
    };

    res.json(stats);
  });

  app.post("/api/reports", (req, res) => {
    const parsed = insertReportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // Verify event exists
    const event = storage.getEvent(parsed.data.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const report = storage.createReport({
      ...parsed.data,
      phone: normalizePhone(parsed.data.phone),
    });
    res.status(201).json(report);
  });

  return httpServer;
}

function normalizePhone(phone: string): string {
  // Strip all non-digits
  let digits = phone.replace(/\D/g, "");

  // If starts with 0, replace with 972
  if (digits.startsWith("0")) {
    digits = "972" + digits.slice(1);
  }

  // If doesn't start with 972, add it
  if (!digits.startsWith("972")) {
    digits = "972" + digits;
  }

  return digits;
}
