import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Topics from "@/pages/Topics";
import TopicDetail from "@/pages/TopicDetail";
import Practice from "@/pages/Practice";
import Tests from "@/pages/Tests";
import TestDetail from "@/pages/TestDetail";
import Results from "@/pages/Results";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/topics" component={Topics} />
        <Route path="/topics/:id" component={TopicDetail} />
        <Route path="/practice" component={Practice} />
        <Route path="/tests" component={Tests} />
        <Route path="/tests/:id" component={TestDetail} />
        <Route path="/results/:id" component={Results} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
