import { Switch, Route } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import Contacts from "@/pages/Contacts";
import EventDetail from "@/pages/EventDetail";
import ReportPage from "@/pages/ReportPage";
import NotFound from "@/pages/not-found";
import PerplexityAttribution from "@/components/PerplexityAttribution";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/report/:eventId/:contactId" component={ReportPage} />
      <Route path="/report/:eventId" component={ReportPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Router />
        <Toaster />
        <PerplexityAttribution />
      </div>
    </QueryClientProvider>
  );
}

export default App;
