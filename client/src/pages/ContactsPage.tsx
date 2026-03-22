import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "./Layout";
import * as XLSX from "xlsx";
import type { Contact } from "@shared/schema";

export default function ContactsPage() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState("");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const addContact = useMutation({
    mutationFn: () => apiRequest("POST", "/api/contacts", { name, phone }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setName(""); setPhone(""); setShowForm(false);
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contacts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/contacts"] }),
  });

  const bulkImport = useMutation({
    mutationFn: (items: { name: string; phone: string }[]) =>
      apiRequest("POST", "/api/contacts/bulk", { items }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setImportResult(`✅ יובאו ${data.added} אנשי קשר`);
      setImportText("");
    },
  });

  // Parse lines of text into name+phone pairs
  const parseLines = (text: string) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    const items: { name: string; phone: string }[] = [];
    let skipped = 0;
    for (const line of lines) {
      const parts = line.split(/\t|,|  +/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) { skipped++; continue; }
      items.push({ name: parts[0], phone: parts[1] });
    }
    return { items, skipped };
  };

  const handleTextImport = () => {
    const { items, skipped } = parseLines(importText);
    if (items.length === 0) { setImportResult("לא נמצאו נתונים תקינים"); return; }
    if (skipped) setImportResult(`דולגו ${skipped} שורות לא תקינות`);
    bulkImport.mutate(items);
  };

  // Handle Excel / CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult("קורא קובץ...");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        if (!data) { setImportResult("שגיאה בקריאת הקובץ"); return; }

        // Use SheetJS to read xlsx, xls, csv — all formats
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (!rows.length) { setImportResult("הקובץ ריק"); return; }

        // Auto-detect header row — skip if first row contains text labels
        const firstRow = rows[0].map((c: any) => String(c).toLowerCase());
        const isHeader = firstRow.some(c =>
          c.includes("שם") || c.includes("name") || c.includes("טלפון") || c.includes("phone")
        );
        const startIdx = isHeader ? 1 : 0;

        // Auto-detect which columns are name and phone
        // Strategy: find column with numbers (phone) and column with text (name)
        let nameCol = 0, phoneCol = 1;
        if (isHeader) {
          firstRow.forEach((cell: string, i: number) => {
            if (cell.includes("שם") || cell.includes("name")) nameCol = i;
            if (cell.includes("טלפון") || cell.includes("phone") || cell.includes("mobile")) phoneCol = i;
          });
        }

        const items: { name: string; phone: string }[] = [];
        let skipped = 0;

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          const name  = String(row[nameCol]  ?? "").trim();
          const phone = String(row[phoneCol] ?? "").trim();
          if (!name || !phone || phone === "0") { skipped++; continue; }
          items.push({ name, phone });
        }

        if (items.length === 0) {
          setImportResult("לא נמצאו נתונים. ודא/י שיש עמודת שם ועמודת טלפון.");
          return;
        }

        bulkImport.mutate(items);
        if (skipped) setImportResult(`מייבא... (${skipped} שורות ריקות דולגו)`);

      } catch (err) {
        setImportResult("שגיאה בקריאת הקובץ — נסה/י שוב");
      }
    };

    reader.onerror = () => setImportResult("שגיאה בקריאת הקובץ");
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <Layout subtitle="ניהול אנשי קשר">
      {/* Add / Import controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="font-bold text-red-600 text-base border-b-2 border-red-100 pb-2 mb-3">👥 אנשי קשר</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            data-testid="btn-add-contact"
            onClick={() => { setShowForm(!showForm); setShowImport(false); }}
            className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition"
          >
            + הוסף איש קשר
          </button>
          <button
            data-testid="btn-import"
            onClick={() => { setShowImport(!showImport); setShowForm(false); setImportResult(""); }}
            className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            📥 ייבוא
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">שם מלא</label>
              <input
                data-testid="input-contact-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ישראל ישראלי"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">טלפון</label>
              <input
                data-testid="input-contact-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05X-XXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2">
              <button
                data-testid="btn-save-contact"
                onClick={() => addContact.mutate()}
                disabled={!name.trim() || !phone.trim() || addContact.isPending}
                className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {addContact.isPending ? "שומר..." : "הוסף"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 bg-gray-200 rounded-lg text-sm font-medium">ביטול</button>
            </div>
          </div>
        )}

        {/* Import panel */}
        {showImport && (
          <div className="mt-4 space-y-3">
            {/* File upload */}
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 text-center bg-blue-50">
              <p className="text-sm font-semibold text-blue-700 mb-1">📂 העלאת קובץ Excel / CSV</p>
              <p className="text-xs text-gray-500 mb-3">
                קובץ CSV שיוצא מ-Excel עם עמודות: שם | טלפון
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
              >
                בחר קובץ
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-gray-400 mt-2">
                תומך ב: Excel (xlsx/xls), CSV — ללא צורך בשינויים
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <div className="flex-1 h-px bg-gray-200" />
              או הדבק טקסט ישירות
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Text paste */}
            <div>
              <p className="text-xs text-gray-500 mb-1">הדבק מ-Excel: שם [Tab] טלפון, שורה לכל איש קשר</p>
              <textarea
                data-testid="textarea-import"
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={4}
                placeholder={"ישראל ישראלי\t050-1234567\nשרה כהן\t052-9876543"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                dir="auto"
              />
              <div className="flex gap-2 mt-2">
                <button
                  data-testid="btn-do-import"
                  onClick={handleTextImport}
                  disabled={!importText.trim() || bulkImport.isPending}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {bulkImport.isPending ? "מייבא..." : "ייבא טקסט"}
                </button>
                <button onClick={() => setShowImport(false)} className="px-4 bg-gray-200 rounded-lg text-sm font-medium">ביטול</button>
              </div>
            </div>

            {importResult && (
              <p className={`text-sm font-medium ${importResult.startsWith("✅") ? "text-green-700" : "text-red-600"}`}>
                {importResult}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Search + list */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <input
          data-testid="input-search"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 חיפוש..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-red-400"
        />
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">
            {contacts.length === 0 ? "אין אנשי קשר עדיין" : "לא נמצא"}
          </p>
        ) : (
          <div>
            {filtered.map(c => (
              <div key={c.id} data-testid={`contact-row-${c.id}`}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-gray-400" dir="ltr">{c.phone}</div>
                </div>
                <button
                  data-testid={`btn-delete-${c.id}`}
                  onClick={() => { if (confirm("למחוק?")) deleteContact.mutate(c.id); }}
                  className="text-gray-300 hover:text-red-500 text-xl transition"
                >
                  🗑️
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center mt-3">סה"כ: {contacts.length} אנשי קשר</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
