import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ScanAnalysis } from "@/types/ahar";
import type { Doc } from "@/convex/_generated/dataModel";

type Step = "upload" | "analyzing" | "results";

export default function Scan() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const createScanSession = useMutation(api.scanSessions.createScanSession);
  const runFullScan = useAction(api.runScan.runFullScan);

  const location = useLocation();
  const scanFromNav = (location.state as { scanId?: string } | null)?.scanId;
  const pastScan = useQuery(
    api.scanSessions.getScan,
    scanFromNav ? { docId: scanFromNav as Doc<"scanSessions">["_id"] } : "skip",
  );

  const [step, setStep] = useState<Step>("upload");
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // If navigated with a past scan, show its results directly
  useEffect(() => {
    if (pastScan && pastScan.status === "completed" && pastScan.analysis) {
      setAnalysis(pastScan.analysis as unknown as ScanAnalysis);
      setStep("results");
    }
  }, [pastScan]);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File, side: "front" | "back") => {
      const url = URL.createObjectURL(file);
      if (side === "front") {
        setFrontImage(file);
        setFrontPreview(url);
      } else {
        setBackImage(file);
        setBackPreview(url);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, side: "front" | "back") => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file, side);
      }
    },
    [handleFileSelect],
  );

  const handleScan = async () => {
    if (!frontImage || !backImage) return;

    setStep("analyzing");
    setProgress(10);
    setError(null);

    try {
      // 1. Upload front image to Convex storage
      setProgress(20);
      const frontUpload = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/storage/upload`,
        {
          method: "POST",
          headers: { "Content-Type": frontImage.type },
          body: frontImage,
        },
      );
      if (!frontUpload.ok) throw new Error("Failed to upload front image");
      const frontData = await frontUpload.json();
      const frontStorageId = frontData.storageId;

      // 2. Upload back image to Convex storage
      setProgress(35);
      const backUpload = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/storage/upload`,
        {
          method: "POST",
          headers: { "Content-Type": backImage.type },
          body: backImage,
        },
      );
      if (!backUpload.ok) throw new Error("Failed to upload back image");
      const backData = await backUpload.json();
      const backStorageId = backData.storageId;

      // 3. Create scan session
      setProgress(45);
      const { sessionId, docId } = await createScanSession({
        frontImageId: frontStorageId,
        backImageId: backStorageId,
      });

      // 4. Get image URLs for AI analysis
      setProgress(50);
      const frontUrl = `${import.meta.env.VITE_CONVEX_URL}/api/storage/${frontStorageId}`;
      const backUrl = `${import.meta.env.VITE_CONVEX_URL}/api/storage/${backStorageId}`;

      // 5. Run full analysis
      setProgress(60);
      const result = await runFullScan({
        docId,
        scanSessionId: sessionId,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
      });

      setProgress(100);
      setAnalysis(result as unknown as ScanAnalysis);
      setStep("results");
    } catch (err) {
      console.error("Scan failed:", err);
      setError(
        err instanceof Error ? err.message : "Scan failed. Please try again.",
      );
      setStep("upload");
    }
  };

  const handleReset = () => {
    setFrontImage(null);
    setBackImage(null);
    setFrontPreview(null);
    setBackPreview(null);
    setAnalysis(null);
    setError(null);
    setProgress(0);
    setStep("upload");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const scoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "destructive";
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "match_confirmed":
        return <CheckCircle className="size-4 text-green-600" />;
      case "percentage_not_stated":
        return <AlertTriangle className="size-4 text-amber-600" />;
      case "potential_inconsistency":
        return <XCircle className="size-4 text-red-600" />;
      default:
        return <Info className="size-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "match_confirmed":
        return "Match confirmed";
      case "percentage_not_stated":
        return "Percentage not stated on label";
      case "potential_inconsistency":
        return "Not found in back ingredient list";
      case "insufficient_evidence":
        return "Insufficient evidence";
      default:
        return status;
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={handleReset}
          >
            <div className="flex size-8 items-center justify-center rounded-lg ahar-gradient text-white">
              <ScanLine className="size-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              AHAR <span className="text-primary">X</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <History className="size-4" />
              History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2"
            >
              <User className="size-4" />
              Profile
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

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Upload Step */}
        {step === "upload" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Scan a Food Product
              </h1>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
                Upload the front and back of any food package. AHAR X will read
                and analyze the actual label — no product database required.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Front image upload */}
              <div
                className="relative rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/40 hover:bg-muted/30 cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "front")}
                onClick={() => frontInputRef.current?.click()}
              >
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, "front");
                  }}
                />
                {frontPreview ? (
                  <>
                    <img
                      src={frontPreview}
                      alt="Front package"
                      className="w-full h-56 object-contain rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontImage(null);
                        setFrontPreview(null);
                      }}
                      className="absolute top-3 right-3 rounded-full bg-background/80 p-1 shadow-sm hover:bg-background"
                    >
                      <X className="size-4" />
                    </button>
                    <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle className="size-4" />
                      Front uploaded
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Camera className="size-6" />
                    </div>
                    <p className="text-sm font-medium">
                      Front of Package
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Click or drag to upload
                    </p>
                  </div>
                )}
              </div>

              {/* Back image upload */}
              <div
                className="relative rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-primary/40 hover:bg-muted/30 cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "back")}
                onClick={() => backInputRef.current?.click()}
              >
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, "back");
                  }}
                />
                {backPreview ? (
                  <>
                    <img
                      src={backPreview}
                      alt="Back label"
                      className="w-full h-56 object-contain rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBackImage(null);
                        setBackPreview(null);
                      }}
                      className="absolute top-3 right-3 rounded-full bg-background/80 p-1 shadow-sm hover:bg-background"
                    >
                      <X className="size-4" />
                    </button>
                    <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle className="size-4" />
                      Back uploaded
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Upload className="size-6" />
                    </div>
                    <p className="text-sm font-medium">
                      Back of Package
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nutrition panel & ingredients
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleScan}
                disabled={!frontImage || !backImage}
                size="lg"
                className="gap-2 rounded-full px-8 ahar-gradient text-white hover:opacity-90"
              >
                <ScanLine className="size-5" />
                Analyze Product
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground/60">
              Both images must belong to the same scan session. Results are
              derived solely from what is visible on the uploaded images.
            </p>
          </motion.div>
        )}

        {/* Analyzing Step */}
        {step === "analyzing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-20"
          >
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl ahar-gradient text-white">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold">Analyzing Label</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              Reading front and back images, extracting ingredients, nutrition
              facts, and claims...
            </p>
            <div className="mt-8 w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {progress < 30
                  ? "Uploading images..."
                  : progress < 60
                    ? "Running AI vision analysis..."
                    : progress < 90
                      ? "Applying FSSAI rules..."
                      : "Generating score..."}
              </p>
            </div>
          </motion.div>
        )}

        {/* Results Step */}
        {step === "results" && analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Analysis Complete
                </h1>
                {analysis.productName && (
                  <p className="mt-1 text-muted-foreground">
                    {analysis.productName}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <ScanLine className="size-4" />
                New Scan
              </Button>
            </div>

            {/* AHAR X Score */}
            <Card className="border-border/70 overflow-hidden">
              <div className="ahar-gradient px-6 py-4">
                <p className="text-sm font-medium text-white/80">
                  AHAR X Score
                </p>
                <p className={`text-4xl font-bold text-white`}>
                  {analysis.aharScore.overall}
                  <span className="text-lg font-normal text-white/60">
                    /100
                  </span>
                </p>
              </div>
              <CardContent className="px-6 py-5">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    {
                      label: "Label Transparency",
                      value: analysis.aharScore.labelTransparency,
                    },
                    {
                      label: "Nutrition Quality",
                      value: analysis.aharScore.nutritionQuality,
                    },
                    {
                      label: "Ingredient Integrity",
                      value: analysis.aharScore.ingredientIntegrity,
                    },
                    {
                      label: "Claim Accuracy",
                      value: analysis.aharScore.claimAccuracy,
                    },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className={`text-2xl font-bold ${scoreColor(item.value)}`}>
                        {item.value}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Front Claims */}
            {analysis.frontClaims.length > 0 && (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">
                    Front-of-Pack Claims
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.frontClaims.map((claim, i) => (
                      <Badge key={i} variant="secondary">
                        {claim}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nutrition */}
            {(analysis.nutrition.calories !== null ||
              analysis.nutrition.protein !== null) && (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">
                    Nutrition Facts
                    {analysis.nutrition.servingSize && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        per {analysis.nutrition.servingSize}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                    {[
                      { label: "Calories", value: analysis.nutrition.calories, unit: "kcal" },
                      { label: "Protein", value: analysis.nutrition.protein, unit: "g" },
                      { label: "Carbohydrates", value: analysis.nutrition.carbohydrates, unit: "g" },
                      { label: "Sugars", value: analysis.nutrition.sugars, unit: "g" },
                      { label: "Fat", value: analysis.nutrition.fat, unit: "g" },
                      { label: "Saturated Fat", value: analysis.nutrition.saturatedFat, unit: "g" },
                      { label: "Trans Fat", value: analysis.nutrition.transFat, unit: "g" },
                      { label: "Fibre", value: analysis.nutrition.fibre, unit: "g" },
                      { label: "Sodium", value: analysis.nutrition.sodium, unit: "mg" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-baseline justify-between"
                      >
                        <span className="text-sm text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium">
                          {item.value !== null
                            ? `${item.value}${item.unit}`
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Front ↔ Back Verification */}
            {analysis.ingredientVerifications.length > 0 && (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">
                    Front ↔ Back Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.ingredientVerifications.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                      >
                        {statusIcon(v.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{v.ingredient}</p>
                          <p className="text-xs text-muted-foreground">
                            {statusLabel(v.status)}
                            {v.declaredPercentage && (
                              <>
                                {" "}
                                • Declared at{" "}
                                <strong>{v.declaredPercentage}</strong>
                              </>
                            )}
                          </p>
                        </div>
                        <Badge
                          variant={scoreBadgeVariant(
                            v.status === "match_confirmed"
                              ? 100
                              : v.status === "percentage_not_stated"
                                ? 50
                                : 0,
                          )}
                          className="text-[10px] shrink-0"
                        >
                          {v.frontClaimed ? "Front" : ""}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Allergens */}
            {analysis.allergens.length > 0 && (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-600" />
                    Allergen Declarations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.allergens.map((allergen, i) => (
                      <Badge key={i} variant="destructive">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FSSAI Rules */}
            {analysis.fssaiEvaluations.length > 0 && (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">
                    FSSAI Regulatory Check
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.fssaiEvaluations.map((ev, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                      >
                        {ev.status === "compliant" ? (
                          <CheckCircle className="size-4 mt-0.5 text-green-600 shrink-0" />
                        ) : ev.status === "non_compliant" ? (
                          <XCircle className="size-4 mt-0.5 text-red-600 shrink-0" />
                        ) : (
                          <Info className="size-4 mt-0.5 text-amber-600 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{ev.ruleName}</p>
                            <Badge
                              variant={
                                ev.status === "compliant"
                                  ? "default"
                                  : ev.status === "non_compliant"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {ev.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {ev.detail}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground/60 italic">
                            {ev.evidence}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ingredient List */}
            {analysis.backIngredients.length > 0 && (
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">
                    Extracted Ingredients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.backIngredients.map((ing, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {ing}
                        {analysis.backIngredientPercentages[ing] && (
                          <span className="ml-1.5 text-primary font-semibold">
                            {analysis.backIngredientPercentages[ing]}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footnotes */}
            {analysis.footnotes.length > 0 && (
              <Card className="border-border/70">
                <CardContent className="pt-6">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Footnotes & Disclaimers
                  </p>
                  <div className="space-y-1">
                    {analysis.footnotes.map((fn, i) => (
                      <p key={i} className="text-xs text-muted-foreground/70">
                        {fn}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground/70 text-center">
              This analysis is based solely on information visible on the
              uploaded package images. Results are not a substitute for
              professional dietary advice.{" "}
              <strong>
                If label information is missing or unreadable, the system
                reports "insufficient evidence" — it never guesses.
              </strong>
            </div>

            {/* Bottom actions */}
            <div className="flex justify-center gap-4 pb-10">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <History className="size-4" />
                View History
              </Button>
              <Button
                onClick={handleReset}
                className="gap-2 ahar-gradient text-white hover:opacity-90"
              >
                <ScanLine className="size-4" />
                Scan Another
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

