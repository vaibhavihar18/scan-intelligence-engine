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
import { Progress } from "@/components/ui/progress";import { Camera,
  Upload,
  X,
  Loader2,
  ScanLine,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  History,
  LogOut,
  Globe,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ScanAnalysis } from "@/types/ahar";
import type { Doc } from "@/convex/_generated/dataModel";
import { t, LANGUAGE_LABELS, PROFILE_LABELS, type Language, type ProfileCategory, PROFILE_CATEGORIES } from "@/lib/i18n";

type Step = "upload" | "analyzing" | "results";
const LOADING_STEPS = ["loading.uploading","loading.frontRead","loading.backRead","loading.ingredients","loading.nutrition","loading.frontClaims","loading.matching","loading.rules","loading.profile","loading.score","loading.explanation"];
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
      // Step 1: Compress images
      setLoadingStep(0); setProgress(5);
      const frontDataUrl = await compressImage(frontImage);
      setLoadingStep(1); setProgress(15);
      const backDataUrl = await compressImage(backImage);

      // Step 2: Run client-side OCR on both images (always works, no API key needed)
      setLoadingStep(2); setProgress(25);
      let ocrFrontText = "";
      let ocrBackText = "";
      try {
        setLoadingStep(3); setProgress(30);
        ocrFrontText = await runOcrOnDataUrl(frontDataUrl);
        setLoadingStep(4); setProgress(40);
        ocrBackText = await runOcrOnDataUrl(backDataUrl);
      } catch (ocrErr) {
        console.error("[AHAR X] Client-side OCR failed:", ocrErr);
      }

      // Step 3: Parse OCR text into structured data
      setLoadingStep(5); setProgress(50);
      const ocrFront = parseFrontOcr(ocrFrontText);
      const ocrBack = parseBackOcr(ocrBackText);

      // Step 4: Create scan session
      setLoadingStep(6); setProgress(55);
      const { sessionId, docId } = await createScanSession({
        frontImageId: `ocr_front_${Date.now()}`,
        backImageId: `ocr_back_${Date.now()}`,
        profileCategory,
        language,
      });
      setScanId(sessionId);

      // Step 5: Send to backend (AI is optional — OCR data is always provided)
      setLoadingStep(7); setProgress(65);
      const result = await runFullScan({
        docId,
        scanSessionId: sessionId,
        frontImageUrl: frontDataUrl,
        backImageUrl: backDataUrl,
        profileCategory,
        ocrFront,
        ocrBack,
      });

      // Step 6: Always show results
      setLoadingStep(10); setProgress(100);
      setAnalysis(result as unknown as ScanAnalysis);
      setScanDate(Date.now());
      setStep("results");
    } catch (err) {
      console.error("Scan failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Not authenticated")) {
        setError("Please sign in to analyze products.");
      } else {
        setError("Analysis encountered an issue. Please try again.");
      }
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

  return (
    <main className="min-h-screen bg-background">
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2"><History className="size-4" />{t("nav.history", language)}</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="gap-2"><User className="size-4" />{t("nav.profile", language)}</Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.name ?? user?.email ?? "User"}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {step === "upload" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("scan.title", language)}</h1>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">{t("scan.desc", language)}</p>
            </div>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-medium mr-2">{t("scan.selectProfile", language)}:</span>
              {PROFILE_OPTIONS.map((opt) => (
                <Button key={opt.value} variant={profileCategory === opt.value ? "default" : "outline"} size="sm" onClick={() => setProfileCategory(opt.value)} className="text-xs">
                  {PROFILE_LABELS[opt.value]?.[language] ?? opt.value}
                </Button>
              ))}
            </div>
            {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="relative rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/40 hover:bg-muted/30 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "front")} onClick={() => frontInputRef.current?.click()}>
                <input ref={frontInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, "front"); }} />
                {frontPreview ? (<><img src={frontPreview} alt="Front" className="w-full h-56 object-contain rounded-lg" /><button onClick={(e) => { e.stopPropagation(); setFrontImage(null); setFrontPreview(null); }} className="absolute top-3 right-3 rounded-full bg-background/80 p-1"><X className="size-4" /></button><p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="size-4" />{t("scan.frontUploaded", language)}</p></>)
                : (<div className="flex flex-col items-center py-8"><div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Camera className="size-6" /></div><p className="text-sm font-medium">{t("scan.front", language)}</p><p className="mt-1 text-xs text-muted-foreground">{t("scan.frontDesc", language)}</p></div>)}
              </div>
              <div className="relative rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/40 hover:bg-muted/30 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, "back")} onClick={() => backInputRef.current?.click()}>
                <input ref={backInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, "back"); }} />
                {backPreview ? (<><img src={backPreview} alt="Back" className="w-full h-56 object-contain rounded-lg" /><button onClick={(e) => { e.stopPropagation(); setBackImage(null); setBackPreview(null); }} className="absolute top-3 right-3 rounded-full bg-background/80 p-1"><X className="size-4" /></button><p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="size-4" />{t("scan.backUploaded", language)}</p></>)
                : (<div className="flex flex-col items-center py-8"><div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload className="size-6" /></div><p className="text-sm font-medium">{t("scan.back", language)}</p><p className="mt-1 text-xs text-muted-foreground">{t("scan.backDesc", language)}</p></div>)}
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <Button onClick={handleScan} disabled={!frontImage || !backImage} size="lg" className="gap-2 rounded-full px-8 ahar-gradient text-white hover:opacity-90">
                <ScanLine className="size-5" />{t("scan.analyze", language)}<ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground/60">{t("scan.disclaimer", language)}</p>
          </motion.div>
        )}

        {step === "analyzing" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-20">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl ahar-gradient text-white"><Loader2 className="size-8 animate-spin" /></div>
            <h2 className="text-xl font-bold">{t("scan.analyze", language)}</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">{t(LOADING_STEPS[loadingStep] ?? "loading.uploading", language)}</p>
            <div className="mt-8 w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <div className="mt-3 space-y-1">
                {LOADING_STEPS.slice(0, loadingStep + 1).map((sk, i) => (
                  <div key={sk} className="flex items-center gap-2 text-xs">
                    {i < loadingStep ? <CheckCircle className="size-3 text-green-600 shrink-0" /> : <Loader2 className="size-3 animate-spin text-primary shrink-0" />}
                    <span className={i < loadingStep ? "text-muted-foreground" : "text-foreground font-medium"}>{t(sk, language)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === "results" && analysis && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("result.title", language)}</h1>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {scanId && <span>{t("result.scanId", language)}: {scanId.slice(0, 20)}...</span>}
                  {scanDate && <span>{t("result.date", language)}: {formatDate(scanDate)}</span>}
                  <span>{t("result.profile", language)}: {PROFILE_LABELS[profileCategory]?.[language] ?? profileCategory}</span>
                  <span>{t("result.language", language)}: {LANGUAGE_LABELS[language]}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2"><History className="size-4" />{t("nav.history", language)}</Button>
                <Button onClick={handleReset} className="gap-2 ahar-gradient text-white hover:opacity-90"><ScanLine className="size-4" />{t("scan.newScan", language)}</Button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
               1. BIG SIMPLE VERDICT CARD — First thing the user sees
               ═══════════════════════════════════════════════════════ */}
            {(() => {
              // Compute verdict level from evidence
              const hasMatch = analysis.ingredientVerifications.some(v => v.status === "match_confirmed");
              const hasInconsistency = analysis.ingredientVerifications.some(v => v.status === "potential_inconsistency");
              const hasEvidence = analysis.backIngredients.length > 0 || analysis.frontClaims.length > 0;
              const score = analysis.aharScore.overall;
              const currentSuitability = analysis.suitability.find(s => s.profile === profileCategory);

              let verdictLevel: "good" | "occasional" | "notgood" | "insufficient";
              let verdictColor: string;
              let verdictBorder: string;
              let verdictBg: string;
              let verdictText: string;
              let verdictTextDark: string;

              if (!hasEvidence) {
                verdictLevel = "insufficient";
                verdictColor = "text-gray-600 dark:text-gray-400";
                verdictBorder = "border-gray-400 dark:border-gray-700";
                verdictBg = "bg-gray-50 dark:bg-gray-950/30";
                verdictText = t("verdict.insufficient", language);
                verdictTextDark = "text-gray-700 dark:text-gray-300";
              } else if (hasInconsistency) {
                verdictLevel = "occasional";
                verdictColor = "text-amber-600";
                verdictBorder = "border-amber-400";
                verdictBg = "bg-amber-50 dark:bg-amber-950/30";
                verdictText = t("verdict.occasional", language);
                verdictTextDark = "text-amber-800 dark:text-amber-200";
              } else if (score >= 6 && !hasInconsistency) {
                verdictLevel = "good";
                verdictColor = "text-green-600";
                verdictBorder = "border-green-400";
                verdictBg = "bg-green-50 dark:bg-green-950/30";
                verdictText = t("verdict.goodChoice", language);
                verdictTextDark = "text-green-800 dark:text-green-200";
              } else if (score < 4) {
                verdictLevel = "notgood";
                verdictColor = "text-red-600";
                verdictBorder = "border-red-400";
                verdictBg = "bg-red-50 dark:bg-red-950/30";
                verdictText = t("verdict.notGoodChoice", language);
                verdictTextDark = "text-red-800 dark:text-red-200";
              } else {
                verdictLevel = "occasional";
                verdictColor = "text-amber-600";
                verdictBorder = "border-amber-400";
                verdictBg = "bg-amber-50 dark:bg-amber-950/30";
                verdictText = t("verdict.occasional", language);
                verdictTextDark = "text-amber-800 dark:text-amber-200";
              }

              // Generate one-line verdict
              const verdictLines: string[] = [];
              if (analysis.productName) verdictLines.push(analysis.productName);
              if (hasMatch) {
                const matched = analysis.ingredientVerifications.filter(v => v.status === "match_confirmed").map(v => v.ingredient);
                verdictLines.push(`${t("status.confirmed", language)}: ${matched.join(", ")}`);
              }
              if (hasInconsistency) {
                const inc = analysis.ingredientVerifications.filter(v => v.status === "potential_inconsistency").map(v => v.ingredient);
                verdictLines.push(`${t("status.potentialInconsistency", language)}: ${inc.join(", ")}`);
              }
              if (analysis.allergens.length > 0) {
                verdictLines.push(`${t("allergen.contains", language)}: ${analysis.allergens.join(", ")}`);
              }

              return (
                <div className={`rounded-2xl border-2 ${verdictBorder} ${verdictBg} p-6 sm:p-8`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("verdict.yourResult", language)}</p>
                  {analysis.productName && <p className="text-lg font-bold mb-1">{analysis.productName}</p>}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-extrabold">{analysis.aharScore.overall.toFixed(1)}<span className="text-lg font-normal text-muted-foreground"> / 10</span></span>
                  </div>
                  <div className={`inline-block rounded-lg px-4 py-2 text-sm font-bold ${verdictColor} ${verdictBg} border ${verdictBorder}`}>
                    {verdictLevel === "good" ? "🟢" : verdictLevel === "occasional" ? "🟡" : verdictLevel === "notgood" ? "🔴" : "⚪"} {verdictText}
                  </div>
                  {verdictLines.length > 0 && (
                    <p className={`mt-3 text-sm ${verdictTextDark}`}>{verdictLines.join(" • ")}</p>
                  )}
                </div>
              );
            })()}

            {/* ═══════════════════════════════════════════════════════
               2. KEY FINDINGS — 2-4 bullet points
               ═══════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("findings.title", language)}</h2>
              <div className="space-y-2">
                {analysis.frontClaims.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span className="text-sm">{t("findings.frontClaim", language)}: {analysis.frontClaims.slice(0, 3).join(", ")}{analysis.frontClaims.length > 3 ? ` +${analysis.frontClaims.length - 3}` : ""}</span>
                  </div>
                )}
                {analysis.backIngredients.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span className="text-sm">{t("findings.backIngredients", language)}: {analysis.backIngredients.length} {language === "mr" ? "आढळले" : language === "hi" ? "मिले" : "found"}</span>
                  </div>
                )}
                {analysis.ingredientVerifications.filter(v => v.status === "match_confirmed").length > 0 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-green-700 dark:text-green-400">✅ {t("findings.verified", language)}: {analysis.ingredientVerifications.filter(v => v.status === "match_confirmed").map(v => v.ingredient).join(", ")}</span>
                  </div>
                )}
                {analysis.ingredientVerifications.filter(v => v.status === "potential_inconsistency").length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">⚠ {t("findings.inconsistencies", language)}: {analysis.ingredientVerifications.filter(v => v.status === "potential_inconsistency").map(v => v.ingredient).join(", ")}</span>
                  </div>
                )}
                {analysis.frontClaims.length === 0 && analysis.frontHighlightedIngredients.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("findings.noHighlights", language)}</p>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
               3. FRONT → BACK VERIFICATION (per ingredient)
               ═══════════════════════════════════════════════════════ */}
            {analysis.ingredientVerifications.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{t("section.verification", language)}</h2>
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
                            <p className="font-semibold text-muted-foreground mb-1">{t("evidence.front", language)}</p>
                            <p>{v.frontClaimed ? (language === "mr" ? "✅ समोर दावा दिसतो" : language === "hi" ? "✅ सामने दावा दिखता है" : "✅ Claimed on front") : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 border border-border/50">
                            <p className="font-semibold text-muted-foreground mb-1">{t("evidence.back", language)}</p>
                            <p>{v.backFound ? (v.declaredPercentage ? `✅ ${language === "mr" ? "सापडला" : language === "hi" ? "मिला" : "Found"} — ${v.declaredPercentage}` : `✅ ${language === "mr" ? "सापडला — टक्केवारी नाही" : language === "hi" ? "मिला — प्रतिशत नहीं" : "Found — percentage not declared"}`) : (language === "mr" ? "❌ स्पष्ट Ingredients यादीमध्ये सापडले नाही" : language === "hi" ? "❌ पढ़ी जा सकने वाली Ingredients list में नहीं मिला" : "❌ Not found in readable ingredient list")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground/70 italic">{t("limitations.noLab", language)}</p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
               4. IMPORTANT INGREDIENTS (compact list)
               ═══════════════════════════════════════════════════════ */}
            {analysis.backIngredients.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("section.ingredients", language)}</h2>
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



            {/* ═══════════════════════════════════════════════════════
               5. ALLERGEN ALERT
               ═══════════════════════════════════════════════════════ */}
            {analysis.allergens.length > 0 && (
              <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="size-5 text-red-600" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-red-700 dark:text-red-400">🚨 {t("allergen.alert", language)}</h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">{analysis.allergens.map((a, i) => <Badge key={i} variant="destructive" className="text-sm">{a}</Badge>)}</div>
                <p className="text-xs text-red-600 dark:text-red-400">{t("allergen.warningText", language)}</p>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
               6. NUTRITION SNAPSHOT
               ═══════════════════════════════════════════════════════ */}
            {(analysis.nutrition.calories !== null || analysis.nutrition.protein !== null || analysis.nutrition.sugars !== null) && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  {t("section.nutrition", language)}
                  {analysis.nutrition.servingSize && <span className="ml-2 text-xs font-normal">{t("nutrition.per", language)} {analysis.nutrition.servingSize}</span>}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[{ label: t("nutrition.calories", language), value: analysis.nutrition.calories, unit: "kcal", emoji: "🔥" },{ label: t("nutrition.sugars", language), value: analysis.nutrition.sugars, unit: "g", emoji: "🍬" },{ label: t("nutrition.protein", language), value: analysis.nutrition.protein, unit: "g", emoji: "🥛" },{ label: t("nutrition.fat", language), value: analysis.nutrition.fat, unit: "g", emoji: "🧈" },{ label: t("nutrition.satFat", language), value: analysis.nutrition.saturatedFat, unit: "g", emoji: "⚠️" },{ label: t("nutrition.carbs", language), value: analysis.nutrition.carbohydrates, unit: "g", emoji: "🌾" },{ label: t("nutrition.sodium", language), value: analysis.nutrition.sodium, unit: "mg", emoji: "🧂" },{ label: t("nutrition.fibre", language), value: analysis.nutrition.fibre, unit: "g", emoji: "🥬" }].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-sm text-muted-foreground">{item.emoji} {item.label}</span>
                      <span className="text-sm font-bold">{item.value !== null ? `${item.value}${item.unit}` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
               7. SUITABILITY BY PROFILE — Grid/table
               ═══════════════════════════════════════════════════════ */}
            {analysis.suitability.length > 0 && (
              <div className="rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">{t("suitability.gridTitle", language)}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {analysis.suitability.map((s, i) => {
                    const emoji = s.status === "suitable" ? "🟢" : s.status === "use_caution" ? "🟡" : s.status === "not_recommended" ? "🔴" : "⚪";
                    const shortLabel = (
                      s.profile === "child" ? t("suitability.child", language) :
                      s.profile === "general" ? t("suitability.adult", language) :
                      s.profile === "fitness" ? t("suitability.fitness", language) :
                      s.profile === "weight" ? t("suitability.weight", language) :
                      s.profile === "vegetarian" ? t("suitability.veg", language) :
                      t("suitability.highProtein", language)
                    );
                    const statusTextSimple = (
                      s.status === "suitable" ? (language === "mr" ? "योग्य" : language === "hi" ? "उपयुक्त" : "Suitable") :
                      s.status === "use_caution" ? (language === "mr" ? "सावधान" : language === "hi" ? "सावधान" : "Use caution") :
                      s.status === "not_recommended" ? (language === "mr" ? "शिफारस नाही" : language === "hi" ? "अनुशंसित नहीं" : "Not recommended") :
                      (language === "mr" ? "पुरेसा पुरावा नाही" : language === "hi" ? "अपर्याप्त सबूत" : "Insufficient evidence")
                    );
                    const mainReason = s.reasons[0] ?? statusTextSimple;
                    const isActive = s.profile === profileCategory;
                    return (
                      <div key={i} className={`rounded-xl p-3 border ${isActive ? "border-primary/40 bg-primary/5" : "border-border/50 bg-background/50"}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <span className="font-medium text-sm">{shortLabel}</span>
                          {isActive && <Badge variant="default" className="text-[10px] ml-auto">{language === "mr" ? "तुमची प्रोफाइल" : language === "hi" ? "आपकी प्रोफ़ाइल" : "Your profile"}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-7">{mainReason}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



            {/* ═══════════════════════════════════════════════════════
               8. EFFECT ON YOUR GOAL
               ═══════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">{t("goal.title", language)}</h2>
              {(() => {
                const currentSuit = analysis.suitability.find(s => s.profile === profileCategory);
                const goalKey = (
                  profileCategory === "child" ? t("goal.child", language) :
                  profileCategory === "fitness" ? t("goal.fitness", language) :
                  profileCategory === "weight" ? t("goal.weight", language) :
                  profileCategory === "highProtein" ? t("goal.highProtein", language) :
                  t("goal.general", language)
                );
                const emoji = currentSuit?.status === "suitable" ? "🟢" : currentSuit?.status === "use_caution" ? "🟡" : currentSuit?.status === "not_recommended" ? "🔴" : "⚪";
                return (
                  <div className="rounded-xl bg-muted/30 p-4 border border-border/30">
                    <p className="text-sm font-semibold mb-2">{goalKey}</p>
                    {currentSuit && currentSuit.reasons.length > 0 ? (
                      <ul className="space-y-1.5">
                        {currentSuit.reasons.map((r, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="shrink-0">{emoji}</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("profile.insufficient", language)}</p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ═══════════════════════════════════════════════════════
               9. AHAR X SCORE — with explanation
               ═══════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 overflow-hidden">
              <div className="ahar-gradient px-6 py-5">
                <p className="text-sm font-medium text-white/80">{t("score.heading", language)}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-white">{analysis.aharScore.overall.toFixed(1)}</p>
                  <span className="text-lg font-normal text-white/60">/ 10</span>
                </div>
                <p className="mt-1 text-xs text-white/60">{t("score.basedOn", language)}</p>
              </div>
              <div className="px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">➕ {t("score.increasing", language)}</p>
                    {analysis.aharScore.factors.filter((f) => f.impact === "positive").map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <CheckCircle className="size-3 text-green-600 shrink-0" />
                        <span>{f.label}: {f.value}</span>
                        <span className="ml-auto text-green-600 font-medium">+{f.delta.toFixed(1)}</span>
                      </div>
                    ))}
                    {analysis.aharScore.factors.filter((f) => f.impact === "positive").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">➖ {t("score.decreasing", language)}</p>
                    {analysis.aharScore.factors.filter((f) => f.impact === "negative").map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <XCircle className="size-3 text-red-600 shrink-0" />
                        <span>{f.label}: {f.value}</span>
                        <span className="ml-auto text-red-600 font-medium">{f.delta.toFixed(1)}</span>
                      </div>
                    ))}
                    {analysis.aharScore.factors.filter((f) => f.impact === "negative").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">ℹ️ {t("score.unavailable", language)}</p>
                    {analysis.aharScore.factors.filter((f) => f.impact === "unavailable").map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <Info className="size-3 text-muted-foreground shrink-0" />
                        <span>{f.label}</span>
                      </div>
                    ))}
                    {analysis.aharScore.factors.filter((f) => f.impact === "unavailable").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
               10. IN SIMPLE WORDS
               ═══════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">💬 {t("simpleWords.title", language)}</h2>
              <p className="text-sm leading-relaxed text-foreground/80">{analysis.simpleExplanation}</p>
            </div>

            {/* ═══════════════════════════════════════════════════════
               11. LIMITATIONS
               ═══════════════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-border/70 bg-card/50 p-5">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("section.limitations", language)}</p>
              <div className="space-y-1">
                {analysis.limitations.map((l, i) => <p key={i} className="text-xs text-muted-foreground/70">{l}</p>)}
                <p className="text-xs text-muted-foreground/70">{t("limitations.standard", language)}</p>
              </div>
            </div>

            <div className="flex justify-center gap-4 pb-10">
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2"><History className="size-4" />{t("nav.history", language)}</Button>
              <Button onClick={handleReset} className="gap-2 ahar-gradient text-white hover:opacity-90"><ScanLine className="size-4" />{t("scan.newScan", language)}</Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
