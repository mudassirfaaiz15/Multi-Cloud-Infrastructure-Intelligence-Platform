import { createBrowserRouter, Navigate } from "react-router";
import { lazy, Suspense } from "react";

// Lazy load all pages for code splitting
const LandingPage = lazy(() => import("@/app/pages/landing-page").then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/app/pages/login-page").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/app/pages/register-page").then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("@/app/pages/dashboard-page").then(m => ({ default: m.DashboardPage })));
const AWSConnectPage = lazy(() => import("@/app/pages/aws-connect-page").then(m => ({ default: m.AWSConnectPage })));
const IAMExplainerPage = lazy(() => import("@/app/pages/iam-explainer-page").then(m => ({ default: m.IAMExplainerPage })));
const RemindersPage = lazy(() => import("@/app/pages/reminders-page").then(m => ({ default: m.RemindersPage })));
const SettingsPage = lazy(() => import("@/app/pages/settings-page").then(m => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("@/app/pages/not-found-page").then(m => ({ default: m.NotFoundPage })));

// New pages
const MultiAccountPage = lazy(() => import("@/app/pages/multi-account-page").then(m => ({ default: m.MultiAccountPage })));
const CostBreakdownPage = lazy(() => import("@/app/pages/cost-breakdown-page").then(m => ({ default: m.CostBreakdownPage })));
const SecurityAuditPage = lazy(() => import("@/app/pages/security-audit-page").then(m => ({ default: m.SecurityAuditPage })));
const TeamManagementPage = lazy(() => import("@/app/pages/team-management-page").then(m => ({ default: m.TeamManagementPage })));

// Premium feature pages
const ActivityLogPage = lazy(() => import("@/app/pages/activity-log-page").then(m => ({ default: m.ActivityLogPage })));
const BudgetAlertsPage = lazy(() => import("@/app/pages/budget-alerts-page").then(m => ({ default: m.BudgetAlertsPage })));
const ReportsPage = lazy(() => import("@/app/pages/reports-page").then(m => ({ default: m.ReportsPage })));

// AWS Resource Management
const AWSResourcesPage = lazy(() => import("@/app/pages/aws-resources-page").then(m => ({ default: m.AWSResourcesPage })));

// Multi-cloud pages
const IntegrationsPage = lazy(() => import("@/app/pages/integrations-page").then(m => ({ default: m.IntegrationsPage })));
const GCPResourcesPage = lazy(() => import("@/app/pages/gcp-resources-page").then(m => ({ default: m.GCPResourcesPage })));
const AIUsagePage = lazy(() => import("@/app/pages/ai-usage-page").then(m => ({ default: m.AIUsagePage })));
const CostForecastPage = lazy(() => import("@/app/pages/cost-forecast-page").then(m => ({ default: m.CostForecastPage })));

// AI feature pages
const AnomalyPage = lazy(() => import("@/app/pages/anomaly-page").then(m => ({ default: m.AnomalyPage })));
const CloudQueryPage = lazy(() => import("@/app/pages/cloud-query-page").then(m => ({ default: m.CloudQueryPage })));

// Advanced feature pages
const TaggingPage = lazy(() => import("@/app/pages/tagging-page").then(m => ({ default: m.TaggingPage })));
const DriftPage = lazy(() => import("@/app/pages/drift-page").then(m => ({ default: m.DriftPage })));
const ResourceMapPage = lazy(() => import("@/app/pages/resource-map-page").then(m => ({ default: m.ResourceMapPage })));
const DependencyGraphPage = lazy(() => import("@/app/pages/dependency-graph-page").then(m => ({ default: m.DependencyGraphPage })));
const RBACPage = lazy(() => import("@/app/pages/rbac-page").then(m => ({ default: m.RBACPage })));
const DigestSettingsPage = lazy(() => import("@/app/pages/digest-settings-page").then(m => ({ default: m.DigestSettingsPage })));
const SavingsPage = lazy(() => import("@/app/pages/savings-page").then(m => ({ default: m.SavingsPage })));
const CLIGeneratorPage = lazy(() => import("@/app/pages/cli-generator-page").then(m => ({ default: m.CLIGeneratorPage })));
const BudgetActualsPage = lazy(() => import("@/app/pages/budget-actuals-page").then(m => ({ default: m.BudgetActualsPage })));
const CloudWaterfallPage = lazy(() => import("@/app/pages/cloud-waterfall-page").then(m => ({ default: m.CloudWaterfallPage })));


// Import layout and protected route
import { DashboardLayout } from "@/app/components/dashboard-layout";
import { ProtectedRoute } from "@/app/components/protected-route";

// Loading fallback component
function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}

