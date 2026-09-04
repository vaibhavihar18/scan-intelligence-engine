import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanLine, LogOut, ArrowLeft, BarChart3, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { t, type Language, LANGUAGE_LABELS, PROFILE_LABELS, type ProfileCategory } from "@/lib/i18n";
import type { ScanAnalysis } from "@/types/ahar";
import type { Doc } from "@/convex/_generated/dataModel";

type ScanDoc = {
  _id: Doc<"scanSessions">["_id"];
  productName: string | null;
  status: string;
  profileCategory: string | null;
  language: string | null;
  createdAt: number;
  completedAt: number | null;
  analysis: ScanAnalysis | null;
};

export default function Compare() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const scans = useQuery(api.scanSessions.listUserScans);
  const [selectedA, setSelectedA] = useState<ScanDoc | null>(null);
  const [selectedB, setSelectedB] = useState<ScanDoc | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [profileCategory, setProfileCategory] = useState<ProfileCategory>("general");

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const completedScans = (scans ?? []).filter(
    (s: Record<string, unknown>) => s.status === "completed" && s.analysis
  ) as unknown as ScanDoc[];

  const nA = selectedA?.analysis?.nutrition;
  const nB = selectedB?.analysis?.nutrition;

  const tLang = (key: string) => t(key, language);

  const scoreColor = (s: number) => s >= 7 ? "text-green-600" : s >= 4 ? "text-amber-600" : "text-red-600";
  const betterFor = (a: number | null, b: number | null, lower: boolean) => {
    if (a == null || b == null) return null;
    return lower ? (a < b ? "a" : a > b ? "b" : null) : (a > b ? "a" : a < b ? "b" : null);
  };

  if (!selectedA || !selectedB) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}><ArrowLeft className="size-4" /></Button>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg ahar-gradient text-white"><ScanLine className="size-4" /></div>
                <span className="text-sm font-bold tracking-tight">AHAR <span className="text-primary">X</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                <Button key={code} variant={language === code ? "default" : "ghost"} size="sm" onClick={() => setLanguage(code)} className="text-xs gap-1 hidden sm:inline-flex">{label}</Button>
              ))}
              <span className="text-xs text-muted-foreground hidden sm:block">{user?.name ?? user?.email}</span>
              <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="size-4" /></Button>
            </div>
          </div>
        </nav>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl font-bold tracking-tight">{tLang("compare.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select two scanned products to compare them side by side.</p>
          {completedScans.length < 2 ? (
            <div className="mt-10 text-center">
              <p className="text-muted-foreground text-sm">You need at least 2 completed scans to compare.</p>
              <Button onClick={() => navigate("/scan")} className="mt-4 ahar-gradient text-white">Scan a Product</Button>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Product A</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {completedScans.map((s) => (
                    <button key={`a-${s._id}`} onClick={() => setSelectedA(s)} className={`rounded-xl border p-3 text-left transition-all ${selectedA?._id === s._id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <p className="text-sm font-medium truncate">{s.productName ?? "Unknown Product"}</p>
                      <p className="text-xs text-muted-foreground">{s.profileCategory ?? "general"} · {new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Product B</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {completedScans.filter((s) => s._id !== selectedA?._id).map((s) => (
                    <button key={`b-${s._id}`} onClick={() => setSelectedB(s)} className={`rounded-xl border p-3 text-left transition-all ${selectedB?._id === s._id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <p className="text-sm font-medium truncate">{s.productName ?? "Unknown Product"}</p>
                      <p className="text-xs text-muted-foreground">{s.profileCategory ?? "general"} · {new Date(s.createdAt).toLocaleDateString("en-IN")}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Comparison table
  const rows: { label: string; a: number | null; b: number | null; unit: string; lower?: boolean }[] = [
    { label: tLang("nutrition.calories"), a: nA?.calories ?? null, b: nB?.calories ?? null, unit: "kcal", lower: true },
    { label: tLang("nutrition.sugars"), a: nA?.sugars ?? null, b: nB?.sugars ?? null, unit: "g", lower: true },
    { label: tLang("nutrition.protein"), a: nA?.protein ?? null, b: nB?.protein ?? null, unit: "g", lower: false },
    { label: tLang("nutrition.fat"), a: nA?.fat ?? null, b: nB?.fat ?? null, unit: "g", lower: true },
    { label: tLang("nutrition.satFat"), a: nA?.saturatedFat ?? null, b: nB?.saturatedFat ?? null, unit: "g", lower: true },
    { label: tLang("nutrition.fibre"), a: nA?.fibre ?? null, b: nB?.fibre ?? null, unit: "g", lower: false },
    { label: tLang("nutrition.sodium"), a: nA?.sodium ?? null, b: nB?.sodium ?? null, unit: "mg", lower: true },
  ];

  const vaA = (selectedA.analysis as unknown as Record<string, unknown>)?.valueAnalysis as Record<string, unknown> | undefined;
  const vaB = (selectedB.analysis as unknown as Record<string, unknown>)?.valueAnalysis as Record<string, unknown> | undefined;

  const scoreA = selectedA.analysis?.aharScore?.overall ?? 0;
  const scoreB = selectedB.analysis?.aharScore?.overall ?? 0;

  // Determine overall winner
  const winner = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null;

  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedA(null); setSelectedB(null); }}><ArrowLeft className="size-4" /></Button>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg ahar-gradient text-white"><ScanLine className="size-4" /></div>
              <span className="text-sm font-bold tracking-tight">AHAR <span className="text-primary">X</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
              <Button key={code} variant={language === code ? "default" : "ghost"} size="sm" onClick={() => setLanguage(code)} className="text-xs gap-1 hidden sm:inline-flex">{label}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => navigate("/scan")} className="gap-2"><ScanLine className="size-4" />{tLang("nav.scan")}</Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold tracking-tight">{tLang("compare.title")}</h1>

          {/* Winner banner */}
          {winner && (
            <div className="mt-4 rounded-2xl border-2 border-green-400 bg-green-50 dark:bg-green-950/30 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">{tLang("compare.better")}: {winner === "a" ? (selectedA.productName ?? "Product A") : (selectedB.productName ?? "Product B")}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">AHAR X Score: {winner === "a" ? scoreA.toFixed(1) : scoreB.toFixed(1)} vs {winner === "a" ? scoreB.toFixed(1) : scoreA.toFixed(1)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Product headers */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase text-primary">Product A</p>
              <p className="text-sm font-semibold mt-1 truncate">{selectedA.productName ?? "Unknown"}</p>
              <p className={`text-2xl font-bold mt-2 ${scoreColor(scoreA)}`}>{scoreA.toFixed(1)}<span className="text-sm text-muted-foreground"> / 10</span></p>
            </div>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-bold uppercase text-primary">Product B</p>
              <p className="text-sm font-semibold mt-1 truncate">{selectedB.productName ?? "Unknown"}</p>
              <p className={`text-2xl font-bold mt-2 ${scoreColor(scoreB)}`}>{scoreB.toFixed(1)}<span className="text-sm text-muted-foreground"> / 10</span></p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-6 rounded-2xl border border-border/70 bg-card overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50">
              <div className="px-4 py-3">{tLang("nutrition.per")}</div>
              <div className="px-4 py-3 text-center">Product A</div>
              <div className="px-4 py-3 text-center">Product B</div>
            </div>
            {rows.map((row, i) => {
              const w = betterFor(row.a, row.b, !!row.lower);
              return (
                <div key={i} className={`grid grid-cols-3 text-sm border-b border-border/30 last:border-0 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <div className="px-4 py-3 font-medium">{row.label}</div>
                  <div className={`px-4 py-3 text-center font-semibold ${w === "a" ? "text-green-600 font-bold" : ""}`}>
                    {row.a !== null ? `${row.a}${row.unit}` : "—"}
                  </div>
                  <div className={`px-4 py-3 text-center font-semibold ${w === "b" ? "text-green-600 font-bold" : ""}`}>
                    {row.b !== null ? `${row.b}${row.unit}` : "—"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Category winners */}
          <div className="mt-6 rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Category Winners</h2>
            <div className="space-y-2">
              {rows.map((row, i) => {
                const w = betterFor(row.a, row.b, !!row.lower);
                if (w === null) return null;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {w === "a" ? <CheckCircle className="size-4 text-green-600 shrink-0" /> : <XCircle className="size-4 text-red-500 shrink-0" />}
                    <span className="text-muted-foreground">{row.label}:</span>
                    <span className="font-medium">{w === "a" ? (selectedA.productName ?? "A") : (selectedB.productName ?? "B")}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.lower ? tLang("compare.lower") : tLang("compare.higher")} ({w === "a" ? row.a : row.b}{row.unit})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Profile suitability comparison */}
          <div className="mt-6 rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Profile Suitability</h2>
            <div className="grid grid-cols-3 text-xs font-bold uppercase text-muted-foreground mb-2 border-b border-border/30 pb-2">
              <div>Profile</div>
              <div className="text-center">Product A</div>
              <div className="text-center">Product B</div>
            </div>
            {["general", "child", "fitness", "weight", "vegetarian", "highProtein"].map((prof) => {
              const suitA = selectedA.analysis?.suitability?.find((s) => s.profile === prof);
              const suitB = selectedB.analysis?.suitability?.find((s) => s.profile === prof);
              const emoji = (s: string | undefined) => s === "suitable" ? "🟢" : s === "use_caution" ? "🟡" : s === "not_recommended" ? "🔴" : "⚪";
              return (
                <div key={prof} className="grid grid-cols-3 text-sm py-2 border-b border-border/20 last:border-0">
                  <div className="font-medium">{PROFILE_LABELS[prof]?.[language] ?? prof}</div>
                  <div className="text-center">{emoji(suitA?.status)} {suitA?.status === "suitable" ? "Suitable" : suitA?.status === "use_caution" ? "Occasional" : suitA?.status === "not_recommended" ? "Not ideal" : "—"}</div>
                  <div className="text-center">{emoji(suitB?.status)} {suitB?.status === "suitable" ? "Suitable" : suitB?.status === "use_caution" ? "Occasional" : suitB?.status === "not_recommended" ? "Not ideal" : "—"}</div>
                </div>
              );
            })}
          </div>

          {/* Allergens comparison */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Allergens — A</p>
              {selectedA.analysis?.allergens?.length ? (
                <div className="flex flex-wrap gap-1">{selectedA.analysis.allergens.map((a, i) => <Badge key={i} variant="destructive" className="text-[10px]">{a}</Badge>)}</div>
              ) : <p className="text-xs text-muted-foreground">None detected</p>}
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Allergens — B</p>
              {selectedB.analysis?.allergens?.length ? (
                <div className="flex flex-wrap gap-1">{selectedB.analysis.allergens.map((a, i) => <Badge key={i} variant="destructive" className="text-[10px]">{a}</Badge>)}</div>
              ) : <p className="text-xs text-muted-foreground">None detected</p>}
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4 pb-10">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2"><BarChart3 className="size-4" />History</Button>
            <Button onClick={() => navigate("/scan")} className="gap-2 ahar-gradient text-white hover:opacity-90"><ScanLine className="size-4" />New Scan</Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
