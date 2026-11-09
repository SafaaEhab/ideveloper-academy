import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import AnnouncementPopup from "./components/AnnouncementPopup";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteMetadata from "./components/RouteMetadata";
import { ThemeProvider } from "./contexts/ThemeContext";
import { registerPublicWebMcpTools } from "./lib/webmcp";
import Home from "./pages/Home";

// Public landing page stays eager so the first paint is immediate. The heavy
// dashboards and curriculum pages (Admin, StudentPortal, InstructorPortal) are
// split into their own chunks; a visitor reading the home page never downloads
// the admin workbook or the whole Python curriculum.
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const Login = lazy(() => import("./pages/Login"));
const StudentPortal = lazy(() => import("./pages/StudentPortal"));
const InstructorPortal = lazy(() => import("./pages/instructor/InstructorPortal"));
const Admin = lazy(() => import("./pages/Admin"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouteMetadata />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/courses" component={CoursesPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/login" component={Login} />
        <Route path="/student" component={StudentPortal} />
        <Route path="/instructor/analytics" component={InstructorPortal} />
        <Route path="/instructor/analytics/" component={InstructorPortal} />
        <Route
          path="/instructor/group/:groupId/student/:studentId"
          component={InstructorPortal}
        />
        <Route path="/instructor/group/:groupId" component={InstructorPortal} />
        <Route path="/instructor" component={InstructorPortal} />
        <Route path="/instructor/" component={InstructorPortal} />
        <Route path="/admin" component={Admin} />
        <Route path="/leads" component={LeadsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  useEffect(() => registerPublicWebMcpTools(), []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
          <AnnouncementPopup />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
