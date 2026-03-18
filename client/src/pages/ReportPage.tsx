import { useParams } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, LogOut, HelpCircle } from "lucide-react";

export default function ReportPage() {
  const { eventId, contactId } = useParams<{ eventId: string; contactId?: string }>();
  const isPersonalLink = !!contactId;

  if (isPersonalLink) {
    return <PersonalReport eventId={eventId} contactId={contactId} />;
  }
  return <GeneralReport eventId={eventId} />;
}

// ─── קישור אישי (שם+טלפון ממולאים אוטומטית) ─────────────────
function PersonalReport({ eventId, contactId }: { eventId: string; contactId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: info, isLoading } = useQuery<{ event: any; contact: any }>({
    queryKey: ["/api/report-info", eventId, contactId],
    queryFn: () => apiRequest("GET", `/api/report-info/${eventId}/${contactId}`),
  });

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/reports", {
      eventId: Number(eventId),
      contactId: Number(contactId),
      name: info?.contact?.name ?? "",
      phone: info?.contact?.phone ?? "",
      status,
      notes: notes.trim() || null,
      reportedAt: new Date().toLocaleString("he-IL"),
    }),
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) return <LoadingScreen />;
  if (submitted) return <SuccessScreen name={info?.contact?.name} status={status!} />;

  return (
    <ReportForm
      eventName={info?.event?.name}
      prefillName={info?.contact?.name}
      prefillPhone={info?.contact?.phone}
      status={status}
      setStatus={setStatus}
      notes={notes}
      setNotes={setNotes}
      onSubmit={() => submitMutation.mutate()}
      isPending={submitMutation.isPending}
      canSubmit={!!status}
    />
  );
}

// נרמול מספר טלפון: מסיר כל תו שאינו ספרה, מחליף 972 ב-0
function normalizePhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

