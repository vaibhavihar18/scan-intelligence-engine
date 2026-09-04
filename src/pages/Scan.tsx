import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocation, useNavigate } from "react-router";
import { compressImage, validateImage } from "@/lib/imageCompress";
import { runOcrOnDataUrl } from "@/lib/ocr";
import { parseFrontOcr, parseBackOcr } from "@/lib/parseOcr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera, Upload, X, Loader2, ScanLine, CheckCircle, AlertTriangle,
  XCircle, Info, ChevronRight, History, LogOut, Globe, User,
  Package, IndianRupee, Calendar, Shield, Scale, Sparkles,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ScanAnalysis } from "@/types/ahar";
import type { Doc } from "@/convex/_generated/dataModel";
import { t, LANGUAGE_LABELS, PROFILE_LABELS, type Language, type ProfileCategory, PROFILE_CATEGORIES } from "@/lib/i18n";

type Step = "upload" | "analyzing" | "results";
const LOADING_STEPS = [
  "loading.uploading", "loading.frontRead", "loading.backRead",
  "loading.ingredients", "loading.nutrition", "loading.frontClaims",
  "loading.matching", "loading.rules", "loading.profile",
  "loading.score", "loading.explanation",
];
const PROFILE_OPTIONS = PROFILE_CATEGORIES.map((c) => ({ value: c, labelKey: `profile.${c}` as const }));

