import { useState } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Shield,
  Search,
  BarChart3,
  ScanLine,
  ChevronRight,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { t, LANGUAGE_LABELS, type Language } from "@/lib/i18n";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  { icon: Camera, titleKey: "features.snap", descKey: "features.snapDesc" },
  { icon: Search, titleKey: "features.vision", descKey: "features.visionDesc" },
  { icon: Shield, titleKey: "features.compliance", descKey: "features.complianceDesc" },
  { icon: BarChart3, titleKey: "features.score", descKey: "features.scoreDesc" },
];

const steps = [
  { num: "01", titleKey: "howItWorks.step1.title", descKey: "howItWorks.step1.desc" },
  { num: "02", titleKey: "howItWorks.step2.title", descKey: "howItWorks.step2.desc" },
  { num: "03", titleKey: "howItWorks.step3.title", descKey: "howItWorks.step3.desc" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Language>("en");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 ahar-gradient opacity-[0.07]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />

        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg ahar-gradient text-white">
              <ScanLine className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              AHAR <span className="text-primary">X</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div className="flex items-center gap-1">
              <Globe className="size-4 text-muted-foreground" />
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                <Button key={code} variant={lang === code ? "default" : "ghost"} size="sm" onClick={() => setLang(code)} className="text-xs px-2 h-7">
                  {label}
                </Button>
              ))}
            </div>
            <button
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
            >
              {isAuthenticated ? t("nav.dashboard", lang) : t("nav.signIn", lang)}
            </button>
          </div>
        </nav>

        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-28 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Leaf className="size-3.5" />
              {t("landing.tagline", lang)}
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              {t("landing.title1", lang)}
              <br />
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-600 bg-clip-text text-transparent">
                {t("landing.title2", lang)}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              {t("landing.desc", lang)}{" "}
              <strong className="text-foreground">
                {t("landing.noDatabase", lang)}
              </strong>
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                className="group flex items-center gap-2 rounded-full ahar-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
              >
                {t("landing.cta", lang)}
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {t("landing.howItWorks", lang)}
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Key Principle Banner */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><CheckCircle className="size-4 text-green-600" />{t("features.snap", lang)}</div>
          <div className="flex items-center gap-2"><CheckCircle className="size-4 text-green-600" />{t("features.vision", lang)}</div>
          <div className="flex items-center gap-2"><CheckCircle className="size-4 text-green-600" />{t("features.compliance", lang)}</div>
          <div className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-600" />{t("profile.insufficient", lang)}</div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight sm:text-4xl">{t("features.title", lang)}</motion.h2>
          <motion.p variants={fadeUp} custom={1} className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("features.subtitle", lang)}</motion.p>
        </motion.div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div key={f.titleKey} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i + 2} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white"><f.icon className="size-5" /></div>
              <h3 className="text-base font-semibold">{t(f.titleKey, lang)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(f.descKey, lang)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center">
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl font-bold tracking-tight sm:text-4xl">{t("howItWorks.title", lang)}</motion.h2>
          </motion.div>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} custom={i + 1} className="relative">
                <div className="mb-4 text-4xl font-bold text-primary/20">{s.num}</div>
                <h3 className="text-lg font-semibold">{t(s.titleKey, lang)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(s.descKey, lang)}</p>
                {i < 2 && <div className="absolute top-6 right-0 hidden h-px w-12 bg-border md:block" />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("landing.cta", lang)}</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{t("landing.noDatabase", lang)}</p>
          <button onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")} className="mt-8 inline-flex items-center gap-2 rounded-full ahar-gradient px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:scale-[1.02]">
            <ScanLine className="size-5" />{t("landing.cta", lang)}
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScanLine className="size-4 text-primary" />AHAR X — Food Label Intelligence
          </div>
          <p className="text-xs text-muted-foreground/60">{t("limitations.standard", lang)}</p>
        </div>
      </footer>
    </div>
  );
}