// ─── קישור כללי (ממלא שם + טלפון ידנית) ─────────────────────
function GeneralReport({ eventId }: { eventId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}`),
  });

  // טעינת כל אנשי הקשר כדי להתאים לפי טלפון
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      // נסיון התאמה לאיש קשר קיים לפי מספר טלפון מנורמל
      const normalizedInput = normalizePhone(phone);
      const matched = contacts.find(
        c => normalizePhone(c.phone) === normalizedInput
      );

      return apiRequest("POST", "/api/reports", {
        eventId: Number(eventId),
        contactId: matched?.id ?? null,   // ← אם נמצא – מסמן בדוח כ"דיווח"
        name: matched?.name ?? name.trim(), // שם מהרשימה אם נמצא
        phone: matched?.phone ?? phone.trim(),
        status,
        notes: notes.trim() || null,
        reportedAt: new Date().toLocaleString("he-IL"),
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) return <SuccessScreen name={name} status={status!} />;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-primary text-primary-foreground px-4 py-5 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <h1 className="text-xl font-bold">אירוע חירום</h1>
        {event?.name && <p className="text-primary-foreground/80 text-sm mt-0.5">{event.name}</p>}
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">
        {/* שם */}
        <div className="space-y-1.5">
          <Label htmlFor="name-input" className="font-semibold">השם שלך</Label>
          <Input
            id="name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ישראל ישראלי"
            className="text-base h-12"
            autoFocus
            data-testid="input-name"
          />
        </div>

        {/* טלפון */}
        <div className="space-y-1.5">
          <Label htmlFor="phone-input" className="font-semibold">
            מספר טלפון
            <span className="text-xs font-normal text-muted-foreground mr-1">(לזיהוי במערכת)</span>
          </Label>
          <Input
            id="phone-input"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="050-1234567"
            type="tel"
            className="text-base h-12"
            data-testid="input-phone"
          />
        </div>

        {/* מצב */}
        <StatusButtons status={status} setStatus={setStatus} />

        {/* הערות */}
        {status === "need_help" && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">פרטים נוספים (אופציונלי)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="תאר את המצב – מיקום, סוג הסיוע הנדרש..." rows={3} />
          </div>
        )}

        <Button
          className="w-full h-12 text-base"
          onClick={() => submitMutation.mutate()}
          disabled={!status || !name.trim() || !phone.trim() || submitMutation.isPending}
        >
          {submitMutation.isPending ? "שולח..." : "שלח דיווח"}
        </Button>
      </div>
    </div>
  );
}

// ─── טופס דיווח אישי (שם ממולא) ─────────────────────────────
function ReportForm({ eventName, prefillName, prefillPhone, status, setStatus, notes, setNotes, onSubmit, isPending, canSubmit, onBack }: any) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="bg-primary text-primary-foreground px-4 py-5 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        <h1 className="text-xl font-bold">אירוע חירום</h1>
        {eventName && <p className="text-primary-foreground/80 text-sm mt-0.5">{eventName}</p>}
      </div>
      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">
        <div className="bg-muted/50 rounded-lg px-4 py-3 border border-border">
          <div className="font-semibold">{prefillName}</div>
          {prefillPhone && <div className="text-xs text-muted-foreground">{prefillPhone}</div>}
        </div>

        <StatusButtons status={status} setStatus={setStatus} />

        {status === "need_help" && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">פרטים נוספים (אופציונלי)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="תאר את המצב – מיקום, סוג הסיוע הנדרש..." rows={3} />
          </div>
        )}

        <Button className="w-full h-12 text-base" onClick={onSubmit} disabled={!canSubmit || isPending}>
          {isPending ? "שולח..." : "שלח דיווח"}
        </Button>
      </div>
    </div>
  );
}

// ─── כפתורי מצב (משותף) ─────────────────────────────────────
function StatusButtons({ status, setStatus }: { status: string | null; setStatus: (s: string) => void }) {
  const options = [
    { key: "safe_in",   emoji: "✅", label: "אני בקיבוץ והכל בסדר",     sub: "נמצא בקיבוץ, אין צורך בסיוע", border: "border-green-600", bg: "bg-green-50", active: "bg-green-600", text: "text-green-800", iconBg: "bg-green-100" },
    { key: "safe_out",  emoji: "🔵", label: "אני לא בקיבוץ והכל בסדר",  sub: "נמצא מחוץ לקיבוץ, בסדר",      border: "border-blue-600",  bg: "bg-blue-50",  active: "bg-blue-600",  text: "text-blue-800",  iconBg: "bg-blue-100"  },
    { key: "need_help", emoji: "🆘", label: "אני זקוק/ה לעזרה",          sub: "קשר דחוף עם צוות החירום",     border: "border-red-600",   bg: "bg-red-50",   active: "bg-red-600",   text: "text-red-800",   iconBg: "bg-red-100"   },
  ];
  return (
    <div className="space-y-3">
      <p className="font-semibold text-center text-sm">מה המצב שלך?</p>
      {options.map(opt => (
        <button key={opt.key} onClick={() => setStatus(opt.key)}
          className={`w-full rounded-xl p-4 border-2 transition-all text-right ${status === opt.key ? `${opt.border} ${opt.bg}` : "border-border hover:border-gray-400 bg-background"}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${status === opt.key ? `${opt.active} text-white` : opt.iconBg}`}>
              {opt.emoji}
            </div>
            <div>
              <div className={`font-bold ${opt.text}`}>{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.sub}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── מסך הצלחה ───────────────────────────────────────────────
function SuccessScreen({ name, status }: { name?: string; status: string }) {
  const messages: Record<string, { icon: any; text: string; color: string }> = {
    safe_in:   { icon: CheckCircle2, text: "הדיווח התקבל – בקיבוץ ובסדר",         color: "text-green-600" },
    safe_out:  { icon: LogOut,       text: "הדיווח התקבל – מחוץ לקיבוץ ובסדר",    color: "text-blue-600"  },
    need_help: { icon: HelpCircle,   text: "הדיווח התקבל – צוות החירום יצור קשר", color: "text-red-600"   },
  };
  const m = messages[status] ?? messages["safe_in"];
  const Icon = m.icon;
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background" dir="rtl">
      <div className="text-center max-w-xs">
        <Icon className={`h-16 w-16 ${m.color} mx-auto mb-4`} />
        <h2 className="text-xl font-bold mb-2">{name ? `תודה, ${name}!` : "תודה!"}</h2>
        <p className={`font-medium ${m.color}`}>{m.text}</p>
        <p className="text-sm text-muted-foreground mt-3">צח״י רשפים קיבל את הדיווח שלך</p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="h-8 w-48 bg-muted rounded animate-pulse mx-auto" />
    </div>
  );
}
