import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertTriangle, MapPin, MapPinOff } from "lucide-react";
import type { Event, Contact, Report as ReportType } from "@shared/schema";

const STATUS_OPTIONS = [
  {
    value: "in_kibbutz",
    label: "אני בקיבוץ — הכל בסדר",
    icon: "✅",
    color: "bg-green-600 hover:bg-green-700 text-white",
    border: "border-green-600",
  },
  {
    value: "out_kibbutz",
    label: "אני מחוץ לקיבוץ — הכל בסדר",
    icon: "🏠",
    color: "bg-blue-600 hover:bg-blue-700 text-white",
    border: "border-blue-600",
  },
  {
    value: "need_help",
    label: "אני זקוק/ה לעזרה",
    icon: "🆘",
    color: "bg-red-600 hover:bg-red-700 text-white",
    border: "border-red-600",
  },
];

export default function Report() {
  const { eventId, contactId } = useParams<{ eventId: string; contactId?: string }>();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const { data: event, isLoading: loadingEvent } = useQuery<Event>({
    queryKey: ["/api/events", Number(eventId)],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}`).then(r => r.json()),
  });

  const { data: contact, isLoading: loadingContact } = useQuery<Contact | null>({
    queryKey: ["/api/contacts", Number(contactId)],
    queryFn: () => contactId
      ? apiRequest("GET", `/api/contacts/${contactId}`).then(r => r.json())
      : Promise.resolve(null),
    enabled: !!contactId,
  });

  // Check if already reported
  useEffect(() => {
    if (contactId) {
      apiRequest("GET", `/api/events/${eventId}/reports/contact/${contactId}`)
        .then(r => r.json())
        .then(report => {
          if (report) setAlreadyReported(true);
        })
        .catch(() => {});
    }
  }, [eventId, contactId]);

  const submitReport = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/reports", data),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = () => {
    if (!selectedStatus) return;
    const name = contact?.name || manualName.trim();
    const phone = contact?.phone || manualPhone.trim();
    submitReport.mutate({
      eventId: Number(eventId),
      contactId: contactId ? Number(contactId) : null,
      name,
      phone,
      status: selectedStatus,
      details: details.trim() || null,
      reportedAt: new Date().toISOString(),
    });
  };

  const isLoading = loadingEvent || (!!contactId && loadingContact);
  const isManual = !contactId;
  const name = contact?.name || manualName;

  // Already reported
  if (alreadyReported) {
    return (
      <ReportLayout eventName={event?.name}>
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold">הדיווח כבר נשלח</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            דיווחת כבר עבור אירוע זה. תודה!
          </p>
        </div>
      </ReportLayout>
    );
  }

  // Success
  if (submitted) {
    const opt = STATUS_OPTIONS.find(s => s.value === selectedStatus);
    return (
      <ReportLayout eventName={event?.name}>
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="text-6xl">{opt?.icon || "✅"}</div>
          <h3 className="text-2xl font-bold">תודה, {name || ""}!</h3>
          <p className="text-muted-foreground text-sm max-w-xs">הדיווח שלך התקבל בהצלחה.</p>
          <div className={`mt-2 px-4 py-2 rounded-full text-sm font-semibold ${opt?.color}`}>
            {opt?.label}
          </div>
          {details && (
            <p className="text-xs text-muted-foreground mt-2 max-w-xs">
              הערה: {details}
            </p>
          )}
        </div>
      </ReportLayout>
    );
  }

  return (
    <ReportLayout eventName={event?.name}>
      {isLoading ? (
        <div className="space-y-4 py-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-5 py-2">
          {/* Greeting */}
          {contact ? (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-lg font-bold">{contact.name}</p>
              <p className="text-sm text-muted-foreground">{contact.phone}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground text-center">נא להזין את פרטיך</p>
              <div className="space-y-2">
                <Label>שם מלא</Label>
                <Input
                  placeholder="ישראל ישראלי"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  data-testid="input-manual-name"
                />
              </div>
              <div className="space-y-2">
                <Label>טלפון <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="05X-XXXXXXX"
                  type="tel"
                  inputMode="numeric"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  data-testid="input-manual-phone"
                />
                <p className="text-xs text-muted-foreground">נדרש לזיהוי בדוחות</p>
              </div>
            </div>
          )}

          {/* Status buttons */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-center text-muted-foreground">מה מצבך כרגע?</p>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                data-testid={`button-status-${opt.value}`}
                className={`
                  report-btn transition-all border-2
                  ${selectedStatus === opt.value
                    ? `${opt.color} ${opt.border} scale-[1.02]`
                    : "bg-card border-border text-foreground hover:border-current"
                  }
                `}
                onClick={() => setSelectedStatus(opt.value)}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Details for help */}
          {selectedStatus === "need_help" && (
            <div className="space-y-2">
              <Label>פרטים נוספים (מיקום, מצב רפואי וכו')</Label>
              <Textarea
                placeholder="תאר את המצב..."
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                data-testid="input-help-details"
              />
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full py-6 text-base font-bold"
            disabled={!selectedStatus || submitReport.isPending || (!contact && !manualName.trim()) || (!contact && !manualPhone.trim())}
            onClick={handleSubmit}
            data-testid="button-submit-report"
          >
            {submitReport.isPending ? "שולח..." : "שלח דיווח"}
          </Button>
        </div>
      )}
    </ReportLayout>
  );
}

function ReportLayout({ children, eventName }: { children: React.ReactNode; eventName?: string }) {
  return (
    <div className="max-w-md mx-auto">
      {/* Emergency header strip */}
      <div className="bg-destructive text-white rounded-xl p-4 mb-5 flex items-center gap-3">
        <AlertTriangle size={24} className="shrink-0" />
        <div>
          <p className="font-bold text-base leading-tight">דיווח נוכחות חירום</p>
          {eventName && <p className="text-sm opacity-90">{eventName}</p>}
          <p className="text-xs opacity-75">קיבוץ רשפים</p>
        </div>
      </div>
      {children}
    </div>
  );
}
