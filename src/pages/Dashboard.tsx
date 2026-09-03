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
} from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const scans = useQuery(api.scanSessions.listUserScans);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="text-[10px]">
            <CheckCircle className="mr-1 size-3" />
            Completed
          </Badge>
        );
      case "analyzing":
        return (
          <Badge variant="secondary" className="text-[10px]">
            <Clock className="mr-1 size-3" />
            Analyzing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="mr-1 size-3" />
            Failed
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
          <div className="flex items-center gap-3">
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
              Scan History
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your recent food label analyses
            </p>
          </div>
          <Button
            onClick={() => navigate("/scan")}
            className="gap-2 ahar-gradient text-white hover:opacity-90"
          >
            <Camera className="size-4" />
            New Scan
          </Button>
        </motion.div>

        {/* Scan list */}
        <div className="mt-8">
          {scans === undefined ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-muted-foreground text-sm">
                Loading scans...
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
              <h2 className="text-lg font-semibold">No scans yet</h2>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                Upload front and back images of any food product to get your
                first AHAR X analysis.
              </p>
              <Button
                onClick={() => navigate("/scan")}
                className="mt-6 gap-2 ahar-gradient text-white hover:opacity-90"
              >
                <Camera className="size-4" />
                Scan Your First Product
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
                            {scan.productName ?? "Unknown Product"}
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
                                /100
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              {scan.analysis.allergens.length > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px]"
                                >
                                  {scan.analysis.allergens.length} allergen
                                  {scan.analysis.allergens.length !== 1
                                    ? "s"
                                    : ""}
                                </Badge>
                              )}
                              {scan.analysis.frontClaims.length > 0 && (
                                <Badge variant="secondary" className="text-[9px]">
                                  {scan.analysis.frontClaims.length} claim
                                  {scan.analysis.frontClaims.length !== 1
                                    ? "s"
                                    : ""}
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
