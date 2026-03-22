import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Pencil, Trash2, Users, FileSpreadsheet, FileText, Eraser } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith("972")) {
    return "0" + phone.slice(3);
  }
  return phone;
}

export default function ContactsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [importText, setImportText] = useState("");
  const [previewContacts, setPreviewContacts] = useState<{ name: string; phone: string }[]>([]);
  const [importMethod, setImportMethod] = useState<"file" | "text">("file");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const createContact = useMutation({
    mutationFn: async (data: { name: string; phone: string }) => {
      const res = await apiRequest("POST", "/api/contacts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      closeAddModal();
      toast({ title: "איש קשר נוסף בהצלחה" });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; phone: string } }) => {
      const res = await apiRequest("PUT", `/api/contacts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      closeAddModal();
      toast({ title: "איש קשר עודכן" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "איש קשר נמחק" });
    },
  });

  const bulkCreate = useMutation({
    mutationFn: async (contactsList: { name: string; phone: string }[]) => {
      const res = await apiRequest("POST", "/api/contacts/bulk", { contacts: contactsList });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowPreviewModal(false);
      setPreviewContacts([]);
      toast({ title: "אנשי קשר יובאו בהצלחה" });
    },
  });

  const clearAllContacts = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/contacts");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setShowClearConfirm(false);
      toast({ title: "הרשימה נוקתה" });
    },
  });

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditContact(null);
    setName("");
    setPhone("");
  };

  const handleSave = () => {
    if (!name.trim() || !phone.trim()) return;
    if (editContact) {
      updateContact.mutate({ id: editContact.id, data: { name: name.trim(), phone: phone.trim() } });
    } else {
      createContact.mutate({ name: name.trim(), phone: phone.trim() });
    }
  };

  const openEdit = (contact: Contact) => {
    setEditContact(contact);
    setName(contact.name);
    setPhone(formatPhoneDisplay(contact.phone));
    setShowAddModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
      const res = await fetch(`${API_BASE}/api/contacts/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.contacts && data.contacts.length > 0) {
        setPreviewContacts(data.contacts);
        setShowImportModal(false);
        setShowPreviewModal(true);
      } else {
        toast({ title: "לא נמצאו אנשי קשר בקובץ", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאה בקריאת הקובץ", variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextImport = async () => {
    if (!importText.trim()) return;

    try {
      const res = await apiRequest("POST", "/api/contacts/import-text", { text: importText });
      const data = await res.json();
      if (data.contacts && data.contacts.length > 0) {
        setPreviewContacts(data.contacts);
        setShowImportModal(false);
        setImportText("");
        setShowPreviewModal(true);
      } else {
        toast({ title: "לא נמצאו אנשי קשר בטקסט", variant: "destructive" });
      }
    } catch {
      toast({ title: "שגיאה בעיבוד הטקסט", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" data-testid="page-title">אנשי קשר</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts ? `${contacts.length} אנשי קשר` : "טוען..."}
          </p>
        </div>
        <div className="flex gap-2">
          {contacts && contacts.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setShowClearConfirm(true)}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-clear-all"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">נקה רשימה</span>
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowImportModal(true)} className="gap-2" data-testid="button-import">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">ייבוא</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2" data-testid="button-add-contact">
            <Plus className="w-4 h-4" />
            הוסף איש קשר
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : contacts && contacts.length > 0 ? (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right font-semibold">שם</TableHead>
                <TableHead className="text-right font-semibold">טלפון</TableHead>
                <TableHead className="text-left w-24">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                  <TableCell className="font-medium" data-testid={`contact-name-${contact.id}`}>{contact.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm" dir="ltr" data-testid={`contact-phone-${contact.id}`}>
                    {formatPhoneDisplay(contact.phone)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(contact)}
                        data-testid={`button-edit-contact-${contact.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteContact.mutate(contact.id)}
                        data-testid={`button-delete-contact-${contact.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-card-border rounded-xl" data-testid="empty-contacts">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-semibold mb-1">אין אנשי קשר</h3>
          <p className="text-sm text-muted-foreground mb-6">הוסיפו אנשי קשר ידנית או ייבאו מקובץ</p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              ייבוא מקובץ
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              הוסף איש קשר
            </Button>
          </div>
        </div>
      )}

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>נקוי רשימת אנשי הקשר</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את כל {contacts?.length} אנשי הקשר מהרשימה. אין אפשרות לבטל.האם להמשיך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearAllContacts.mutate()}
              className="bg-destructive hover:bg-destructive/90 text-white"
              data-testid="button-confirm-clear"
            >
              נקה את כל הרשימה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={(v) => !v && closeAddModal()}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-contact">
          <DialogHeader>
            <DialogTitle>{editContact ? "עריכת איש קשר" : "הוספת איש קשר"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="contact-name">שם</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם מלא"
                className="mt-1.5"
                dir="rtl"
                data-testid="input-contact-name"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">טלפון</Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                className="mt-1.5"
                dir="ltr"
                type="tel"
                data-testid="input-contact-phone"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={closeAddModal}>ביטול</Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !phone.trim() || createContact.isPending || updateContact.isPending}
              data-testid="button-save-contact"
            >
              {(createContact.isPending || updateContact.isPending) ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-import">
          <DialogHeader>
            <DialogTitle>ייבוא אנשי קשר</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                variant={importMethod === "file" ? "default" : "secondary"}
                onClick={() => setImportMethod("file")}
                className="flex-1 gap-2"
                data-testid="button-import-file-tab"
              >
                <FileSpreadsheet className="w-4 h-4" />
                מקובץ
              </Button>
              <Button
                variant={importMethod === "text" ? "default" : "secondary"}
                onClick={() => setImportMethod("text")}
                className="flex-1 gap-2"
                data-testid="button-import-text-tab"
              >
                <FileText className="w-4 h-4" />
                מטקסט
              </Button>
            </div>

            {importMethod === "file" ? (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  העלו קובץ Excel (.xlsx/.xls) או CSV עם עמודות שם וטלפון
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  variant="secondary"
                  className="w-full gap-2 h-24 border-dashed border-2"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-choose-file"
                >
                  <Upload className="w-5 h-5" />
                  לחצו לבחירת קובץ
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  הדביקו רשימה: שורה אחת לכל איש קשר, בפורמט &quot;שם טלפון&quot; או &quot;שם, טלפון&quot;
                </p>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`דוגמה:\nישראל ישראלי 0501234567\nשרה כהן, 0521234567`}
                  className="min-h-[150px] font-mono text-sm"
                  dir="rtl"
                  data-testid="input-import-text"
                />
                <Button
                  className="mt-3 w-full"
                  onClick={handleTextImport}
                  disabled={!importText.trim()}
                  data-testid="button-parse-text"
                >
                  עבד טקסט
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Import Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-import-preview">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה - {previewContacts.length} אנשי קשר</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewContacts.map((c, i) => (
                  <TableRow key={i} data-testid={`preview-row-${i}`}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-sm">{formatPhoneDisplay(c.phone)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>ביטול</Button>
            <Button
              onClick={() => bulkCreate.mutate(previewContacts)}
              disabled={bulkCreate.isPending}
              data-testid="button-confirm-import"
            >
              {bulkCreate.isPending ? "מייבא..." : `ייבא ${previewContacts.length} אנשי קשר`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
