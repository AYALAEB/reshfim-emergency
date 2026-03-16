import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@shared/schema";
import { ArrowRight, Plus, Trash2, Upload, Users, X, Edit2, Check } from "lucide-react";
import * as XLSX from "xlsx";

export default function ContactsPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [preview, setPreview] = useState<{ name: string; phone: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/contacts", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setName(""); setPhone("");
      toast({ title: "איש קשר נוסף" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contacts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/contacts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, phone }: { id: number; name: string; phone: string }) =>
      apiRequest("PUT", `/api/contacts/${id}`, { name, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditId(null);
      toast({ title: "פרטים עודכנו" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (items: { name: string; phone: string }[]) =>
      apiRequest("POST", "/api/contacts/bulk", items).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowPreview(false);
      setPreview([]);
      toast({ title: `יובאו ${Array.isArray(data) ? data.length : 0} אנשי קשר` });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/contacts"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "כל אנשי הקשר נמחקו" });
    },
  });

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) return;
    addMutation.mutate({ name: name.trim(), phone: phone.trim() });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        setPreview(rows);
        setShowPreview(true);
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsed = parseRows(rows);
        setPreview(parsed);
        setShowPreview(true);
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = "";
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return parseRows(lines.map(l => l.split(/[,\t]/)));
  };

  const parseRows = (rows: any[][]): { name: string; phone: string }[] => {
    const result: { name: string; phone: string }[] = [];
    for (const row of rows) {
      if (row.length < 2) continue;
      const a = String(row[0] || "").trim();
      const b = String(row[1] || "").trim();
      if (!a || !b) continue;
      // Skip header row
      if (a === "שם" || a === "name" || a.toLowerCase() === "name") continue;
      // Determine which is name and which is phone
      const aIsPhone = /\d{7,}/.test(a.replace(/\D/g, ""));
      const name = aIsPhone ? b : a;
      const phone = aIsPhone ? a : b;
      if (name && phone) result.push({ name, phone });
    }
    return result;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-red-600 gap-1 p-1">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Users className="w-5 h-5" />
          <h1 className="text-lg font-bold">אנשי קשר</h1>
          <span className="text-red-200 text-sm mr-auto">{contacts.length} אנשי קשר</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Add Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">הוספת איש קשר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="שם מלא"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="input-contact-name"
              />
              <Input
                placeholder="מספר טלפון"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                data-testid="input-contact-phone"
                className="ltr"
                dir="ltr"
              />
              <Button onClick={handleAdd} disabled={addMutation.isPending} className="bg-red-700 hover:bg-red-800 shrink-0" data-testid="btn-add-contact">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">ייבוא מקובץ</p>
                <p className="text-xs text-muted-foreground">Excel (.xlsx) או CSV — עמודות: שם, טלפון</p>
              </div>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1" data-testid="btn-import-file">
                  <Upload className="w-3.5 h-3.5" />
                  ייבוא קובץ
                </Button>
                {contacts.length > 0 && (
                  <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => clearAllMutation.mutate()} data-testid="btn-clear-all">
                    <Trash2 className="w-3.5 h-3.5" />
                    נקה הכל
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <Card className="border-blue-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">תצוגה מקדימה — {preview.length} אנשי קשר</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => { setShowPreview(false); setPreview([]); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                {preview.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm px-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground" dir="ltr">{c.phone}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => bulkMutation.mutate(preview)}
                disabled={bulkMutation.isPending}
                data-testid="btn-confirm-import"
              >
                {bulkMutation.isPending ? "מייבא..." : `ייבא ${preview.length} אנשי קשר`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>אין אנשי קשר עדיין</p>
          </div>
        ) : (
          <div className="space-y-1">
            {contacts.map(c => (
              <Card key={c.id}>
                <CardContent className="py-2.5 px-4">
                  {editId === c.id ? (
                    <div className="flex gap-2 items-center">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                      <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-8 text-sm ltr" dir="ltr" />
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-green-600" onClick={() => updateMutation.mutate({ id: c.id, name: editName, phone: editPhone })}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">{c.name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(c.id); setEditName(c.name); setEditPhone(c.phone); }} data-testid={`btn-edit-${c.id}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(c.id)} data-testid={`btn-delete-contact-${c.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">Created with Perplexity Computer</a>
      </footer>
    </div>
  );
}
