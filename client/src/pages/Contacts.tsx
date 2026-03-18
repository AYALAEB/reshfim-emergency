import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Plus, Trash2, Edit2, Users, Upload, X, Check } from "lucide-react";
import * as XLSX from "xlsx";

export default function Contacts() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importText, setImportText] = useState("");
  const [parsedContacts, setParsedContacts] = useState<{ name: string; phone: string }[]>([]);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      apiRequest("POST", "/api/contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setAddOpen(false);
      setName("");
      setPhone("");
      toast({ title: "איש קשר נוסף" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; phone: string } }) =>
      apiRequest("PATCH", `/api/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditContact(null);
      toast({ title: "פרטים עודכנו" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "איש קשר נמחק" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (contacts: { name: string; phone: string }[]) =>
      apiRequest("POST", "/api/contacts/bulk", contacts),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setImportOpen(false);
      setImportText("");
      setParsedContacts([]);
      toast({ title: `יובאו ${Array.isArray(data) ? data.length : 0} אנשי קשר` });
    },
  });

  // Parse pasted text or CSV
  const parseText = (text: string) => {
    const lines = text.split("\n").filter(l => l.trim());
    const parsed: { name: string; phone: string }[] = [];
    for (const line of lines) {
      // Try tab, comma, dash
      const parts = line.split(/\t|,|–|-/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // Detect which is phone (contains digits)
        const phoneIdx = parts.findIndex(p => /\d{7,}/.test(p));
        const nameIdx = phoneIdx === 0 ? 1 : 0;
        if (phoneIdx >= 0) {
          parsed.push({ name: parts[nameIdx], phone: parts[phoneIdx] });
        }
      } else if (parts.length === 1 && /\d{7,}/.test(parts[0])) {
        // phone only
        parsed.push({ name: parts[0], phone: parts[0] });
      }
    }
    setParsedContacts(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = ev.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const parsed: { name: string; phone: string }[] = [];
        for (const row of rows) {
          if (!row || row.length < 2) continue;
          const [a, b] = row.map(String);
          if (!a || !b) continue;
          // Skip header rows
          if (/שם|name/i.test(a) || /טל|phone/i.test(b)) continue;
          const phoneCandidate = /\d{7,}/.test(b) ? b : (/\d{7,}/.test(a) ? a : null);
          const nameCandidate = phoneCandidate === b ? a : b;
          if (phoneCandidate) {
            parsed.push({ name: nameCandidate.trim(), phone: phoneCandidate.trim() });
          }
        }
        setParsedContacts(parsed);
        if (parsed.length > 0) setImportOpen(true);
      } catch {
        toast({ title: "שגיאה בקריאת הקובץ", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setName(c.name);
    setPhone(c.phone);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 gap-1 px-2">
              <ArrowRight className="h-4 w-4" />
              חזרה
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">אנשי קשר</h1>
            <p className="text-primary-foreground/75 text-xs">{contacts.length} אנשי קשר ברשימה</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={() => { setName(""); setPhone(""); setAddOpen(true); }} data-testid="button-add-contact">
            <Plus className="h-4 w-4" />
            הוסף איש קשר
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} data-testid="button-import-excel">
            <Upload className="h-4 w-4" />
            ייבוא Excel
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
        </div>

        {/* Contacts list */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : contacts.length === 0 ? (
          <Card className="text-center py-10">
            <CardContent>
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-muted-foreground">אין אנשי קשר עדיין</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {contacts.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between px-4 py-3 gap-3 ${i < contacts.length - 1 ? "border-b border-border/50" : ""}`}
                  data-testid={`row-contact-${c.id}`}
                >
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)} data-testid={`button-edit-contact-${c.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(c.id)}
                      data-testid={`button-delete-contact-${c.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>הוספת איש קשר</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label>שם</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" className="mt-1" autoFocus data-testid="input-contact-name" />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-1234567" className="mt-1" data-testid="input-contact-phone" />
            </div>
            <Button
              className="w-full"
              onClick={() => addMutation.mutate({ name: name.trim(), phone: phone.trim() })}
              disabled={!name.trim() || !phone.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? "מוסיף..." : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editContact} onOpenChange={v => { if (!v) setEditContact(null); }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>עריכת איש קשר</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <Label>שם</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" data-testid="input-edit-name" />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" data-testid="input-edit-phone" />
            </div>
            <Button
              className="w-full"
              onClick={() => editContact && editMutation.mutate({ id: editContact.id, data: { name: name.trim(), phone: phone.trim() } })}
              disabled={!name.trim() || !phone.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import preview dialog */}
      <Dialog open={importOpen} onOpenChange={v => { setImportOpen(v); if (!v) { setParsedContacts([]); setImportText(""); } }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>ייבוא אנשי קשר</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            {parsedContacts.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">הדבק טקסט עם שם וטלפון בכל שורה (מופרד בטאב, פסיק או מקף):</p>
                <Textarea
                  value={importText}
                  onChange={e => { setImportText(e.target.value); parseText(e.target.value); }}
                  rows={6}
                  placeholder={"ישראל ישראלי\t050-1234567\nשרה כהן, 052-9876543"}
                  className="font-mono text-xs"
                  data-testid="textarea-import"
                />
              </>
            ) : (
              <>
                <p className="text-sm font-medium">נמצאו {parsedContacts.length} אנשי קשר:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                  {parsedContacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-0.5">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground text-xs">{c.phone}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setParsedContacts([])}>
                    <X className="h-3.5 w-3.5 ml-1" />
                    חזרה
                  </Button>
                  <Button
                    className="flex-1 gap-1"
                    onClick={() => bulkMutation.mutate(parsedContacts)}
                    disabled={bulkMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {bulkMutation.isPending ? "מייבא..." : `ייבא ${parsedContacts.length} אנשי קשר`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
