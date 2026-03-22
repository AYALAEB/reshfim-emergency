import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ManagementPage from "@/pages/management";
import ContactsPage from "@/pages/contacts";
import EventReportPage from "@/pages/event-report";
import ReportFormPage from "@/pages/report-form";
import Layout from "@/components/Layout";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={ManagementPage} />
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/event/:eventId" component={EventReportPage} />
      <Route path="/report/:eventId/:contactId" component={ReportFormPage} />
      <Route path="/report/:eventId" component={ReportFormPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <Layout>
            <AppRouter />
          </Layout>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
