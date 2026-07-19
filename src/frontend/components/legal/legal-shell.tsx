import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/frontend/components/ui/theme-toggle";

/* ── Wordmark (mirrors the landing page) ──────────────────── */
function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        <Image
          src="/logo.png"
          alt="Scan&Pay logo"
          width={32}
          height={32}
          className="w-full h-full object-contain dark:invert"
        />
      </div>
      <span className="font-bold text-[15px] tracking-tight text-foreground">
        Scan<span className="text-primary">&amp;</span>Pay
      </span>
    </div>
  );
}

/* ── A numbered legal section ─────────────────────────────── */
export function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border pt-9 mt-9 first:mt-0 first:border-t-0 first:pt-0"
    >
      <h2 className="[font-family:var(--font-display)] text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-4">
        <span className="text-primary tabular-nums">{n}.</span> {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed [&_p]:text-muted [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:text-muted [&_li]:marker:text-primary/50">
        {children}
      </div>
    </section>
  );
}

/* ── Page chrome shared by Terms & Privacy ────────────────── */
export function LegalShell({
  eyebrow,
  title,
  intro,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Back to home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="border border-border text-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-surface-hover transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Home
            </Link>
          </div>
        </div>
      </header>

      {/* ── Header ── */}
      <section className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <p className="text-xs uppercase tracking-[0.16em] text-primary font-bold mb-4">
            {eyebrow}
          </p>
          <h1 className="[font-family:var(--font-display)] text-[clamp(2rem,5vw,3.2rem)] font-extrabold tracking-tight text-foreground leading-[1.1] mb-5">
            {title}
          </h1>
          <p className="text-muted leading-relaxed max-w-xl">{intro}</p>
          <p className="text-xs text-muted/80 mt-6 uppercase tracking-wider">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* ── Body ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <Wordmark />
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Scan&amp;Pay · Built for modern dining.
          </p>
          <div className="flex gap-6 text-xs text-muted">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
