import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Upload, FileSpreadsheet, Search, Edit2, Check, X, Users } from "lucide-react";
import * as XLSX from "xlsx";
import type { Contact, InsertContact } from "@shared/schema";

export default function Contacts() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [importPreview, setImportPreview] = useState<InsertContact[]>([]);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const addContact = useMutation({
    mutationFn: (data: InsertContact) => apiRequest("POST", "/api/contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setNewName(""); setNewPhone(""); setAddDialogOpen(false);
      toast({ title: "איש קשר נוסף" });
    },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, name, phone }: { id: number; name: string; phone: string }) =>
      apiRequest("PATCH", `/api/contacts/${id}`, { name, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditingId(null);
      toast({ title: "איש קשר עודכן" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "איש קשר נמחק" });
    },
  });

  const bulkImport = useMutation({
    mutationFn: (contacts: InsertContact[]) => apiRequest("POST", "/api/contacts/bulk", contacts),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setImportPreview([]);
      setImportDialogOpen(false);
      toast({ title: `יובאו ${importPreview.length} אנשי קשר` });
    },
  });

  // Parse Excel file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const parsed: InsertContact[] = [];

        for (const row of rows) {
          if (!row || row.length < 1) continue;

          // Try to identify name and phone columns
          let name = "", phone = "";

          // Two-column format: [name, phone] or [phone, name]
          if (row.length >= 2) {
            const col0 = String(row[0] || "").trim();
            const col1 = String(row[1] || "").trim();
            const isPhone0 = /^[\d\s\-\+\(\)]{7,}$/.test(col0);
            const isPhone1 = /^[\d\s\-\+\(\)]{7,}$/.test(col1);

            if (!isPhone0 && isPhone1) {
              name = col0; phone = col1;
            } else if (isPhone0 && !isPhone1) {
              name = col1; phone = col0;
            } else {
              // Both or neither look like phone — first is name
              name = col0; phone = col1;
            }
          } else if (row.length === 1) {
            // Single column — try to split "Name - 05X"
            const raw = String(row[0] || "").trim();
            const match = raw.match(/^(.+?)\s*[\-–—,]\s*([\d\s\+]{7,})$/) ||
                          raw.match(/^([\d\s\+]{7,})\s*[\-–—,]\s*(.+)$/);
            if (match) {
              const isPhone = /^[\d\s\+]{7,}$/.test(match[1].trim());
              name = isPhone ? match[2].trim() : match[1].trim();
              phone = isPhone ? match[1].trim() : match[2].trim();
            } else {
              name = raw; phone = "";
            }
          }

          // Skip header rows
          if (
            name.toLowerCase().includes("שם") ||
            name.toLowerCase().includes("name") ||
            name.toLowerCase().includes("טלפון") ||
            phone.toLowerCase().includes("phone")
          ) continue;

          if (name.length > 1) {
            parsed.push({ name: name.trim(), phone: phone.trim() });
          }
        }

        setImportPreview(parsed);
        setImportDialogOpen(true);
      } catch (err) {
        toast({ title: "שגיאה בקריאת הקובץ", description: "ודא שהקובץ הוא Excel או CSV תקין", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = "";
  };

  const filtered = contacts.filter(c =>
    c.name.includes(searchTerm) || c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={20} />
            אנשי קשר
          </h2>
          <p className="text-sm text-muted-foreground">{contacts.length} איש קשר</p>
        </div>
        <div className="flex gap-2">
          {/* Import Excel */}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => fileInputRef.current?.click()} data-testid="button-import-excel">
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">ייבוא מאקסל</span>
            <span className="sm:hidden">ייבוא</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-excel-file"
          />

          {/* Add manually */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" data-testid="button-add-contact">
                <Plus size={15} /> הוסף
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm mx-4" dir="rtl">
              <DialogHeader>
                <DialogTitle>הוסף איש קשר</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>שם מלא</Label>
                  <Input
                    data-testid="input-contact-name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label>טלפון</Label>
                  <Input
                    data-testid="input-contact-phone"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="05X-XXXXXXX"
                    type="tel"
                    inputMode="numeric"
                  />
                </div>
                <Button
                  data-testid="button-save-contact"
                  className="w-full"
                  disabled={!newName.trim() || addContact.isPending}
                  onClick={() => addContact.mutate({ name: newName.trim(), phone: newPhone.trim() })}
                >
                  {addContact.isPending ? "שומר..." : "הוסף"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      {contacts.length > 5 && (
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="חיפוש שם או טלפון..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid="input-search-contacts"
          />
        </div>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Users size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {contacts.length === 0 ? "אין אנשי קשר עדיין" : "לא נמצאו תוצאות"}
              </p>
              {contacts.length === 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus size={14} className="ml-1" /> הוסף ידנית
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet size={14} className="ml-1" /> ייבוא מאקסל
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(contact => (
                <div key={contact.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-contact-${contact.id}`}>
                  {editingId === contact.id ? (
                    <>
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          data-testid={`input-edit-name-${contact.id}`}
                        />
                        <Input
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          className="h-8 text-sm w-32"
                          type="tel"
                          data-testid={`input-edit-phone-${contact.id}`}
                        />
                      </div>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-green-600"
                        onClick={() => updateContact.mutate({ id: contact.id, name: editName, phone: editPhone })}
                        data-testid={`button-save-edit-${contact.id}`}
                      ><Check size={15} /></Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                        onClick={() => setEditingId(null)}
                      ><X size={15} /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phone || "—"}</p>
                      </div>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
                        onClick={() => { setEditingId(contact.id); setEditName(contact.name); setEditPhone(contact.phone); }}
                        data-testid={`button-edit-${contact.id}`}
                      ><Edit2 size={14} /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-contact-${contact.id}`}
                          ><Trash2 size={14} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>מחיקת איש קשר</AlertDialogTitle>
                            <AlertDialogDescription>
                              האם למחוק את {contact.name}? לא ניתן לשחזר.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteContact.mutate(contact.id)}>מחק</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import preview dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-sm mx-4 max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={18} />
              אישור ייבוא ({importPreview.length} אנשי קשר)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto divide-y divide-border border rounded-lg">
              {importPreview.map((c, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.phone}</span>
                </div>
              ))}
            </div>
            {importPreview.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                לא זוהו אנשי קשר בקובץ. ודא שהקובץ מכיל עמודות שם וטלפון.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={importPreview.length === 0 || bulkImport.isPending}
                onClick={() => bulkImport.mutate(importPreview)}
                data-testid="button-confirm-import"
              >
                {bulkImport.isPending ? "מייבא..." : `ייבוא ${importPreview.length} אנשי קשר`}
              </Button>
              <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview([]); }}>
                ביטול
              </Button>
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded p-3 space-y-1">
              <p className="font-medium">פורמט מצופה בקובץ:</p>
              <p>• עמודה א: שם מלא</p>
              <p>• עמודה ב: מספר טלפון</p>
              <p>• שורה ראשונה יכולה להיות כותרת (תידלג)</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