// Wrap component with Suspense
function withSuspense(Component: React.ComponentType) {
    return (
        <Suspense fallback={<PageLoader />}>
            <Component />
        </Suspense>
    );
}

export const router = createBrowserRouter([
    // Public routes
    {
        path: "/",
        element: withSuspense(LandingPage),
    },
    {
        path: "/login",
        element: withSuspense(LoginPage),
    },
    {
        path: "/register",
        element: withSuspense(RegisterPage),
    },

    // Protected app routes
    {
        path: "/app",
        element: (
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: withSuspense(DashboardPage),
            },
            {
                path: "connect",
                element: withSuspense(AWSConnectPage),
            },
            {
                path: "iam-explainer",
                element: withSuspense(IAMExplainerPage),
            },
            {
                path: "reminders",
                element: withSuspense(RemindersPage),
            },
            {
                path: "settings",
                element: withSuspense(SettingsPage),
            },
            {
                path: "accounts",
                element: withSuspense(MultiAccountPage),
            },
            {
                path: "costs",
                element: withSuspense(CostBreakdownPage),
            },
            {
                path: "security",
                element: withSuspense(SecurityAuditPage),
            },
            {
                path: "team",
                element: withSuspense(TeamManagementPage),
            },
            {
                path: "activity",
                element: withSuspense(ActivityLogPage),
            },
            {
                path: "budgets",
                element: withSuspense(BudgetAlertsPage),
            },
            {
                path: "reports",
                element: withSuspense(ReportsPage),
            },
            {
                path: "aws-resources",
                element: withSuspense(AWSResourcesPage),
            },
            {
                path: "integrations",
                element: withSuspense(IntegrationsPage),
            },
            {
                path: "gcp-resources",
                element: withSuspense(GCPResourcesPage),
            },
            {
                path: "ai-usage",
                element: withSuspense(AIUsagePage),
            },
            {
                path: "cost-forecast",
                element: withSuspense(CostForecastPage),
            },
            {
                path: "anomalies",
                element: withSuspense(AnomalyPage),
            },
            {
                path: "cloud-query",
                element: withSuspense(CloudQueryPage),
            },
            // Advanced feature pages
            {
                path: "tagging",
                element: withSuspense(TaggingPage),
            },
            {
                path: "drift",
                element: withSuspense(DriftPage),
            },
            {
                path: "resource-map",
                element: withSuspense(ResourceMapPage),
            },
            {
                path: "dependency-graph",
                element: withSuspense(DependencyGraphPage),
            },
            {
                path: "rbac",
                element: withSuspense(RBACPage),
            },
            {
                path: "digest",
                element: withSuspense(DigestSettingsPage),
            },
            {
                path: "savings",
                element: withSuspense(SavingsPage),
            },
            {
                path: "cli",
                element: withSuspense(CLIGeneratorPage),
            },
            {
                path: "budget-actuals",
                element: withSuspense(BudgetActualsPage),
            },
            {
                path: "costs/waterfall",
                element: withSuspense(CloudWaterfallPage),
            },
        ],
    },


    // 404 catch-all
    {
        path: "/404",
        element: withSuspense(NotFoundPage),
    },
    {
        path: "*",
        element: <Navigate to="/404" replace />,
    },
]);
