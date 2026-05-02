import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import LoginScreen from "@/pages/LoginScreen";
import AdminPanel from "@/pages/AdminPanel";
import PendingApprovalScreen from "@/pages/PendingApprovalScreen";
import Dashboard from "@/pages/Dashboard";
import Topics from "@/pages/Topics";
import TopicDetail from "@/pages/TopicDetail";
import Practice from "@/pages/Practice";
import Tests from "@/pages/Tests";
import TestDetail from "@/pages/TestDetail";
import Results from "@/pages/Results";
import Leaderboard from "@/pages/Leaderboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

function StudentApp() {
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
        <Route path="/leaderboard" component={Leaderboard} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppRouter() {
  const { user } = useAuth();

  if (!user) return <LoginScreen />;
  if (user.role === "teacher") return <AdminPanel />;

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <StudentApp />
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
