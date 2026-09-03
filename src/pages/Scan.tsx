import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocation, useNavigate } from "react-router";
import { compressImage, validateImage } from "@/lib/imageCompress";
import { runOcrOnDataUrl } from "@/lib/ocr";
import { parseFrontOcr, parseBackOcr } from "@/lib/parseOcr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
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

  const statusIcon = (s: string) => {
    if (s === "match_confirmed") return <CheckCircle className="size-4 text-green-600 shrink-0" />;
    if (s === "percentage_not_stated") return <Info className="size-4 text-amber-600 shrink-0" />;
    if (s === "potential_inconsistency") return <AlertTriangle className="size-4 text-red-600 shrink-0" />;
    return <Info className="size-4 text-muted-foreground shrink-0" />;
  };

  const suitabilityIcon = (s: string) => {
    if (s === "suitable") return <CheckCircle className="size-4 text-green-600 shrink-0" />;
    if (s === "use_caution") return <AlertTriangle className="size-4 text-amber-600 shrink-0" />;
    if (s === "not_recommended") return <XCircle className="size-4 text-red-600 shrink-0" />;
    return <Info className="size-4 text-muted-foreground shrink-0" />;
  };

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
                {analysis.productName && <p className="mt-1 text-lg font-medium">{analysis.productName}</p>}
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

            {/* BIG SIMPLE VERDICT — First thing judges see */}
            <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-10 items-center justify-center rounded-xl ahar-gradient text-white">
                  <ScanLine className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">AHAR X {t("result.title", language)}</h2>
                  {analysis.productName && <p className="text-sm font-medium text-primary">{analysis.productName}</p>}
                </div>
              </div>

              {/* Simple verdict grid */}
              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                {/* FRONT SAYS */}
                <div className="rounded-xl bg-background/80 p-4 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{language === "mr" ? "समोर काय" : language === "hi" ? "सामने क्या" : "FRONT SAYS"}</p>
                  {analysis.frontClaims.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.frontClaims.slice(0, 5).map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
                    </div>
                  ) : analysis.frontHighlightedIngredients.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.frontHighlightedIngredients.map((ing, i) => <Badge key={i} variant="secondary" className="text-xs">{ing}</Badge>)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("status.insufficientEvidence", language)}</p>
                  )}
                </div>

                {/* BACK DECLARES */}
                <div className="rounded-xl bg-background/80 p-4 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{language === "mr" ? "माग काय" : language === "hi" ? "पीछे क्या" : "BACK DECLARES"}</p>
                  {analysis.backIngredients.length > 0 ? (
                    <p className="text-sm">{analysis.backIngredients.length} {language === "mr" ? "घटक" : language === "hi" ? "सामग्री" : "ingredients"} {language === "mr" ? "आढळले" : language === "hi" ? "मिले" : "found"}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("error.unreadable", language)}</p>
                  )}
                  {analysis.allergens.length > 0 && (
                    <p className="mt-1 text-xs text-amber-600">⚠ {language === "mr" ? "अॅलर्जेन" : language === "hi" ? "एलर्जन" : "Allergens"}: {analysis.allergens.join(", ")}</p>
                  )}
                </div>

                {/* VERDICT */}
                <div className={`rounded-xl p-4 border-2 ${
                  analysis.ingredientVerifications.some(v => v.status === "potential_inconsistency")
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800"
                    : analysis.ingredientVerifications.some(v => v.status === "match_confirmed")
                      ? "border-green-400 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                      : "border-border bg-background/80"
                }`}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{language === "mr" ? "AHAR X निष्कर्ष" : language === "hi" ? "AHAR X निष्कर्ष" : "AHAR X FINDING"}</p>
                  {analysis.ingredientVerifications.length > 0 ? (
                    <div className="space-y-1.5">
                      {analysis.ingredientVerifications.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {v.status === "match_confirmed" ? <CheckCircle className="size-4 text-green-600 shrink-0" /> : v.status === "potential_inconsistency" ? <AlertTriangle className="size-4 text-amber-600 shrink-0" /> : <Info className="size-4 text-muted-foreground shrink-0" />}
                          <span className="text-sm font-medium">{v.ingredient}</span>
                          <span className="text-xs text-muted-foreground">{statusText(v.status)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("status.insufficientEvidence", language)}</p>
                  )}
                </div>
              </div>

              {/* Score + profile quick summary */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{analysis.aharScore.overall.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 10</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <span className="text-muted-foreground">{PROFILE_LABELS[profileCategory]?.[language] ?? profileCategory}</span>
                {scanDate && <><div className="h-6 w-px bg-border" /><span className="text-muted-foreground text-xs">{formatDate(scanDate)}</span></>}
              </div>
            </div>

            {/* 1. Front Claims — expanded view */}
            <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.frontClaims", language)}</CardTitle></CardHeader><CardContent>
              {analysis.frontClaims.length > 0 ? <div className="flex flex-wrap gap-2">{analysis.frontClaims.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>)}</div> : <p className="text-sm text-muted-foreground">{t("status.insufficientEvidence", language)}</p>}
              {analysis.frontHighlightedIngredients.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">{language === "mr" ? "प्रमुख घटक" : language === "hi" ? "प्रमुख सामग्री" : "Highlighted Ingredients"}:</p>
                  <div className="flex flex-wrap gap-1.5">{analysis.frontHighlightedIngredients.map((ing, i) => <Badge key={i} variant="outline" className="text-xs">{ing}</Badge>)}</div>
                </div>
              )}
            </CardContent></Card>

            {/* 2. Back Declares — expanded view */}
            <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.backDeclares", language)}</CardTitle></CardHeader><CardContent>
              {analysis.backIngredients.length > 0 ? <div className="flex flex-wrap gap-1.5">{analysis.backIngredients.map((ing, i) => (<span key={i} className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{ing}{analysis.backIngredientPercentages[ing] && <span className="ml-1.5 text-primary font-semibold">{analysis.backIngredientPercentages[ing]}</span>}</span>))}</div> : <p className="text-sm text-muted-foreground">{t("error.unreadable", language)}</p>}
            </CardContent></Card>

            {/* 3. Front ↔ Back Verification */}
            {analysis.ingredientVerifications.length > 0 && (
              <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.verification", language)}</CardTitle></CardHeader><CardContent>
                <div className="space-y-3">
                  {analysis.ingredientVerifications.map((v, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                      {statusIcon(v.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{v.ingredient}</p>
                        <p className="text-xs text-muted-foreground">{v.backFound ? (v.declaredPercentage ? `Found at ${v.declaredPercentage}` : "Found — percentage not declared") : "Not found in back ingredient list"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0"><span className="text-xs font-medium">{statusText(v.status)}</span><Badge variant="outline" className="text-[10px]">{v.confidence}</Badge></div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground/70 italic">{t("limitations.noLab", language)}</p>
              </CardContent></Card>
            )}

            {/* 4. Allergens */}
            {analysis.allergens.length > 0 && (
              <Card className="border-border/70"><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600" />{t("allergen.warning", language)}</CardTitle></CardHeader><CardContent>
                <div className="flex flex-wrap gap-2">{analysis.allergens.map((a, i) => <Badge key={i} variant="destructive">{a}</Badge>)}</div>
              </CardContent></Card>
            )}

            {/* 5. Nutrition */}
            {(analysis.nutrition.calories !== null || analysis.nutrition.protein !== null) && (
              <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.nutrition", language)}{analysis.nutrition.servingSize && <span className="ml-2 text-sm font-normal text-muted-foreground">{t("nutrition.per", language)} {analysis.nutrition.servingSize}</span>}</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                  {[{ label: t("nutrition.calories", language), value: analysis.nutrition.calories, unit: "kcal" },{ label: t("nutrition.protein", language), value: analysis.nutrition.protein, unit: "g" },{ label: t("nutrition.carbs", language), value: analysis.nutrition.carbohydrates, unit: "g" },{ label: t("nutrition.sugars", language), value: analysis.nutrition.sugars, unit: "g" },{ label: t("nutrition.fat", language), value: analysis.nutrition.fat, unit: "g" },{ label: t("nutrition.satFat", language), value: analysis.nutrition.saturatedFat, unit: "g" },{ label: t("nutrition.transFat", language), value: analysis.nutrition.transFat, unit: "g" },{ label: t("nutrition.fibre", language), value: analysis.nutrition.fibre, unit: "g" },{ label: t("nutrition.sodium", language), value: analysis.nutrition.sodium, unit: "mg" }].map((item) => (
                    <div key={item.label} className="flex items-baseline justify-between"><span className="text-sm text-muted-foreground">{item.label}</span><span className="text-sm font-medium">{item.value !== null ? `${item.value}${item.unit}` : "—"}</span></div>
                  ))}
                </div>
              </CardContent></Card>
            )}

            {/* 6. Suitability */}
            {analysis.suitability.length > 0 && (
              <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.suitability", language)}</CardTitle></CardHeader><CardContent>
                <div className="space-y-4">
                  {analysis.suitability.map((s, i) => (
                    <div key={i} className="rounded-lg border border-border/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {suitabilityIcon(s.status)}
                        <span className="font-medium text-sm">{PROFILE_LABELS[s.profile]?.[language] ?? s.profile}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        {s.status === "suitable" ? t("profile.suitable", language) : s.status === "use_caution" ? t("profile.useCaution", language) : s.status === "not_recommended" ? t("profile.notRecommended", language) : t("profile.insufficient", language)}
                      </p>
                      {s.reasons.length > 0 && <ul className="mt-2 ml-6 space-y-1">{s.reasons.map((r, j) => <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="shrink-0 mt-0.5">•</span>{r}</li>)}</ul>}
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            )}

            {/* 7. Personalized Analysis */}
            <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.personalized", language)}</CardTitle></CardHeader><CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("analysis.checkedFor", language)}: <strong>{PROFILE_LABELS[profileCategory]?.[language] ?? profileCategory}</strong></p>
              {analysis.nutrition.sugars !== null && <div className="flex justify-between text-sm"><span>{t("analysis.sugar", language)}</span><Badge variant={analysis.nutrition.sugars > 15 ? "destructive" : analysis.nutrition.sugars <= 5 ? "default" : "secondary"}>{analysis.nutrition.sugars > 15 ? t("analysis.high", language) : analysis.nutrition.sugars <= 5 ? t("analysis.low", language) : t("analysis.moderate", language)} ({analysis.nutrition.sugars}g)</Badge></div>}
              {analysis.nutrition.protein !== null && <div className="flex justify-between text-sm"><span>{t("analysis.protein", language)}</span><Badge variant={analysis.nutrition.protein >= 10 ? "default" : "secondary"}>{analysis.nutrition.protein >= 10 ? t("analysis.high", language) : t("analysis.moderate", language)} ({analysis.nutrition.protein}g)</Badge></div>}
              {analysis.nutrition.calories !== null && <div className="flex justify-between text-sm"><span>{t("analysis.calories", language)}</span><Badge variant={analysis.nutrition.calories > 300 ? "destructive" : "secondary"}>{analysis.nutrition.calories} kcal</Badge></div>}
              {analysis.nutrition.sodium !== null && <div className="flex justify-between text-sm"><span>{t("analysis.sodium", language)}</span><Badge variant={analysis.nutrition.sodium > 400 ? "destructive" : "secondary"}>{analysis.nutrition.sodium > 400 ? t("analysis.high", language) : t("analysis.moderate", language)} ({analysis.nutrition.sodium}mg)</Badge></div>}
              {analysis.nutrition.fibre !== null && <div className="flex justify-between text-sm"><span>{t("analysis.fibre", language)}</span><Badge variant={analysis.nutrition.fibre >= 5 ? "default" : "secondary"}>{analysis.nutrition.fibre}g</Badge></div>}
              {analysis.allergens.length > 0 && <div className="flex justify-between text-sm"><span>{t("analysis.allergen", language)}</span><div className="flex flex-wrap gap-1">{analysis.allergens.map((a, i) => <Badge key={i} variant="destructive" className="text-[10px]">{a}</Badge>)}</div></div>}
            </CardContent></Card>

            {/* 8. AHAR X Score */}
            <Card className="border-border/70 overflow-hidden">
              <div className="ahar-gradient px-6 py-5">
                <p className="text-sm font-medium text-white/80">{t("score.heading", language)}</p>
                <div className="flex items-baseline gap-2"><p className="text-5xl font-bold text-white">{analysis.aharScore.overall.toFixed(1)}</p><span className="text-lg font-normal text-white/60">/ 10</span></div>
                <p className="mt-1 text-xs text-white/60">{t("score.basedOn", language)}</p>
              </div>
              <CardContent className="px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("score.increasing", language)}</p>
                    {analysis.aharScore.factors.filter((f) => f.impact === "positive").map((f, i) => (<div key={i} className="flex items-center gap-2 text-xs py-1"><CheckCircle className="size-3 text-green-600 shrink-0" /><span>{f.label}: {f.value}</span><span className="ml-auto text-green-600 font-medium">+{f.delta.toFixed(1)}</span></div>))}
                    {analysis.aharScore.factors.filter((f) => f.impact === "positive").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("score.decreasing", language)}</p>
                    {analysis.aharScore.factors.filter((f) => f.impact === "negative").map((f, i) => (<div key={i} className="flex items-center gap-2 text-xs py-1"><XCircle className="size-3 text-red-600 shrink-0" /><span>{f.label}: {f.value}</span><span className="ml-auto text-red-600 font-medium">{f.delta.toFixed(1)}</span></div>))}
                    {analysis.aharScore.factors.filter((f) => f.impact === "negative").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{t("score.unavailable", language)}</p>
                    {analysis.aharScore.factors.filter((f) => f.impact === "unavailable").map((f, i) => (<div key={i} className="flex items-center gap-2 text-xs py-1"><Info className="size-3 text-muted-foreground shrink-0" /><span>{f.label}</span></div>))}
                    {analysis.aharScore.factors.filter((f) => f.impact === "unavailable").length === 0 && <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 9. Simple Explanation */}
            <Card className="border-border/70"><CardHeader><CardTitle className="text-base">{t("section.explanation", language)}</CardTitle></CardHeader><CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{analysis.simpleExplanation}</p>
            </CardContent></Card>

            {/* 10. Limitations */}
            <Card className="border-border/70"><CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("section.limitations", language)}</p>
              <div className="space-y-1">
                {analysis.limitations.map((l, i) => <p key={i} className="text-xs text-muted-foreground/70">{l}</p>)}
                <p className="text-xs text-muted-foreground/70">{t("limitations.standard", language)}</p>
              </div>
            </CardContent></Card>

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
