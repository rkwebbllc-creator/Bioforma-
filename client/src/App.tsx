import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import {
  LayoutDashboard, Pill, ListChecks, UtensilsCrossed,
  Scale, Settings, ChevronRight, Zap, FlaskConical, BookOpen,
  Star, LogOut, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { AuthProvider, useAuth } from "@/lib/auth";
import { UpgradeModal, ProBadge } from "@/components/ProGate";

import Dashboard from "@/pages/Dashboard";
import Supplements from "@/pages/Supplements";
import Protocols from "@/pages/Protocols";
import Nutrition from "@/pages/Nutrition";
import BodyComposition from "@/pages/BodyComposition";
import SettingsPage from "@/pages/SettingsPage";
import PeptideCalculator from "@/pages/PeptideCalculator";
import Research from "@/pages/Research";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import ResetPassword from "@/pages/ResetPassword";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "hsl(142 65% 44%)", bg: "hsl(142 65% 44% / 0.12)" },
  { href: "/supplements", label: "Supplements", icon: Pill, color: "hsl(187 80% 50%)", bg: "hsl(187 80% 50% / 0.12)" },
  { href: "/protocols", label: "Protocols", icon: ListChecks, color: "hsl(270 60% 65%)", bg: "hsl(270 60% 65% / 0.12)" },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed, color: "hsl(32 95% 55%)", bg: "hsl(32 95% 55% / 0.12)" },
  { href: "/body", label: "Body Comp", icon: Scale, color: "hsl(220 80% 62%)", bg: "hsl(220 80% 62% / 0.12)" },
  { href: "/calculator", label: "Peptide Calc", icon: FlaskConical, color: "hsl(187 80% 50%)", bg: "hsl(187 80% 50% / 0.12)" },
  { href: "/research", label: "Research", icon: BookOpen, color: "hsl(46 95% 55%)", bg: "hsl(46 95% 55% / 0.12)" },
  { href: "/settings", label: "Settings", icon: Settings, color: "hsl(220 8% 55%)", bg: "hsl(220 8% 55% / 0.10)" },
];

