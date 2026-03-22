import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type InfoData = {
  event: { id: string; name: string; createdAt: string };
  contact: { id: string; name: string; phone: string };
  alreadyReported: boolean;
  report: { status: string; details: string } | null;
};

const statusLabel = (s: string) =>
  ({ in: "בקיבוץ ✓", out: "בחוץ ✓", help: "🆘 זקוק/ה לעזרה" }[s] ?? s);

const statusIcon = (s: string) =>
  ({ in: "🏠", out: "🚗", help: "🆘" }[s] ?? "✅");

export default function ReportPage() {
  const { eventId, contactId } = useParams<{ eventId: string; contactId: string }>();
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<InfoData>({
    queryKey: ["/api/report-info", eventId, contactId],
    queryFn: () => fetch(`/api/report-info/${eventId}/${contactId}`).then(r => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    }),
    retry: false,
  });

  const submitReport = useMutation({
    mutationFn: ({ status, details }: { status: string; details: string }) =>
      apiRequest("POST", `/api/events/${eventId}/report/${contactId}`, { status, details }).then(r => r.json()),
    onSuccess: (res) => {
      setSubmitted(res.report.status);
    },
  });

  const handleStatus = (status: string) => {
    if (status === "help") {
      setShowHelpForm(true);
    } else {
      submitReport.mutate({ status, details: "" });
    }
  };

  // Full-screen layout for report page (no nav)
  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      {/* Header */}
      <header className="text-white text-center py-3 px-4 shadow-md"
        style={{ background: "hsl(4 75% 47%)" }}>
        <h1 className="font-bold text-lg">🚨 חירום רשפים</h1>
        <p className="text-white/80 text-xs mt-0.5">דיווח מצב אישי</p>
      </header>

      <main className="flex-1 max-w-sm mx-auto w-full px-4 py-6">
        {isLoading && (
          <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">טוען...</div>
        )}

        {isError && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-4xl mb-3">❌</div>
            <h2 className="font-bold text-lg mb-2">קישור לא תקין</h2>
            <p className="text-gray-500 text-sm">הקישור שהתקבל לא תקין. אנא פנה/י לצוות החירום ישירות.</p>
          </div>
        )}

        {data && !submitted && !data.alreadyReported && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🚨</div>
              <h2 className="font-bold text-red-600 text-xl">דיווח מצב חירום</h2>
              <p className="text-gray-500 text-sm mt-1">{data.event.name}</p>
            </div>

            {/* User info (read only) */}
            <div className="bg-gray-50 rounded-lg p-3 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-600">שם:</span>
                <span className="font-bold">{data.contact.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-600">טלפון:</span>
                <span dir="ltr">{data.contact.phone}</span>
              </div>
            </div>

            <p className="font-bold mb-4 text-base">בחר/י את מצבך:</p>

            {!showHelpForm ? (
              <div className="space-y-3">
                <button
                  data-testid="btn-status-in"
                  onClick={() => handleStatus("in")}
                  disabled={submitReport.isPending}
                  className="w-full py-4 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition active:scale-95 disabled:opacity-50"
                >
                  🏠 אני בקיבוץ והכל בסדר
                </button>
                <button
                  data-testid="btn-status-out"
                  onClick={() => handleStatus("out")}
                  disabled={submitReport.isPending}
                  className="w-full py-4 rounded-xl bg-blue-500 text-white font-bold text-lg hover:bg-blue-600 transition active:scale-95 disabled:opacity-50"
                >
                  🚗 אני לא בקיבוץ והכל בסדר
                </button>
                <button
                  data-testid="btn-status-help"
                  onClick={() => handleStatus("help")}
                  disabled={submitReport.isPending}
                  className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition active:scale-95 disabled:opacity-50"
                >
                  🆘 אני זקוק/ה לעזרה
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">פרט/י מה קרה (אופציונלי):</label>
                  <textarea
                    data-testid="textarea-help-details"
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    rows={3}
                    placeholder="תאר/י את המצב..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                    autoFocus
                  />
                </div>
                <button
                  data-testid="btn-confirm-help"
                  onClick={() => submitReport.mutate({ status: "help", details })}
                  disabled={submitReport.isPending}
                  className="w-full py-4 rounded-xl bg-red-600 text-white font-bold text-base hover:bg-red-700 transition disabled:opacity-50"
                >
                  {submitReport.isPending ? "שולח..." : "שלח דיווח"}
                </button>
                <button
                  onClick={() => setShowHelpForm(false)}
                  className="w-full py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium"
                >
                  ← חזרה
                </button>
              </div>
            )}
          </div>
        )}

        {/* Already reported */}
        {data && data.alreadyReported && !submitted && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-5xl mb-3">{statusIcon(data.report!.status)}</div>
            <h2 className="font-bold text-lg mb-2">כבר דיווחת!</h2>
            <p className="text-gray-500 text-sm">הדיווח שלך נרשם: <strong>{statusLabel(data.report!.status)}</strong></p>
          </div>
        )}

        {/* Success */}
        {submitted && (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="text-5xl mb-3">{statusIcon(submitted)}</div>
            <h2 className="font-bold text-lg mb-2">הדיווח נשלח!</h2>
            <p className="text-gray-500 text-sm">סטטוס שנרשם: <strong>{statusLabel(submitted)}</strong></p>
            <p className="text-xs text-gray-400 mt-4">ניתן לסגור חלון זה</p>
          </div>
        )}
      </main>
    </div>
  );
}
