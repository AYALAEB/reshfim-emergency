import { useQuery } from "@tanstack/react-query";

interface Stats {
  total: number;
  inKibbutz: number;
  outsideKibbutz: number;
  needsHelp: number;
  reported: number;
  notReported: number;
}

export default function EventStats({ eventId }: { eventId: string }) {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/events", eventId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/stats`);
      return res.json();
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="flex gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 flex-1 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "בקיבוץ", value: stats.inKibbutz, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { label: "מחוץ לקיבוץ", value: stats.outsideKibbutz, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { label: "זקוקים לעזרה", value: stats.needsHelp, color: "bg-red-500/10 text-red-600 border-red-500/20" },
    { label: "לא דיווחו", value: stats.notReported, color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid={`stats-${eventId}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg border px-3 py-2.5 ${item.color}`}
        >
          <div className="text-lg font-bold leading-none mb-0.5">{item.value}</div>
          <div className="text-[11px] font-medium opacity-80">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
