import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import type { Event, Contact } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle2, Loader2 } from "lucide-react";

type ReportStatus = "in_kibbutz" | "outside_kibbutz" | "needs_help";

export default function ReportFormPage() {
  const params = useParams<{ eventId: string; contactId?: string }>();
  const eventId = params.eventId!;
  const contactId = params.contactId;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
      const res = await fetch(`${API_BASE}/api/events/${eventId}`);
      if (!res.ok) throw new Error("Event not found");
      return res.json();
    },
  });

  const { data: contact } = useQuery<Contact>({
    queryKey: ["/api/contacts", contactId],
    queryFn: async () => {
      const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
      const res = await fetch(`${API_BASE}/api/contacts/${contactId}`);
      if (!res.ok) throw new Error("Contact not found");
      return res.json();
    },
    enabled: !!contactId,
  });

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(formatPhoneDisplay(contact.phone));
    }
  }, [contact]);

  const submitReport = useMutation({
    mutationFn: async (status: ReportStatus) => {
      const res = await apiRequest("POST", "/api/reports", {
        eventId,
        contactId: contactId || undefined,
        name: name.trim(),
        phone: phone.trim(),
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (status: ReportStatus) => {
    if (!name.trim() || !phone.trim()) return;
    submitReport.mutate(status);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-bold mb-2">אירוע לא נמצא</h2>
          <p className="text-sm text-muted-foreground">
            ייתכן שהקישור שגוי או שהאירוע הוסר
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm" data-testid="report-success">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">הדיווח התקבל, תודה!</h2>
          <p className="text-sm text-muted-foreground">
            הדיווח שלך נשמר בהצלחה.
            <br />
            תודה על שיתוף הפעולה.
          </p>
          <p className="text-xs text-muted-foreground mt-4">קיבוץ רשפים</p>
        </div>
      </div>
    );
  }

  const isPersonal = !!contactId && !!contact;
  const canSubmit = name.trim() && phone.trim() && !submitReport.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6" data-testid="report-header">
        <div className="max-w-md mx-auto text-center">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold">דיווח סטטוס</h1>
          <p className="text-sm opacity-90 mt-1">{event.name}</p>
          <p className="text-xs opacity-70 mt-0.5">קיבוץ רשפים</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Name & Phone fields */}
        {!isPersonal && (
          <div className="space-y-4 bg-card border border-card-border rounded-xl p-4" data-testid="form-fields">
            <div>
              <Label htmlFor="report-name">שם מלא</Label>
              <Input
                id="report-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="הכניסו את שמכם"
                className="mt-1.5 h-12 text-base"
                dir="rtl"
                data-testid="input-report-name"
              />
            </div>
            <div>
              <Label htmlFor="report-phone">מספר טלפון</Label>
              <Input
                id="report-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                className="mt-1.5 h-12 text-base"
                dir="ltr"
                type="tel"
                data-testid="input-report-phone"
              />
            </div>
          </div>
        )}

        {isPersonal && (
          <div className="bg-card border border-card-border rounded-xl p-4" data-testid="personal-info">
            <p className="text-sm text-muted-foreground mb-1">מדווח/ת:</p>
            <p className="font-bold text-base">{contact.name}</p>
          </div>
        )}

        {/* Status Buttons */}
        <div className="space-y-3" data-testid="status-buttons">
          <p className="text-sm font-semibold text-center">מה הסטטוס שלך?</p>

          <button
            onClick={() => handleSubmit("in_kibbutz")}
            disabled={!canSubmit}
            className="w-full rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 active:bg-emerald-500/20 p-5 text-right transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-status-in-kibbutz"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🟢</span>
              </div>
              <div>
                <div className="font-bold text-base text-emerald-700">אני בקיבוץ והכל בסדר</div>
                <div className="text-xs text-emerald-600/70 mt-0.5">נמצא/ת בקיבוץ, אין צורך בעזרה</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSubmit("outside_kibbutz")}
            disabled={!canSubmit}
            className="w-full rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 active:bg-blue-500/20 p-5 text-right transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-status-outside-kibbutz"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🔵</span>
              </div>
              <div>
                <div className="font-bold text-base text-blue-700">אני מחוץ לקיבוץ והכל בסדר</div>
                <div className="text-xs text-blue-600/70 mt-0.5">לא נמצא/ת בקיבוץ, אין צורך בעזרה</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSubmit("needs_help")}
            disabled={!canSubmit}
            className="w-full rounded-2xl border-2 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/20 p-5 text-right transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-status-needs-help"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🔴</span>
              </div>
              <div>
                <div className="font-bold text-base text-red-700">אני זקוק/ה לעזרה</div>
                <div className="text-xs text-red-600/70 mt-0.5">אני צריך/ה סיוע</div>
              </div>
            </div>
          </button>

          {submitReport.isPending && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              שולח דיווח...
            </div>
          )}
        </div>

        {!isPersonal && !name.trim() && (
          <p className="text-xs text-center text-muted-foreground">
            נא למלא שם וטלפון לפני הדיווח
          </p>
        )}
      </div>
    </div>
  );
}

function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith("972")) {
    return "0" + phone.slice(3);
  }
  return phone;
}
