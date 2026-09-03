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
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  {
    icon: Camera,
    title: "Snap Front & Back",
    desc: "Upload both sides of any food package — front label and back nutrition panel.",
  },
  {
    icon: Search,
    title: "AI Label Reading",
    desc: "Our vision AI reads and extracts every detail: ingredients, nutrition facts, claims, allergens.",
  },
  {
    icon: Shield,
    title: "FSSAI Compliance",
    desc: "Instant regulatory checks against Indian food safety rules and labeling requirements.",
  },
  {
    icon: BarChart3,
    title: "AHAR X Score",
    desc: "A composite score evaluating transparency, nutrition quality, ingredient integrity, and claims.",
  },
];

const steps = [
  {
    num: "01",
    title: "Upload Front Package",
    desc: "Point your camera or upload the front of any food product — even one never before scanned.",
  },
  {
    num: "02",
    title: "Upload Back Label",
    desc: "Capture the nutrition panel and ingredient list from the back of the same package.",
  },
  {
    num: "03",
    title: "Get Intelligence",
    desc: "AHAR X reads the label, applies FSSAI rules, and delivers a complete analysis with no database lookup.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
          <button
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            {isAuthenticated ? "Open Dashboard" : "Get Started"}
          </button>
        </nav>

        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Leaf className="size-3.5" />
              Label Intelligence — Not a Product Database
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Know What You
              <br />
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Actually Eat
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              AHAR X analyzes the actual package in your hand — front and back —
              to extract real label data, run FSSAI compliance checks, and
              deliver transparent food intelligence.{" "}
              <strong className="text-foreground">
                No product database. No assumptions. Just your label.
              </strong>
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() =>
                  navigate(isAuthenticated ? "/dashboard" : "/auth")
                }
                className="group flex items-center gap-2 rounded-full ahar-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
              >
                Scan a Product Now
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                See how it works ↓
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Key Principle Banner */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-6 py-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-green-600" />
            Works with any unknown product
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-green-600" />
            No database lookup required
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-green-600" />
            Evidence-first analysis
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            Insufficient evidence → never guessed
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Built for Real Label Intelligence
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            Every scan is a fresh analysis. AHAR X reads the package you hold,
            not a catalog entry.
          </motion.p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              custom={i + 2}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-border bg-muted/30 px-6 py-24"
      >
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Three Steps to Full Transparency
            </motion.h2>
          </motion.div>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i + 1}
                className="relative"
              >
                <div className="mb-4 text-4xl font-bold text-primary/20">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
                {i < 2 && (
                  <div className="absolute top-6 right-0 hidden h-px w-12 bg-border md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Front-Back Verification Showcase */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center"
        >
          <motion.h2
            variants={fadeUp}
            custom={0}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Front ↔ Back Verification
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-4 max-w-xl text-muted-foreground"
          >
            AHAR X cross-references what the front claims against what the back
            declares — and flags any inconsistencies.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          custom={2}
          className="mt-12 rounded-2xl border border-border bg-card p-8"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Front Label
              </p>
              <p className="mt-3 text-lg font-medium">
                "Made with <span className="text-primary font-bold">Saffron</span>"
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Back Label
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Ingredients: Milk solids, sugar,{" "}
                <span className="font-semibold text-foreground">
                  saffron (0.1%)
                </span>
                , cardamom
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm">
            <CheckCircle className="size-4 text-green-600 shrink-0" />
            <span>
              <strong>Saffron</strong> — match confirmed, declared at 0.1%
            </span>
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to See What&apos;s Really in Your Food?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            No sign-up walls for basic scanning. Upload two photos and get
            instant, evidence-based food intelligence.
          </p>
          <button
            onClick={() =>
              navigate(isAuthenticated ? "/dashboard" : "/auth")
            }
            className="mt-8 inline-flex items-center gap-2 rounded-full ahar-gradient px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:scale-[1.02]"
          >
            <ScanLine className="size-5" />
            Start Scanning
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScanLine className="size-4 text-primary" />
            AHAR X — Food Label Intelligence
          </div>
          <p className="text-xs text-muted-foreground/60">
            Analysis is based solely on the information visible on the scanned
            package. Not a substitute for professional dietary advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
