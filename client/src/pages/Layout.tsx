import { Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

export default function Layout({ children, title, subtitle, showBack }: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}) {
  const [loc, navigate] = useHashLocation();
  const isReport = loc.startsWith("/report");

  return (
    <div className="min-h-screen flex flex-col" style={{ paddingBottom: isReport ? 0 : 60 }}>
      {/* Header */}
      <header className="sticky top-0 z-50 text-white text-center py-3 px-4 shadow-md"
        style={{ background: "hsl(var(--red-alert))" }}>
        {showBack && (
          <button
            onClick={() => navigate("/events")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 text-sm font-medium"
          >
            חזרה ←
          </button>
        )}
        <h1 className="font-bold text-lg leading-tight">🚨 חירום רשפים</h1>
        {(title || subtitle) && (
          <p className="text-white/85 text-xs mt-0.5">{subtitle || title}</p>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      {/* Bottom nav (admin pages only) */}
      {!isReport && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
          <NavBtn href="/events" label="אירועים" icon="📋" active={loc === "/" || loc.startsWith("/events")} />
          <NavBtn href="/contacts" label="אנשי קשר" icon="👥" active={loc === "/contacts"} />
        </nav>
      )}
    </div>
  );
}

function NavBtn({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href}
      className={`flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
        active ? "text-red-600 font-bold" : "text-gray-500"
      }`}
    >
      <span className="text-xl">{icon}</span>
      {label}
    </Link>
  );
}
