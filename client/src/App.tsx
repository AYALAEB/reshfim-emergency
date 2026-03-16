import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import EventDetail from "./pages/EventDetail";
import Contacts from "./pages/Contacts";
import Report from "./pages/Report";
import NotFound from "./pages/not-found";
import MobileNav from "./components/MobileNav";

function Router() {
  return (
    <WouterRouter hook={useHashLocation}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/report/:eventId/:contactId" component={Report} />
        <Route path="/report/:eventId" component={Report} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* SVG Logo */}
            <svg viewBox="0 0 32 32" width="32" height="32" aria-label="לוגו רשפים חירום" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="hsl(4,85%,45%)" strokeWidth="2.5"/>
              <path d="M16 6 L18 13 L25 13 L19.5 17.5 L21.5 24.5 L16 20 L10.5 24.5 L12.5 17.5 L7 13 L14 13 Z" fill="hsl(4,85%,45%)"/>
            </svg>
            <div>
              <h1 className="text-base font-bold leading-none">רשפים חירום</h1>
              <p className="text-xs text-muted-foreground">מערכת נוכחות</p>
            </div>
          </div>
        </header>

        {/* Main content — pad bottom for mobile nav */}
        <main className="max-w-4xl mx-auto px-4 pb-24 md:pb-8 pt-4">
          <Router />
        </main>

        {/* Mobile bottom navigation */}
        <MobileNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
