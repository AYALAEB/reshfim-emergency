import { Link, useLocation } from "wouter";
import { Shield, Users, Home } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Hide nav on report form pages (public-facing)
  const isReportPage = location.startsWith("/report");

  return (
    <div className="min-h-screen flex flex-col">
      {!isReportPage && (
        <header className="bg-card border-b border-card-border sticky top-0 z-50" data-testid="header">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/">
                <div className="flex items-center gap-3 cursor-pointer" data-testid="logo-link">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold leading-tight">מערכת מעקב חירום</h1>
                    <p className="text-xs text-muted-foreground">קיבוץ רשפים</p>
                  </div>
                </div>
              </Link>
              <nav className="flex items-center gap-1" data-testid="nav">
                <Link href="/">
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location === "/" || location === ""
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    data-testid="nav-home"
                  >
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline">ניהול</span>
                  </button>
                </Link>
                <Link href="/contacts">
                  <button
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location === "/contacts"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    data-testid="nav-contacts"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">אנשי קשר</span>
                  </button>
                </Link>
              </nav>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="py-4 text-center border-t border-border">
        <PerplexityAttribution />
      </footer>
    </div>
  );
}