export default function Scan() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const createScanSession = useMutation(api.scanSessions.createScanSession);
  const runFullScan = useAction(api.runScan.runFullScan);
  const scanFromNav = (location.state as { scanId?: string } | null)?.scanId;
  const pastScan = useQuery(api.scanSessions.getScan, scanFromNav ? { docId: scanFromNav as Doc<"scanSessions">["_id"] } : "skip");

  const [step, setStep] = useState<Step>("upload");
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [profileCategory, setProfileCategory] = useState<ProfileCategory>("general");
  const [language, setLanguage] = useState<Language>("en");
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanDate, setScanDate] = useState<number | null>(null);
  const [showDetailedEvidence, setShowDetailedEvidence] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pastScan && pastScan.status === "completed" && pastScan.analysis) {
      setAnalysis(pastScan.analysis as unknown as ScanAnalysis);
      setScanId(pastScan._id);
      setScanDate(pastScan.completedAt ?? pastScan.createdAt);
      if (pastScan.profileCategory) setProfileCategory(pastScan.profileCategory as ProfileCategory);
      if (pastScan.language) setLanguage(pastScan.language as Language);
      setStep("results");
    }
  }, [pastScan]);

  const handleFileSelect = useCallback((file: File, side: "front" | "back") => {
    const err = validateImage(file);
    if (err) { setError(err); return; }
    const url = URL.createObjectURL(file);
    if (side === "front") { setFrontImage(file); setFrontPreview(url); }
    else { setBackImage(file); setBackPreview(url); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, side: "front" | "back") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFileSelect(file, side);
  }, [handleFileSelect]);

  const handleScan = async () => {
    if (!frontImage || !backImage) return;
    setStep("analyzing"); setProgress(0); setLoadingStep(0); setError(null);
    try {
      setLoadingStep(0); setProgress(5);
      const frontDataUrl = await compressImage(frontImage);
      setLoadingStep(1); setProgress(15);
      const backDataUrl = await compressImage(backImage);

      setLoadingStep(2); setProgress(25);
      let ocrFrontText = "", ocrBackText = "";
      try {
        setLoadingStep(3); setProgress(30);
        ocrFrontText = await runOcrOnDataUrl(frontDataUrl);
        setLoadingStep(4); setProgress(40);
        ocrBackText = await runOcrOnDataUrl(backDataUrl);
      } catch (ocrErr) { console.error("[AHAR X] OCR failed:", ocrErr); }

      setLoadingStep(5); setProgress(50);
      const ocrFront = parseFrontOcr(ocrFrontText);
      const ocrBack = parseBackOcr(ocrBackText);

      setLoadingStep(6); setProgress(55);
      const { sessionId, docId } = await createScanSession({
        frontImageId: `ocr_front_${Date.now()}`,
        backImageId: `ocr_back_${Date.now()}`,
        profileCategory,
        language,
      });
      setScanId(sessionId);

      setLoadingStep(7); setProgress(65);
      const result = await runFullScan({
        docId, scanSessionId: sessionId,
        frontImageUrl: frontDataUrl, backImageUrl: backDataUrl,
        profileCategory, ocrFront, ocrBack,
      });

      setLoadingStep(10); setProgress(100);
      setAnalysis(result as unknown as ScanAnalysis);
      setScanDate(Date.now());
      setStep("results");
    } catch (err) {
      console.error("Scan failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Not authenticated")) setError("Please sign in to analyze products.");
      else setError("Analysis encountered an issue. Please try again.");
      setStep("upload");
    }
  };

  const handleReset = () => {
    setFrontImage(null); setBackImage(null); setFrontPreview(null); setBackPreview(null);
    setAnalysis(null); setError(null); setProgress(0); setLoadingStep(0); setScanId(null); setScanDate(null); setStep("upload");
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusText = (s: string) => {
    if (s === "match_confirmed") return t("status.confirmed", language);
    if (s === "percentage_not_stated") return t("status.percentNotDeclared", language);
    if (s === "potential_inconsistency") return t("status.potentialInconsistency", language);
    if (s === "insufficient_evidence") return t("status.insufficientEvidence", language);
    return s;
  };

  const tLang = (key: string) => t(key, language);

  return (
    <main className="min-h-screen bg-background">
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex cursor-pointer items-center gap-2" onClick={handleReset}>
            <div className="flex size-8 items-center justify-center rounded-lg ahar-gradient text-white"><ScanLine className="size-4" /></div>
            <span className="text-sm font-bold tracking-tight">AHAR <span className="text-primary">X</span></span>
          </div>
          <div className="flex items-center gap-2">
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
              <Button key={code} variant={language === code ? "default" : "ghost"} size="sm" onClick={() => setLanguage(code)} className="text-xs gap-1 hidden sm:inline-flex">{label}</Button>
            ))}
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setLanguage(language === "en" ? "mr" : language === "mr" ? "hi" : "en")}><Globe className="size-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2"><History className="size-4" />{tLang("nav.history")}</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="gap-2"><User className="size-4" />{tLang("nav.profile")}</Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.name ?? user?.email ?? "User"}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* ════════════════════════════════════════════
            UPLOAD STEP
            ════════════════════════════════════════════ */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tLang("scan.title")}</h1>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">{tLang("scan.desc")}</p>
            </div>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-medium mr-2">{tLang("scan.selectProfile")}:</span>
              {PROFILE_OPTIONS.map((opt) => (
                <Button key={opt.value} variant={profileCategory === opt.value ? "default" : "outline"} size="sm" onClick={() => setProfileCategory(opt.value)} className="text-xs">
                  {PROFILE_LABELS[opt.value]?.[language] ?? opt.value}
                </Button>
              ))}
            </div>
            {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Front upload */}
              <div className="relative rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/40 hover:bg-muted/30 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "front")} onClick={() => frontInputRef.current?.click()}>
                <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, "front"); }} />
                {frontPreview ? (<><img src={frontPreview} alt="Front" className="w-full h-56 object-contain rounded-lg" /><button onClick={(e) => { e.stopPropagation(); setFrontImage(null); setFrontPreview(null); }} className="absolute top-3 right-3 rounded-full bg-background/80 p-1"><X className="size-4" /></button><p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="size-4" />{tLang("scan.frontUploaded")}</p></>)
                : (<div className="flex flex-col items-center py-8"><div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Camera className="size-6" /></div><p className="text-sm font-medium">{tLang("scan.front")}</p><p className="mt-1 text-xs text-muted-foreground">{tLang("scan.frontDesc")}</p></div>)}
              </div>
              {/* Back upload */}
              <div className="relative rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/40 hover:bg-muted/30 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "back")} onClick={() => backInputRef.current?.click()}>
                <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, "back"); }} />
                {backPreview ? (<><img src={backPreview} alt="Back" className="w-full h-56 object-contain rounded-lg" /><button onClick={(e) => { e.stopPropagation(); setBackImage(null); setBackPreview(null); }} className="absolute top-3 right-3 rounded-full bg-background/80 p-1"><X className="size-4" /></button><p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="size-4" />{tLang("scan.backUploaded")}</p></>)
                : (<div className="flex flex-col items-center py-8"><div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload className="size-6" /></div><p className="text-sm font-medium">{tLang("scan.back")}</p><p className="mt-1 text-xs text-muted-foreground">{tLang("scan.backDesc")}</p></div>)}
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <Button onClick={handleScan} disabled={!frontImage || !backImage} size="lg" className="gap-2 rounded-full px-8 ahar-gradient text-white hover:opacity-90">
                <ScanLine className="size-5" />{tLang("scan.analyze")}<ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground/60">{tLang("scan.disclaimer")}</p>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════
            ANALYZING STEP
            ════════════════════════════════════════════ */}
        {step === "analyzing" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-20">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl ahar-gradient text-white"><Loader2 className="size-8 animate-spin" /></div>
            <h2 className="text-xl font-bold">{tLang("scan.analyze")}</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{tLang(LOADING_STEPS[loadingStep] ?? "loading.uploading")}</p>
            <div className="mt-8 w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <div className="mt-3 space-y-1">
                {LOADING_STEPS.slice(0, loadingStep + 1).map((sk, i) => (
                  <div key={sk} className="flex items-center gap-2 text-xs">
                    {i < loadingStep ? <CheckCircle className="size-3 text-green-600 shrink-0" /> : <Loader2 className="size-3 animate-spin text-primary shrink-0" />}
                    <span className={i < loadingStep ? "text-muted-foreground" : "text-foreground font-medium"}>{tLang(sk)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════
            RESULTS STEP — SIH-READY
            ════════════════════════════════════════════ */}
        {step === "results" && analysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{tLang("result.title")}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {scanId && <span>{tLang("result.scanId")}: {scanId.slice(0, 20)}...</span>}
                  {scanDate && <span>{tLang("result.date")}: {formatDate(scanDate)}</span>}
                  <span>{tLang("result.profile")}: {PROFILE_LABELS[profileCategory]?.[language] ?? profileCategory}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2"><History className="size-4" />{tLang("nav.history")}</Button>
                <Button onClick={handleReset} className="gap-2 ahar-gradient text-white hover:opacity-90"><ScanLine className="size-4" />{tLang("scan.newScan")}</Button>
              </div>
            </div>

            {/* ════════════════════════════════════════════
                1. BIG SIMPLE VERDICT — First thing judge sees
                ════════════════════════════════════════════ */}
            {(() => {
              const hasMatch = analysis.ingredientVerifications.some(v => v.status === "match_confirmed");
              const hasInconsistency = analysis.ingredientVerifications.some(v => v.status === "potential_inconsistency");
              const hasEvidence = analysis.backIngredients.length > 0 || analysis.frontClaims.length > 0;
              const score = analysis.aharScore.overall;
              const currentSuit = analysis.suitability.find(s => s.profile === profileCategory);

              let verdictEmoji: string, verdictText: string, verdictColor: string, verdictBorder: string, verdictBg: string;
              if (!hasEvidence) { verdictEmoji = "⚪"; verdictText = tLang("verdict.insufficient"); verdictColor = "text-gray-600 dark:text-gray-400"; verdictBorder = "border-gray-400 dark:border-gray-700"; verdictBg = "bg-gray-50 dark:bg-gray-950/30"; }
              else if (currentSuit?.status === "not_recommended") { verdictEmoji = "🔴"; verdictText = tLang("verdict.notGoodChoice"); verdictColor = "text-red-600"; verdictBorder = "border-red-400"; verdictBg = "bg-red-50 dark:bg-red-950/30"; }
              else if (hasInconsistency) { verdictEmoji = "🟡"; verdictText = tLang("verdict.occasional"); verdictColor = "text-amber-600"; verdictBorder = "border-amber-400"; verdictBg = "bg-amber-50 dark:bg-amber-950/30"; }
              else if (score >= 6) { verdictEmoji = "🟢"; verdictText = tLang("verdict.goodChoice"); verdictColor = "text-green-600"; verdictBorder = "border-green-400"; verdictBg = "bg-green-50 dark:bg-green-950/30"; }
              else { verdictEmoji = "🟡"; verdictText = tLang("verdict.occasional"); verdictColor = "text-amber-600"; verdictBorder = "border-amber-400"; verdictBg = "bg-amber-50 dark:bg-amber-950/30"; }

              // Generate short "why" points
              const whyPoints: string[] = [];
              if (analysis.nutrition.sugars !== null && analysis.nutrition.sugars > 15) whyPoints.push(`${tLang("analysis.sugar")}: ${analysis.nutrition.sugars}g — ${language === "mr" ? "जास्त" : language === "hi" ? "अधिक" : "high"}`);
              if (analysis.nutrition.protein !== null && analysis.nutrition.protein >= 10) whyPoints.push(`${tLang("analysis.protein")}: ${analysis.nutrition.protein}g — ${language === "mr" ? "चांगले" : language === "hi" ? "अच्छा" : "good"}`);
              if (hasInconsistency) whyPoints.push(`${language === "mr" ? "समोर दावा पडताळला नाही" : language === "hi" ? "सामने का दावा सत्यापित नहीं" : "Front claim not verified"}`);
              if (analysis.allergens.length > 0) whyPoints.push(`${tLang("allergen.contains")}: ${analysis.allergens.slice(0, 3).join(", ")}`);
              if (analysis.nutrition.calories !== null && analysis.nutrition.calories > 300) whyPoints.push(`${tLang("analysis.calories")}: ${analysis.nutrition.calories} kcal — ${language === "mr" ? "जास्त" : language === "hi" ? "अधिक" : "high"}`);

              return (
                <div className={`rounded-2xl border-2 ${verdictBorder} ${verdictBg} p-6 sm:p-8`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{tLang("verdict.yourResult")}</p>
                  {analysis.productName && <p className="text-lg font-bold mb-1">{analysis.productName}{analysis.brand ? ` — ${analysis.brand}` : ""}</p>}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-5xl font-extrabold">{analysis.aharScore.overall.toFixed(1)}<span className="text-lg font-normal text-muted-foreground"> / 10</span></span>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${verdictColor}`}>
                    <span className="text-xl">{verdictEmoji}</span> {verdictText}
                  </div>
                  {whyPoints.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{tLang("verdict.oneLineVerdict")}</p>
                      {whyPoints.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-primary">•</span> <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ════════════════════════════════════════════
                2. CLAIM CHECK — What the Front Says vs Back
                ════════════════════════════════════════════ */}
            {analysis.ingredientVerifications.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">🔍 {tLang("section.verification")}</h2>
                <div className="space-y-3">
                  {analysis.ingredientVerifications.map((v, i) => {
                    const emoji = v.status === "match_confirmed" ? "✅" : v.status === "percentage_not_stated" ? "⚠️" : v.status === "potential_inconsistency" ? "⚠️" : "❓";
                    const statusLabel = statusText(v.status);
                    const statusColor = v.status === "match_confirmed" ? "text-green-700 dark:text-green-400" : v.status === "percentage_not_stated" ? "text-amber-700 dark:text-amber-400" : v.status === "potential_inconsistency" ? "text-red-700 dark:text-red-400" : "text-muted-foreground";
                    return (
                      <div key={i} className="rounded-xl border border-border/50 p-4 bg-background/50">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">{emoji}</span>
                          <span className="font-bold text-base">{v.ingredient}</span>
                          <Badge variant="outline" className={`text-xs ml-auto ${statusColor}`}>{statusLabel}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
                            <p className="font-semibold text-muted-foreground mb-1">{tLang("evidence.front")}</p>
                            <p>{v.frontClaimed ? (language === "mr" ? "✅ समोर दावा दिसतो" : language === "hi" ? "✅ सामने दावा दिखता है" : "✅ Claimed on front") : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
                            <p className="font-semibold text-muted-foreground mb-1">{tLang("evidence.back")}</p>
                            <p>{v.backFound ? (v.declaredPercentage ? `✅ ${language === "mr" ? "सापडला" : language === "hi" ? "मिला" : "Found"} — ${v.declaredPercentage}` : `✅ ${language === "mr" ? "सापडला — टक्केवारी नाही" : language === "hi" ? "मिला — प्रतिशत नहीं" : "Found — percentage not declared"}`) : (language === "mr" ? "❌ स्पष्ट Ingredients यादीमध्ये सापडले नाही" : language === "hi" ? "❌ पढ़ी जा सकने वाली Ingredients list में नहीं मिला" : "❌ Not found in readable ingredient list")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground/70 italic">{tLang("limitations.noLab")}</p>
              </div>
            )}

            {/* ════════════════════════════════════════════
                3. INGREDIENTS
                ════════════════════════════════════════════ */}
            {analysis.backIngredients.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">📦 {tLang("section.ingredients")}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.backIngredients.map((ing, i) => {
                    const isMatched = analysis.ingredientVerifications.some(v => v.ingredient.toLowerCase() === ing.toLowerCase() && v.status === "match_confirmed");
                    const pct = analysis.backIngredientPercentages[ing];
                    return (
                      <span key={i} className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${isMatched ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>{ing}{pct && <span className="ml-1 text-primary font-semibold">{pct}</span>}</span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                4. ALLERGEN ALERT
                ════════════════════════════════════════════ */}
            {analysis.allergens.length > 0 && (
              <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="size-5 text-red-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-red-700 dark:text-red-400">🚨 {tLang("allergen.alert")}</h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">{analysis.allergens.map((a, i) => <Badge key={i} variant="destructive" className="text-sm">{a}</Badge>)}</div>
                <p className="text-xs text-red-600 dark:text-red-400">{tLang("allergen.warningText")}</p>
              </div>
            )}

            {/* ════════════════════════════════════════════
                5. PACKAGING INFO
                ════════════════════════════════════════════ */}
            {(analysis.packaging?.mrp || analysis.packaging?.netQuantity || analysis.packaging?.fssaiLicense || analysis.packaging?.bestBefore) && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">📦 {language === "mr" ? "पॅकेज माहिती" : language === "hi" ? "पैकेजिंग जानकारी" : "PACKAGE INFORMATION"}</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {analysis.packaging?.mrp && <div className="flex items-center gap-2"><IndianRupee className="size-4 text-primary" /><span>MRP: ₹{analysis.packaging.mrp}</span></div>}
                  {analysis.packaging?.netQuantity && <div className="flex items-center gap-2"><Package className="size-4 text-primary" /><span>{analysis.packaging.netQuantity}</span></div>}
                  {analysis.packaging?.bestBefore && <div className="flex items-center gap-2"><Calendar className="size-4 text-primary" /><span>BB: {analysis.packaging.bestBefore}</span></div>}
                  {analysis.packaging?.fssaiLicense && <div className="flex items-center gap-2"><Shield className="size-4 text-primary" /><span>FSSAI: {analysis.packaging.fssaiLicense}</span></div>}
                  {analysis.packaging?.batchNumber && <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Batch: {analysis.packaging.batchNumber}</span></div>}
                  {analysis.packaging?.vegetarianMark && <div className="flex items-center gap-2"><span>{analysis.packaging.vegetarianMark === "veg" ? "🟢 Veg" : "🔴 Non-Veg"}</span></div>}
                </div>
                {/* Date check */}
                {analysis.dateCheck && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs">
                    <span className="font-semibold">📅 {language === "mr" ? "तारीख तपासणी" : language === "hi" ? "तिथि जाँच" : "Date Check"}: </span>
                    <span className={analysis.dateCheck.status === "within_date" ? "text-green-600" : analysis.dateCheck.status === "near_expiry" ? "text-amber-600" : analysis.dateCheck.status === "past_expiry" ? "text-red-600" : "text-muted-foreground"}>
                      {analysis.dateCheck.explanation}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════
                6. NUTRITION
                ════════════════════════════════════════════ */}
            {(analysis.nutrition.calories !== null || analysis.nutrition.protein !== null || analysis.nutrition.sugars !== null) && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  📊 {tLang("section.nutrition")}
                  {analysis.nutrition.servingSize && <span className="ml-2 text-xs font-normal">({tLang("nutrition.per")} {analysis.nutrition.servingSize})</span>}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: tLang("nutrition.calories"), value: analysis.nutrition.calories, unit: "kcal", emoji: "🔥" },
                    { label: tLang("nutrition.sugars"), value: analysis.nutrition.sugars, unit: "g", emoji: "🍬" },
                    { label: tLang("nutrition.protein"), value: analysis.nutrition.protein, unit: "g", emoji: "💪" },
                    { label: tLang("nutrition.fat"), value: analysis.nutrition.fat, unit: "g", emoji: "🧈" },
                    { label: tLang("nutrition.satFat"), value: analysis.nutrition.saturatedFat, unit: "g", emoji: "⚠️" },
                    { label: tLang("nutrition.carbs"), value: analysis.nutrition.carbohydrates, unit: "g", emoji: "🌾" },
                    { label: tLang("nutrition.sodium"), value: analysis.nutrition.sodium, unit: "mg", emoji: "🧂" },
                    { label: tLang("nutrition.fibre"), value: analysis.nutrition.fibre, unit: "g", emoji: "🥬" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm text-muted-foreground">{item.emoji} {item.label}</span>
                      <span className="text-sm font-bold">{item.value !== null ? `${item.value}${item.unit}` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                7. VALUE ANALYSIS
                ════════════════════════════════════════════ */}
            {(analysis.valueAnalysis?.pricePer100g !== null || analysis.valueAnalysis?.pricePerServing !== null) && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">💰 {language === "mr" ? "मूल्य विश्लेषण" : language === "hi" ? "मूल्य विश्लेषण" : "VALUE ANALYSIS"}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {analysis.valueAnalysis?.mrp && <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-xs text-muted-foreground">MRP</p><p className="text-sm font-bold">₹{analysis.valueAnalysis.mrp}</p></div>}
                  {analysis.valueAnalysis?.netQuantityGrams && <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-xs text-muted-foreground">{language === "mr" ? "वजन" : language === "hi" ? "वज़न" : "Weight"}</p><p className="text-sm font-bold">{analysis.valueAnalysis.netQuantityGrams}g</p></div>}
                  {analysis.valueAnalysis?.pricePer100g && <div className="rounded-lg bg-primary/5 px-3 py-2 border border-primary/10"><p className="text-xs text-muted-foreground">₹/100g</p><p className="text-sm font-bold">₹{analysis.valueAnalysis.pricePer100g}</p></div>}
                  {analysis.valueAnalysis?.pricePerServing && <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-xs text-muted-foreground">₹/serving</p><p className="text-sm font-bold">₹{analysis.valueAnalysis.pricePerServing}</p></div>}
                  {analysis.valueAnalysis?.caloriesPerRupee && <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-xs text-muted-foreground">kcal/₹</p><p className="text-sm font-bold">{analysis.valueAnalysis.caloriesPerRupee}</p></div>}
                  {analysis.valueAnalysis?.proteinPerRupee && <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-xs text-muted-foreground">g protein/₹</p><p className="text-sm font-bold">{analysis.valueAnalysis.proteinPerRupee}</p></div>}
                </div>
                {analysis.valueAnalysis?.servingCostNote && <p className="mt-3 text-[11px] text-muted-foreground/70 italic">{analysis.valueAnalysis.servingCostNote}</p>}
              </div>
            )}

            {/* ════════════════════════════════════════════
                8. LABEL TRUST CHECK
                ════════════════════════════════════════════ */}
            {analysis.labelTrust && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">🔎 {language === "mr" ? "लेबल विश्वासार्हता तपासणी" : language === "hi" ? "लेबल विश्वास जाँच" : "LABEL TRUST CHECK"}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold ${
                    analysis.labelTrust.overallStatus === "consistent" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : analysis.labelTrust.overallStatus === "needs_attention" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                  }`}>
                    {analysis.labelTrust.overallStatus === "consistent" ? "🟢" : analysis.labelTrust.overallStatus === "needs_attention" ? "🟡" : "⚪"}
                    {analysis.labelTrust.overallStatus === "consistent" ? (language === "mr" ? "सुसंगत" : language === "hi" ? "सुसंगत" : "CONSISTENT")
                      : analysis.labelTrust.overallStatus === "needs_attention" ? (language === "mr" ? "लक्ष द्या" : language === "hi" ? "ध्यान दें" : "NEEDS ATTENTION")
                      : (language === "mr" ? "अपुरा पुरावा" : language === "hi" ? "अपर्याप्त सबूत" : "INSUFFICIENT EVIDENCE")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.labelTrust.summary}</p>
              </div>
            )}

            {/* ════════════════════════════════════════════
                9. SUITABILITY GRID
                ════════════════════════════════════════════ */}
            {analysis.suitability.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">👤 {tLang("suitability.gridTitle")}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {analysis.suitability.map((s, i) => {
                    const emoji = s.status === "suitable" ? "🟢" : s.status === "use_caution" ? "🟡" : s.status === "not_recommended" ? "🔴" : "⚪";
                    const shortLabel = (
                      s.profile === "child" ? `👧 ${tLang("suitability.child")}` :
                      s.profile === "general" ? `👨 ${tLang("suitability.adult")}` :
                      s.profile === "fitness" ? `🏃 ${tLang("suitability.fitness")}` :
                      s.profile === "weight" ? `⚖️ ${tLang("suitability.weight")}` :
                      s.profile === "vegetarian" ? `🥗 ${tLang("suitability.veg")}` :
                      `💪 ${tLang("suitability.highProtein")}`
                    );
                    const isActive = s.profile === profileCategory;
                    return (
                      <div key={i} className={`rounded-xl p-3 border ${isActive ? "border-primary/40 bg-primary/5" : "border-border/50 bg-background/50"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <span className="font-medium text-sm">{shortLabel}</span>
                          {isActive && <Badge variant="default" className="text-[10px] ml-auto">{language === "mr" ? "तुमची प्रोफाइल" : language === "hi" ? "आपकी प्रोफ़ाइल" : "Your profile"}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-7">{s.reasons[0] ?? (language === "mr" ? "माहिती अपुरी" : language === "hi" ? "जानकारी अपर्याप्त" : "Insufficient evidence")}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                10. AHAR X SCORE
                ════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 overflow-hidden">
              <div className="ahar-gradient px-6 py-5">
                <p className="text-sm font-medium text-white/80">⭐ {tLang("score.heading")}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-white">{analysis.aharScore.overall.toFixed(1)}</p>
                  <span className="text-lg font-normal text-white/60">/ 10</span>
                </div>
                <p className="mt-1 text-xs text-white/60">{tLang("score.basedOn")}</p>
              </div>
              <div className="px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">➕ {tLang("score.increasing")}</p>
                    {analysis.aharScore.factors.filter(f => f.impact === "positive").map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <CheckCircle className="size-3 text-green-600 shrink-0" /><span>{f.label}: {f.value}</span>
                        <span className="ml-auto text-green-600 font-medium">+{f.delta.toFixed(1)}</span>
                      </div>
                    ))}
                    {analysis.aharScore.factors.filter(f => f.impact === "positive").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">➖ {tLang("score.decreasing")}</p>
                    {analysis.aharScore.factors.filter(f => f.impact === "negative").map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <XCircle className="size-3 text-red-600 shrink-0" /><span>{f.label}: {f.value}</span>
                        <span className="ml-auto text-red-600 font-medium">{f.delta.toFixed(1)}</span>
                      </div>
                    ))}
                    {analysis.aharScore.factors.filter(f => f.impact === "negative").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">ℹ️ {tLang("score.unavailable")}</p>
                    {analysis.aharScore.factors.filter(f => f.impact === "unavailable").map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <Info className="size-3 text-muted-foreground shrink-0" /><span>{f.label}</span>
                      </div>
                    ))}
                    {analysis.aharScore.factors.filter(f => f.impact === "unavailable").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════
                11. IN SIMPLE WORDS
                ════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">💬 {tLang("simpleWords.title")}</h2>
              <p className="text-sm leading-relaxed text-foreground/80">{analysis.simpleExplanation}</p>
            </div>

            {/* ════════════════════════════════════════════
                12. CONCERN RADAR
                ════════════════════════════════════════════ */}
            {(() => {
              const concerns: { icon: string; label: string; detail: string; level: 'high' | 'medium' | 'low' }[] = [];
              const n = analysis.nutrition;
              if (n.sugars !== null && n.sugars > 15) concerns.push({ icon: '🍬', label: tLang('concern.highSugar'), detail: `${n.sugars}g per serving`, level: 'high' });
              else if (n.sugars !== null && n.sugars <= 5) concerns.push({ icon: '🍬', label: tLang('concern.lowSugar'), detail: `${n.sugars}g per serving`, level: 'low' });
              if (n.sodium !== null && n.sodium > 400) concerns.push({ icon: '🧂', label: tLang('concern.highSodium'), detail: `${n.sodium}mg per serving`, level: 'high' });
              if (n.saturatedFat !== null && n.saturatedFat > 5) concerns.push({ icon: '⚠️', label: tLang('concern.highSatFat'), detail: `${n.saturatedFat}g per serving`, level: 'medium' });
              if (n.protein !== null && n.protein < 3) concerns.push({ icon: '💪', label: tLang('concern.lowProtein'), detail: `${n.protein}g per serving`, level: 'medium' });
              if (n.fibre !== null && n.fibre < 2) concerns.push({ icon: '🌾', label: tLang('concern.lowFibre'), detail: `${n.fibre}g per serving`, level: 'low' });
              if (n.calories !== null && n.calories > 300) concerns.push({ icon: '🔥', label: tLang('concern.highCalories'), detail: `${n.calories} kcal per serving`, level: 'medium' });
              if (analysis.allergens.length > 0) concerns.push({ icon: '🚨', label: tLang('concern.allergens'), detail: analysis.allergens.join(', '), level: 'high' });
              if (concerns.length === 0 && (n.calories !== null || n.protein !== null)) {
                return (
                  <div className="rounded-2xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-green-700 dark:text-green-400 mb-3">🔍 {tLang('concern.radar')}</h2>
                    <p className="text-sm text-green-700 dark:text-green-400">{tLang('concern.noConcerns')}</p>
                  </div>
                );
              }
              if (concerns.length === 0) return null;
              return (
                <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-3">🔍 {tLang('concern.radar')}</h2>
                  <div className="space-y-2">
                    {concerns.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-white/50 dark:bg-black/20 p-3">
                        <span className="text-lg shrink-0">{c.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{c.label}</p>
                          <p className="text-xs text-muted-foreground">{c.detail}</p>
                        </div>
                        <span className={`text-xs font-medium shrink-0 ${c.level === 'high' ? 'text-red-600' : c.level === 'medium' ? 'text-amber-600' : 'text-muted-foreground'}`}>{c.level === 'high' ? '⚠️' : c.level === 'medium' ? '🟡' : 'ℹ️'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ════════════════════════════════════════════
                13. PACKAGE INTELLIGENCE
                ════════════════════════════════════════════ */}
            {(() => {
              const pkg = (analysis as unknown as Record<string, unknown>).packaging as Record<string, unknown> | undefined;
              if (!pkg) return null;
              const items: { label: string; value: string | number | null }[] = [];
              if (pkg.mrp) items.push({ label: 'MRP', value: `₹${pkg.mrp}` });
              if (pkg.netQuantity) items.push({ label: tLang('pkg.netQty'), value: String(pkg.netQuantity) });
              if (pkg.manufacturer) items.push({ label: tLang('pkg.manufacturer'), value: String(pkg.manufacturer) });
              if (pkg.fssaiLicense) items.push({ label: 'FSSAI', value: String(pkg.fssaiLicense) });
              if (pkg.batchNumber) items.push({ label: tLang('pkg.batch'), value: String(pkg.batchNumber) });
              if (pkg.mfgDate) items.push({ label: tLang('pkg.mfgDate'), value: String(pkg.mfgDate) });
              if (pkg.bestBefore) items.push({ label: tLang('pkg.bestBefore'), value: String(pkg.bestBefore) });
              if (pkg.vegetarianMark) items.push({ label: tLang('pkg.vegMark'), value: pkg.vegetarianMark === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian' });
              if (analysis.brand) items.push({ label: tLang('pkg.brand'), value: analysis.brand });
              if (items.length === 0) return null;
              return (
                <div className="rounded-2xl border border-border/70 bg-card p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">📦 {tLang('pkg.title')}</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {items.map((item, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">{item.label}</p>
                        <p className="text-sm font-semibold truncate" title={String(item.value)}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ════════════════════════════════════════════
                14. VALUE ANALYSIS
                ════════════════════════════════════════════ */}
            {(() => {
              const va = (analysis as unknown as Record<string, unknown>).valueAnalysis as Record<string, unknown> | undefined;
              if (!va || !va.pricePer100g) return null;
              return (
                <div className="rounded-2xl border border-border/70 bg-card p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">💰 {tLang('value.title')}</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">{tLang('value.per100g')}</p>
                      <p className="text-lg font-bold">₹{`${va.pricePer100g}`}</p>
                    </div>
                    {!!va.pricePerServing && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">{tLang('value.perServing')}</p>
                        <p className="text-lg font-bold">₹{`${va.pricePerServing}`}</p>
                      </div>
                    )}
                    {!!va.proteinPerRupee && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">{tLang('value.proteinPer100')}</p>
                        <p className="text-sm font-bold">{`${va.proteinPerRupee}`}g</p>
                      </div>
                    )}
                  </div>
                  {!!va.servingCostNote && <p className="mt-3 text-[11px] text-muted-foreground/70 italic">{`${va.servingCostNote}`}</p>}
                </div>
              );
            })()}

            {/* ════════════════════════════════════════════
                15. DATE CHECK
                ════════════════════════════════════════════ */}
            {(() => {
              const dc = (analysis as unknown as Record<string, unknown>).dateCheck as Record<string, unknown> | undefined;
              if (!dc || dc.status === 'unreadable') return null;
              const statusColor = dc.status === 'within_date' ? 'text-green-600' : dc.status === 'near_expiry' ? 'text-amber-600' : 'text-red-600';
              const statusIcon = dc.status === 'within_date' ? '🟢' : dc.status === 'near_expiry' ? '🟡' : '🔴';
              return (
                <div className="rounded-2xl border border-border/70 bg-card p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">📅 {tLang('date.title')}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{statusIcon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${statusColor}`}>{String(dc.explanation)}</p>
                      {!!dc.bestBefore && <p className="text-xs text-muted-foreground">{tLang('date.bestBefore')}: {String(dc.bestBefore)}</p>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ════════════════════════════════════════════
                16. LABEL CONSISTENCY CHECK
                ════════════════════════════════════════════ */}
            {(() => {
              const lt = (analysis as unknown as Record<string, unknown>).labelTrust as Record<string, unknown> | undefined;
              if (!lt) return null;
              const overallStatus = lt.overallStatus as string | undefined;
              const statusColor = overallStatus === 'consistent' ? 'text-green-600' : overallStatus === 'needs_attention' ? 'text-amber-600' : 'text-muted-foreground';
              const statusIcon = overallStatus === 'consistent' ? '✅' : overallStatus === 'needs_attention' ? '⚠️' : '❓';
              const cv = lt.claimVerifications as Array<Record<string, unknown>> | undefined;
              return (
                <div className="rounded-2xl border border-border/70 bg-card p-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">🔎 {tLang('labelTrust.title')}</h2>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{statusIcon}</span>
                    <span className={`text-sm font-semibold ${statusColor}`}>{String(lt.summary)}</span>
                  </div>
                  {cv && cv.length > 0 && (
                    <div className="space-y-2">
                      {cv.map((item, i) => (
                        <div key={i} className="rounded-lg bg-muted/30 p-3 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{item.status === 'supported' ? '✅' : item.status === 'not_found' ? '⚠️' : '❓'}</span>
                            <span className="font-medium">{String(item.claim)}</span>
                          </div>
                          <p className="text-muted-foreground">{String(item.explanation)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ════════════════════════════════════════════
                17. EVIDENCE (collapsible)
                ════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
              <button className="w-full px-6 py-4 flex items-center justify-between text-sm font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30 transition-colors" onClick={() => setShowDetailedEvidence(!showDetailedEvidence)}>
                <span>📋 {tLang("evidence.title")}</span>
                {showDetailedEvidence ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {showDetailedEvidence && (
                <div className="px-6 pb-4 space-y-4">
                  {/* FSSAI evaluations */}
                  {analysis.fssaiEvaluations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{tLang("fssai.title")}</p>
                      <div className="space-y-2">
                        {analysis.fssaiEvaluations.map((ev, i) => (
                          <div key={i} className="rounded-lg bg-muted/30 p-3 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={ev.status === "compliant" ? "text-green-600" : ev.status === "non_compliant" ? "text-red-600" : "text-amber-600"}>
                                {ev.status === "compliant" ? "✅" : ev.status === "non_compliant" ? "❌" : "❓"}
                              </span>
                              <span className="font-medium">{ev.ruleName}</span>
                            </div>
                            <p className="text-muted-foreground">{ev.evidence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Limitations */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{tLang("section.limitations")}</p>
                    <div className="space-y-1">
                      {analysis.limitations.map((l, i) => <p key={i} className="text-xs text-muted-foreground/70">{l}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════
                BOTTOM ACTIONS
                ════════════════════════════════════════════ */}
            <div className="flex justify-center gap-4 pb-10">
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2"><History className="size-4" />{tLang("nav.history")}</Button>
              <Button onClick={handleReset} className="gap-2 ahar-gradient text-white hover:opacity-90"><ScanLine className="size-4" />{tLang("scan.newScan")}</Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
