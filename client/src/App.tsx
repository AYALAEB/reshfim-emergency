import { Router, Switch, Route } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import AdminPage from "@/pages/AdminPage";
import ContactsPage from "@/pages/ContactsPage";
import EventPage from "@/pages/EventPage";
import ReportPage from "@/pages/ReportPage";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
    <Switch>
      <Route path="/" component={AdminPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/event/:id" component={EventPage} />
      <Route path="/report/:eventId/:contactId" component={ReportPage} />
      <Route component={NotFound} />
    </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  );
}
