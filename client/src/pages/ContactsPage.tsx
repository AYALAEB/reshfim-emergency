import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "./Layout";
import type { Contact } from "@shared/schema";

export default function ContactsPage() {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState("");
  const [search, setSearch] = useState("");

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

  const handleImport = () => {
    const lines = importText.trim().split("\n").filter(l => l.trim());
    const items: { name: string; phone: string }[] = [];
    let skipped = 0;
    for (const line of lines) {
      const parts = line.split(/\t|,|  +/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) { skipped++; continue; }
      items.push({ name: parts[0], phone: parts[1] });
    }
    if (items.length === 0) { setImportResult("לא נמצאו נתונים"); return; }
    bulkImport.mutate(items);
    if (skipped) setImportResult(`דולגו ${skipped} שורות לא תקינות`);
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
            onClick={() => { setShowImport(!showImport); setShowForm(false); }}
            className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            📥 ייבוא מ-Excel
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
              <button
                onClick={() => setShowForm(false)}
                className="px-4 bg-gray-200 rounded-lg text-sm font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Import form */}
        {showImport && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500">הדבק מ-Excel: עמודה שם | עמודה טלפון (הפרדה בטאב, פסיק, או 2+ רווחים)</p>
            <textarea
              data-testid="textarea-import"
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={5}
              placeholder={"ישראל ישראלי\t050-1234567\nשרה כהן\t052-9876543"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
              dir="auto"
            />
            <div className="flex gap-2">
              <button
                data-testid="btn-do-import"
                onClick={handleImport}
                disabled={!importText.trim() || bulkImport.isPending}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {bulkImport.isPending ? "מייבא..." : "ייבא"}
              </button>
              <button onClick={() => setShowImport(false)} className="px-4 bg-gray-200 rounded-lg text-sm font-medium">ביטול</button>
            </div>
            {importResult && <p className="text-sm text-green-700">{importResult}</p>}
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
