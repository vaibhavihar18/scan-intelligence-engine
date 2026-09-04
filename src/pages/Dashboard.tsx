import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine,
  Camera,
  LogOut,
  Clock,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  User,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import { t, LANGUAGE_LABELS, type Language } from "@/lib/i18n";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const scans = useQuery(api.scanSessions.listUserScans);
  const [language, setLanguage] = useState<Language>("en");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const scoreColor = (score: number) => {
    if (score >= 7) return "text-green-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="text-[10px]">
            <CheckCircle className="mr-1 size-3" />
            {t("dashboard.completed", language)}
          </Badge>
        );
      case "analyzing":
        return (
          <Badge variant="secondary" className="text-[10px]">
            <Clock className="mr-1 size-3" />
            {t("dashboard.analyzing", language)}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="mr-1 size-3" />
            {t("dashboard.failed", language)}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => navigate("/")}
          >
            <div className="flex size-8 items-center justify-center rounded-lg ahar-gradient text-white">
              <ScanLine className="size-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              AHAR <span className="text-primary">X</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
              <Button key={code} variant={language === code ? "default" : "ghost"} size="sm" onClick={() => setLanguage(code)} className="text-xs gap-1 hidden sm:inline-flex">{label}</Button>
            ))}
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setLanguage(language === "en" ? "mr" : language === "mr" ? "hi" : "en")}><Globe className="size-4" /></Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2"
            >
              <User className="size-4" />
              {t("nav.profile", language)}
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user?.name ?? user?.email ?? "User"}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("dashboard.title", language)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.subtitle", language)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {scans && scans.length >= 2 && (
              <Button
                variant="outline"
                onClick={() => navigate("/compare")}
                className="gap-2"
              >
                {t("compare.title", language)}
              </Button>
            )}
            <Button
              onClick={() => navigate("/scan")}
              className="gap-2 ahar-gradient text-white hover:opacity-90"
            >
              <Camera className="size-4" />
              {t("nav.scan", language)}
            </Button>
          </div>
        </motion.div>

        {/* Scan list */}
        <div className="mt-8">
          {scans === undefined ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-muted-foreground text-sm">
                {t("dashboard.loading", language)}
              </div>
            </div>
          ) : scans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-20"
            >
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ScanLine className="size-8" />
              </div>
              <h2 className="text-lg font-semibold">{t("dashboard.noScans", language)}</h2>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                {t("dashboard.noScansDesc", language)}
              </p>
              <Button
                onClick={() => navigate("/scan")}
                className="mt-6 gap-2 ahar-gradient text-white hover:opacity-90"
              >
                <Camera className="size-4" />
                {t("dashboard.firstScan", language)}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan, i) => (
                <motion.div
                  key={scan._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="border-border/70 cursor-pointer transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                    onClick={() =>
                      navigate("/scan", {
                        state: { scanId: scan._id },
                      })
                    }
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
                        {scan.status === "completed" && scan.analysis ? (
                          <BarChart3 className="size-6 text-primary" />
                        ) : (
                          <ScanLine className="size-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {scan.productName ?? t("dashboard.unknownProduct", language)}
                          </p>
                          {statusBadge(scan.status)}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(scan.createdAt)}
                        </p>
                        {scan.status === "completed" && scan.analysis && (
                          <div className="mt-2 flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-sm font-bold ${scoreColor(
                                  scan.analysis.aharScore.overall,
                                )}`}
                              >
                                {scan.analysis.aharScore.overall}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                / 10
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              {scan.analysis.allergens.length > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px]"
                                >
                                  {scan.analysis.allergens.length} {scan.analysis.allergens.length !== 1 ? t("dashboard.allergens", language) : t("dashboard.allergen", language)}
                                </Badge>
                              )}
                              {scan.analysis.frontClaims.length > 0 && (
                                <Badge variant="secondary" className="text-[9px]">
                                  {scan.analysis.frontClaims.length} {scan.analysis.frontClaims.length !== 1 ? t("dashboard.claims", language) : t("dashboard.claim", language)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
