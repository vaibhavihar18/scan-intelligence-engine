import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  ScanLine,
  LogOut,
  ArrowLeft,
  Save,
  X,
  Plus,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

type DietaryGoal =
  | "general_healthy"
  | "weight_loss"
  | "weight_gain"
  | "diabetic"
  | "heart_healthy"
  | "high_protein"
  | "low_sodium"
  | "child_friendly";

interface ProfileData {
  dietaryGoal: DietaryGoal;
  allergies: string[];
  maxCaloriesPerServing: number | undefined;
  avoidAddedSugar: boolean;
  avoidTransFat: boolean;
  preferHighFibre: boolean;
}

const DIETARY_GOALS: { value: DietaryGoal; label: string; description: string }[] = [
  { value: "general_healthy", label: "General Healthy", description: "Balanced, overall healthy eating" },
  { value: "weight_loss", label: "Weight Loss", description: "Low calorie, high protein focus" },
  { value: "weight_gain", label: "Weight Gain", description: "Higher calorie, nutrient-dense" },
  { value: "diabetic", label: "Diabetic Friendly", description: "Low sugar, controlled carbohydrates" },
  { value: "heart_healthy", label: "Heart Healthy", description: "Low sodium, low saturated fat" },
  { value: "high_protein", label: "High Protein", description: "Prioritize protein content" },
  { value: "low_sodium", label: "Low Sodium", description: "Minimize sodium intake" },
  { value: "child_friendly", label: "Child Friendly", description: "Safe for children, no excessive additives" },
];

const COMMON_ALLERGIES = [
  "Milk", "Eggs", "Peanuts", "Tree Nuts", "Soy", "Wheat",
  "Gluten", "Fish", "Shellfish", "Sesame", "Mustard", "Celery",
  "Lupin", "Molluscs", "Sulphites",
];

const DEFAULT_PROFILE: ProfileData = {
  dietaryGoal: "general_healthy",
  allergies: [],
  maxCaloriesPerServing: undefined,
  avoidAddedSugar: false,
  avoidTransFat: true,
  preferHighFibre: true,
};

function normalizeProfile(raw: Record<string, unknown>): ProfileData {
  return {
    dietaryGoal: (raw.dietaryGoal as DietaryGoal) ?? "general_healthy",
    allergies: Array.isArray(raw.allergies) ? (raw.allergies as string[]) : [],
    maxCaloriesPerServing: typeof raw.maxCaloriesPerServing === "number" ? raw.maxCaloriesPerServing : undefined,
    avoidAddedSugar: typeof raw.avoidAddedSugar === "boolean" ? raw.avoidAddedSugar : false,
    avoidTransFat: typeof raw.avoidTransFat === "boolean" ? raw.avoidTransFat : true,
    preferHighFibre: typeof raw.preferHighFibre === "boolean" ? raw.preferHighFibre : true,
  };
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const existingProfile = useQuery(api.userProfiles.getProfile);
  const upsertProfile = useMutation(api.userProfiles.upsertProfile);

  const [localProfile, setLocalProfile] = useState<ProfileData | null>(null);
  const [allergyInput, setAllergyInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentProfile: ProfileData =
    localProfile ??
    (existingProfile
      ? normalizeProfile(existingProfile as unknown as Record<string, unknown>)
      : DEFAULT_PROFILE);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertProfile({
        profile: {
          dietaryGoal: currentProfile.dietaryGoal,
          allergies: currentProfile.allergies,
          maxCaloriesPerServing: currentProfile.maxCaloriesPerServing,
          avoidAddedSugar: currentProfile.avoidAddedSugar,
          avoidTransFat: currentProfile.avoidTransFat,
          preferHighFibre: currentProfile.preferHighFibre,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = (allergy: string) => {
    const trimmed = allergy.trim();
    if (!trimmed || currentProfile.allergies.includes(trimmed)) return;
    setLocalProfile({ ...currentProfile, allergies: [...currentProfile.allergies, trimmed] });
    setAllergyInput("");
  };

  const removeAllergy = (allergy: string) => {
    setLocalProfile({
      ...currentProfile,
      allergies: currentProfile.allergies.filter((a) => a !== allergy),
    });
  };

  const updatePartial = (partial: Partial<ProfileData>) => {
    setLocalProfile({ ...currentProfile, ...partial });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg ahar-gradient text-white">
                <ScanLine className="size-4" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                AHAR <span className="text-primary">X</span>
              </span>
            </div>
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

      <div className="mx-auto max-w-2xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">Profile & Preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set your dietary goals and allergies for personalized AHAR X scoring.
          </p>
        </motion.div>

        <div className="mt-8 space-y-6">
          {/* Dietary Goal */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Dietary Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DIETARY_GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => updatePartial({ dietaryGoal: goal.value })}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        currentProfile.dietaryGoal === goal.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {currentProfile.dietaryGoal === goal.value && (
                          <CheckCircle className="size-4 text-primary shrink-0" />
                        )}
                        <p className="text-sm font-medium">{goal.label}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{goal.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Allergies */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Allergies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentProfile.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive" className="gap-1 pr-1.5">
                        {allergy}
                        <button
                          onClick={() => removeAllergy(allergy)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-destructive-foreground/20"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Type an allergy and press Enter"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAllergy(allergyInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addAllergy(allergyInput)}
                    disabled={!allergyInput.trim()}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Common allergens:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ALLERGIES.filter((a) => !currentProfile.allergies.includes(a)).map((allergy) => (
                      <button
                        key={allergy}
                        onClick={() => addAllergy(allergy)}
                        className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        <Plus className="mr-1 size-3" />
                        {allergy}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preferences */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Scoring Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Avoid Added Sugar</Label>
                    <p className="text-xs text-muted-foreground">
                      Penalize products with added sugars in scoring
                    </p>
                  </div>
                  <Switch
                    checked={currentProfile.avoidAddedSugar}
                    onCheckedChange={(checked) => updatePartial({ avoidAddedSugar: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Avoid Trans Fat</Label>
                    <p className="text-xs text-muted-foreground">
                      Strongly penalize products containing trans fats
                    </p>
                  </div>
                  <Switch
                    checked={currentProfile.avoidTransFat}
                    onCheckedChange={(checked) => updatePartial({ avoidTransFat: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Prefer High Fibre</Label>
                    <p className="text-xs text-muted-foreground">
                      Boost score for products with high fibre content
                    </p>
                  </div>
                  <Switch
                    checked={currentProfile.preferHighFibre}
                    onCheckedChange={(checked) => updatePartial({ preferHighFibre: checked })}
                  />
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Max Calories Per Serving</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Optional limit — flag servings exceeding this calorie count
                  </p>
                  <Input
                    type="number"
                    placeholder="e.g. 300"
                    value={currentProfile.maxCaloriesPerServing ?? ""}
                    onChange={(e) =>
                      updatePartial({
                        maxCaloriesPerServing: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="max-w-[160px]"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 ahar-gradient text-white hover:opacity-90"
              >
                {saving ? (
                  <>Saving...</>
                ) : saved ? (
                  <>
                    <CheckCircle className="size-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save Preferences
                  </>
                )}
              </Button>
              {saved && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Profile saved successfully
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