function Sidebar() {
  const [loc] = useLocation();
  const { user, isPro, logout } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  // Avatar initials
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sidebar-border h-screen sticky top-0"
        style={{ background: "hsl(0 0% 4%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(142 65% 18%), hsl(142 65% 10%))",
              boxShadow: "0 0 0 1px hsl(142 65% 44% / 0.3), 0 4px 16px hsl(142 65% 44% / 0.2)",
            }}
          >
            <div className="absolute inset-0 rounded-xl" style={{ background: "radial-gradient(circle at 40% 30%, hsl(142 65% 44% / 0.3), transparent 70%)" }} />
            <svg aria-label="BioForma" viewBox="0 0 24 24" fill="none" className="w-5 h-5 relative z-10">
              <path d="M12 2.5 L19.5 6.75 L19.5 15.25 L12 19.5 L4.5 15.25 L4.5 6.75 Z"
                    stroke="hsl(142,72%,72%)" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
              <path d="M9.5 6.5 C10.5 9 8.5 12 9.5 15 C10 16.5 9 17.5 9.5 18.5"
                    stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
              <path d="M14.5 6.5 C13.5 9 15.5 12 14.5 15 C14 16.5 15 17.5 14.5 18.5"
                    stroke="hsl(142,72%,72%)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
              <line x1="9.8" y1="9.2" x2="14.2" y2="9.2" stroke="white" strokeWidth="0.9" opacity="0.6"/>
              <line x1="9.5" y1="12.5" x2="14.5" y2="12.5" stroke="white" strokeWidth="0.9" opacity="0.6"/>
              <line x1="9.8" y1="15.8" x2="14.2" y2="15.8" stroke="white" strokeWidth="0.9" opacity="0.6"/>
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.03em", lineHeight: 1 }}>
              <span style={{ color: "hsl(220 8% 60%)", fontWeight: 500 }}>Bio</span><span style={{ color: "hsl(142 65% 52%)", textShadow: "0 0 20px hsl(142 65% 44% / 0.5)" }}>Forma</span>
            </span>
            <span style={{ fontSize: "0.58rem", letterSpacing: "0.12em", color: "hsl(220 6% 38%)", fontWeight: 600, textTransform: "uppercase" }}>Biohacking Hub</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, color, bg }) => {
            const active = href === "/" ? loc === "/" : loc.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-180",
                  active
                    ? "text-foreground"
                    : "text-sidebar-foreground hover:text-foreground"
                )}
                style={
                  active
                    ? {
                        background: `linear-gradient(90deg, ${bg.replace("0.12)", "0.18)")}, ${bg.replace("0.12)", "0.06)")})`,
                        boxShadow: `inset 0 0 0 1px ${color.replace(")", " / 0.2)")}, 0 2px 12px hsl(0 0% 0% / 0.2)`,
                      }
                    : undefined
                }
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-180"
                  style={
                    active
                      ? { background: bg, boxShadow: `0 0 8px ${color.replace(")", " / 0.35)")}` }
                      : { background: "hsl(220 8% 10%)" }
                  }
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: active ? color : "hsl(220 6% 48%)" }}
                  />
                </div>
                <span className={active ? "font-semibold" : ""}>{label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color }} />}
              </Link>
            );
          })}
        </nav>

        {/* Footer: user info + optional upgrade */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
          {/* Legal links */}
          <div className="flex items-center gap-2 px-1 pb-0.5">
            <Link
              href="/privacy"
              className="text-[10px] transition-colors hover:underline"
              style={{ color: "hsl(220 6% 36%)", letterSpacing: "0.02em" }}
            >
              Privacy
            </Link>
            <span style={{ color: "hsl(220 6% 28%)" }} className="text-[10px]">·</span>
            <Link
              href="/terms"
              className="text-[10px] transition-colors hover:underline"
              style={{ color: "hsl(220 6% 36%)", letterSpacing: "0.02em" }}
            >
              Terms
            </Link>
          </div>
          {/* Upgrade to Pro button if free plan */}
          {!isPro && (
            <button
              onClick={() => setShowUpgrade(true)}
              data-testid="button-upgrade-sidebar"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, hsl(46 95% 55% / 0.12), hsl(32 95% 55% / 0.08))",
                border: "1px solid hsl(46 95% 55% / 0.2)",
                color: "hsl(46 95% 62%)",
                boxShadow: "0 2px 12px hsl(46 95% 55% / 0.08)",
              }}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.02em" }}>Upgrade to Pro</span>
            </button>
          )}

          {/* User avatar + name */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              data-testid="button-user-menu"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-white/5"
              style={{ border: "1px solid hsl(220 8% 14%)" }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  background: isPro
                    ? "linear-gradient(135deg, hsl(46 95% 55% / 0.2), hsl(32 95% 55% / 0.15))"
                    : "hsl(142 65% 44% / 0.15)",
                  color: isPro ? "hsl(46 95% 62%)" : "hsl(142 65% 52%)",
                  border: `1px solid ${isPro ? "hsl(46 95% 55% / 0.25)" : "hsl(142 65% 44% / 0.25)"}`,
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold" style={{ color: "hsl(220 8% 76%)", fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "-0.01em" }}>
                    {user?.name || "User"}
                  </p>
                  {isPro && <ProBadge />}
                </div>
                <p className="text-[10px] truncate" style={{ color: "hsl(220 6% 40%)" }}>{user?.email}</p>
              </div>
              <ChevronRight className="w-3 h-3 shrink-0 transition-transform" style={{ color: "hsl(220 6% 40%)", transform: showUserMenu ? "rotate(90deg)" : "none" }} />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden border"
                style={{ background: "hsl(220 8% 10%)", borderColor: "hsl(220 8% 18%)", boxShadow: "0 8px 32px hsl(0 0% 0% / 0.5)" }}
              >
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-white/5 transition-colors"
                  style={{ color: "hsl(220 8% 72%)" }}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  data-testid="button-logout"
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-white/5 transition-colors"
                  style={{ color: "hsl(4 72% 62%)" }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
}

function MobileNav() {
  const [loc] = useLocation();
  const mobileItems = NAV_ITEMS.slice(0, 5);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border flex"
         style={{ background: "hsl(0 0% 5%)", backdropFilter: "blur(16px)" }}>
      {mobileItems.map(({ href, label, icon: Icon, color }) => {
        const active = href === "/" ? loc === "/" : loc.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors"
            style={{ color: active ? color : "hsl(220 6% 40%)" }}
          >
            <Icon className="w-5 h-5" />
            <span className="hidden sm:block">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Auth-aware app shell ─────────────────────────────────────────────────────

function AppShell() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(0 0% 5%)" }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(142 65% 18%), hsl(142 65% 10%))", boxShadow: "0 0 0 1px hsl(142 65% 44% / 0.3)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 animate-pulse">
            <path d="M12 2.5 L19.5 6.75 L19.5 15.25 L12 19.5 L4.5 15.25 L4.5 6.75 Z" stroke="hsl(142,72%,72%)" strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
            <path d="M9.5 6.5 C10.5 9 8.5 12 9.5 15 C10 16.5 9 17.5 9.5 18.5" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
            <path d="M14.5 6.5 C13.5 9 15.5 12 14.5 15 C14 16.5 15 17.5 14.5 18.5" stroke="hsl(142,72%,72%)" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  // Not logged in: show auth routes (legal pages accessible without auth)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Logged in but onboarding not complete
  if (!user?.onboardingComplete) {
    return <Onboarding />;
  }

  // Fully authenticated: show main app
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0 overflow-x-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/supplements" component={Supplements} />
          <Route path="/protocols" component={Protocols} />
          <Route path="/nutrition" component={Nutrition} />
          <Route path="/body" component={BodyComposition} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/calculator" component={PeptideCalculator} />
          <Route path="/research" component={Research} />
          {/* Legal pages — publicly accessible */}
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          {/* Catch login/signup routes after auth — redirect to home */}
          <Route path="/login" component={Dashboard} />
          <Route path="/signup" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AppShell />
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
