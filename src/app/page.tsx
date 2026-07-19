import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  QrCode,
  ListOrdered,
  CreditCard,
  ChefHat,
  LineChart,
  Bell,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { ThemeToggle } from "@/frontend/components/ui/theme-toggle";
import { FadeIn } from "@/frontend/components/ui/fade-in";

/* ── Wordmark ─────────────────────────────────────────────── */
function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        <Image src="/logo.png" alt="Scan&Pay logo" width={32} height={32} className="w-full h-full object-contain dark:invert" />
      </div>
      <span className="font-bold text-[15px] tracking-tight text-foreground">
        Scan<span className="text-primary">&amp;</span>Pay
      </span>
    </div>
  );
}

/* ── Browser-frame dashboard mockup ──────────────────────── */
function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "300ms" }}>

      {/* Main card */}
      <div style={{ background: "#13120f", border: "1px solid #2a2620", borderRadius: "20px", overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e1c19" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#2a2620", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChefHat size={14} color="#9a8578" />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#e8e2db", letterSpacing: "-0.02em" }}>Blue Tokai Coffee</div>
              <div style={{ fontSize: "10px", color: "#5a5248" }}>Koramangala, Bengaluru</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(90,122,74,0.15)", border: "1px solid rgba(90,122,74,0.3)", borderRadius: "99px", padding: "4px 10px" }}>
            <span className="animate-pulse" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#5a7a4a", display: "block" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#5a7a4a" }}>Live</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1px", background: "#1e1c19", borderBottom: "1px solid #1e1c19" }}>
          {[
            { label: "Today's Revenue", value: "₹12,840", sub: "+18% vs yesterday", subColor: "#5a7a4a" },
            { label: "Orders",          value: "24",       sub: "since 9 AM",        subColor: "#5a5248" },
            { label: "Pending",         value: "3",        sub: "need action",       subColor: "#7a5a30" },
            { label: "Completed",       value: "21",       sub: "today",             subColor: "#5a5248" },
          ].map(s => (
            <div key={s.label} style={{ background: "#13120f", padding: "14px 16px" }}>
              <div style={{ fontSize: "9px", color: "#5a5248", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "6px" }}>{s.label}</div>
              <div className="[font-family:var(--font-jb-mono)]" style={{ fontSize: "18px", fontWeight: 700, color: "#e8e2db", letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "9px", color: s.subColor, marginTop: "4px" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* New order — highlighted */}
        <div style={{ margin: "14px 16px 8px", background: "rgba(90,122,74,0.08)", border: "1px solid rgba(90,122,74,0.25)", borderRadius: "12px", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#5a7a4a", borderRadius: "3px 0 0 3px" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, background: "rgba(90,122,74,0.2)", color: "#5a7a4a", padding: "2px 7px", borderRadius: "99px", letterSpacing: "0.06em" }}>NEW</span>
              <span className="[font-family:var(--font-jb-mono)]" style={{ fontSize: "11px", fontWeight: 700, color: "#e8e2db" }}>#1047</span>
              <span style={{ fontSize: "10px", color: "#5a5248" }}>just now</span>
            </div>
            <span className="[font-family:var(--font-jb-mono)]" style={{ fontSize: "14px", fontWeight: 700, color: "#e8e2db" }}>₹520</span>
          </div>
          <div style={{ fontSize: "11px", color: "#9a8578", marginBottom: "10px" }}>Cold Brew × 2, Avocado Toast</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1, background: "#5a7a4a", borderRadius: "7px", padding: "7px 0", textAlign: "center", fontSize: "10px", fontWeight: 700, color: "#fff" }}>Accept</div>
            <div style={{ flex: 1, background: "#2a2620", borderRadius: "7px", padding: "7px 0", textAlign: "center", fontSize: "10px", fontWeight: 600, color: "#9a8578" }}>View Details</div>
          </div>
        </div>

        {/* Older orders */}
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column" as const, gap: "6px" }}>
          {[
            { id: "#1046", items: "Cappuccino × 2, Croissant", amt: "₹460", status: "Preparing", statusBg: "rgba(122,90,48,0.18)", statusColor: "#c4874a" },
            { id: "#1045", items: "Masala Chai × 3",           amt: "₹270", status: "Ready",     statusBg: "rgba(90,122,74,0.15)", statusColor: "#5a7a4a" },
            { id: "#1044", items: "Club Sandwich, Iced Tea",   amt: "₹380", status: "Done",      statusBg: "rgba(90,82,72,0.2)",  statusColor: "#6a5a50" },
          ].map(row => (
            <div key={row.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "#1a1816", borderRadius: "9px", border: "1px solid #2a2620" }}>
              <span className="[font-family:var(--font-jb-mono)]" style={{ fontSize: "10px", fontWeight: 700, color: "#5a5248", width: "38px", flexShrink: 0 }}>{row.id}</span>
              <span style={{ flex: 1, fontSize: "10px", color: "#7a6e66", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.items}</span>
              <span className="[font-family:var(--font-jb-mono)]" style={{ fontSize: "11px", fontWeight: 700, color: "#9a8578", flexShrink: 0 }}>{row.amt}</span>
              <span style={{ fontSize: "9px", fontWeight: 700, padding: "3px 9px", borderRadius: "99px", background: row.statusBg, color: row.statusColor, flexShrink: 0 }}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating payment toast */}
      <div className="hidden lg:flex items-center gap-3" style={{
        position: "absolute", top: "-16px", right: "-20px",
        background: "#1a1816", border: "1px solid #2a2620",
        borderRadius: "14px", padding: "11px 15px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "rgba(90,122,74,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <TrendingUp size={14} color="#5a7a4a" />
        </div>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#e8e2db", marginBottom: "2px" }}>Payment confirmed</div>
          <div style={{ fontSize: "10px", color: "#5a5248" }}>#1047 · ₹520 via PhonePe</div>
        </div>
      </div>

    </div>
  );
}

/* ── Marquee strip ────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  "Zero friction", "No app needed", "PhonePe payments",
  "Real-time orders", "QR menus", "Instant kitchen alerts",
  "Live analytics", "Multi-table view", "Scan to order", "Setup in minutes",
];

function MarqueeStrip() {
  const items = (
    <div className="flex items-center gap-10 flex-shrink-0 pr-10">
      {MARQUEE_ITEMS.map(item => (
        <span key={item} className="inline-flex items-center gap-4 text-[11px] uppercase tracking-[0.14em] text-muted font-medium">
          {item}
          <span className="text-primary opacity-50">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="border-y border-border py-4 overflow-hidden bg-surface/50">
      <div className="animate-marquee">
        {items}
        {items}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="landing-page min-h-screen bg-background text-foreground antialiased overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 w-full z-50 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Wordmark /></Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#problems"     className="text-muted hover:text-foreground transition-colors text-sm font-medium">Problems</a>
            <a href="#how-it-works" className="text-muted hover:text-foreground transition-colors text-sm font-medium">How it works</a>
            <a href="#for-cafes"    className="text-muted hover:text-foreground transition-colors text-sm font-medium">For cafes</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="bg-primary text-white hover:bg-primary-dark px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-primary/20"
            >
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── (centered, above the fold) ── */}
      <section className="relative overflow-hidden min-h-[100dvh] flex flex-col justify-center pt-16">

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 animate-fade-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              QR Ordering Platform · India
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>

          {/* Headline — Syne display font */}
          <h1
            className="[font-family:var(--font-display)] text-[clamp(2.4rem,5vw,4.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground max-w-4xl mb-6 animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
          >
            Let customers order.
            <br />
            <span className="text-primary">Let staff focus.</span>
          </h1>

          {/* Subtext */}
          <p
            className="text-muted text-[1.05rem] leading-relaxed max-w-xl mb-10 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            Customers scan a QR code at their table, browse your live menu, and pay via PhonePe. No waiter, no app, no wait.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap justify-center gap-3 mb-6 animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/login"
              className="bg-primary text-white px-7 py-3.5 rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-lg shadow-primary/25"
            >
              Open Dashboard
              <ArrowRight size={15} />
            </Link>
            <a
              href="#how-it-works"
              className="border border-border text-foreground px-7 py-3.5 rounded-xl text-sm font-semibold hover:bg-surface-hover transition-all flex items-center gap-2"
            >
              See how it works
            </a>
          </div>

          {/* Trust signals */}
          <div
            className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 animate-fade-in-up text-xs text-muted"
            style={{ animationDelay: "220ms" }}
          >
            {["No app required", "PhonePe payments", "Setup in minutes"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-primary flex-shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard mockup (below the fold) ── */}
      <section className="bg-background pb-0 pt-16 sm:pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardMockup />
        </div>
      </section>

      {/* ── Marquee ── */}
      <div className="mt-16 sm:mt-20">
        <MarqueeStrip />
      </div>

      {/* ── Problems ── (editorial) ── */}
      <section id="problems" className="bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">

          <FadeIn className="mb-12">
            <p className="text-xs uppercase tracking-[0.16em] text-primary font-bold mb-5">
              The problem
            </p>
            <h2 className="[font-family:var(--font-display)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight text-foreground max-w-xl leading-tight">
              Traditional ordering costs more than you think.
            </h2>
          </FadeIn>

          {/* Editorial list */}
          <div>
            {[
              {
                num: "01",
                title: "Waiters stretched thin",
                desc: "Too many tables, not enough hands. Orders get delayed, mistakes happen, and customers leave before ordering a second round.",
              },
              {
                num: "02",
                title: "Menus that can't keep up",
                desc: "A dish runs out but the laminated menu doesn't know. Your staff gets stuck in awkward conversations instead of delivering great service.",
              },
              {
                num: "03",
                title: "Payment creates a queue",
                desc: "The bill-splitting dance. Hunting for change. Waiting for a receipt. Payment friction is every cafe's least favourite closing act.",
              },
            ].map((item, i) => (
              <FadeIn key={item.num} delay={i * 80}>
                <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[96px_1fr] gap-6 sm:gap-10 py-9 border-t border-border group cursor-default">
                  <div
                    className="[font-family:var(--font-display)] text-[2.5rem] sm:text-[3rem] font-extrabold text-border leading-none pt-1 tabular-nums group-hover:text-primary/20 transition-colors duration-300"
                  >
                    {item.num}
                  </div>
                  <div className="py-1">
                    <h3 className="text-[17px] sm:text-xl font-bold text-foreground mb-2.5 group-hover:text-primary transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-muted leading-relaxed text-[14px] sm:text-[15px] max-w-lg">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
            <div className="border-t border-border" />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t border-border bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">

          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.16em] text-primary font-bold mb-5">
              For customers
            </p>
            <h2 className="[font-family:var(--font-display)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight text-foreground mb-4">
              From seat to served in 3 steps.
            </h2>
            <p className="text-muted max-w-md mx-auto leading-relaxed">
              No downloads. No sign-ups. Just point your camera.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                icon: <QrCode size={20} />,
                title: "Scan the QR",
                desc: "Point your camera at the code on your table. The menu opens instantly in your browser. No app, no account needed.",
              },
              {
                num: "02",
                icon: <ListOrdered size={20} />,
                title: "Browse and order",
                desc: "Scroll through the full menu, add items to your cart, and review before confirming. It takes under a minute.",
              },
              {
                num: "03",
                icon: <CreditCard size={20} />,
                title: "Pay with PhonePe",
                desc: "Tap to pay securely. Your order fires to the kitchen the instant payment clears. No waiting for a waiter.",
              },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 100}>
                <div className="flex flex-col bg-background border border-border rounded-2xl p-7 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      {step.icon}
                    </div>
                    <span className="[font-family:var(--font-display)] text-4xl font-extrabold text-border leading-none tabular-nums">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground mb-2.5">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── For cafes — bento ── */}
      <section id="for-cafes" className="border-t border-border bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">

          <FadeIn className="mb-16">
            <p className="text-xs uppercase tracking-[0.16em] text-primary font-bold mb-5">
              For cafe owners
            </p>
            <h2 className="[font-family:var(--font-display)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight text-foreground leading-tight">
              Everything your cafe needs.
              <br />
              <span className="text-muted">Nothing it doesn&apos;t.</span>
            </h2>
          </FadeIn>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 md:gap-5">

            {/* Live Orders — tall, primary card */}
            <FadeIn className="md:row-span-2">
              <div className="h-full bg-primary/[0.06] border border-primary/20 rounded-2xl p-8 hover:border-primary/35 transition-colors flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-6 flex-shrink-0">
                  <Bell size={22} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Live order stream</h3>
                <p className="text-muted leading-relaxed mb-6 text-[15px]">
                  New orders appear on your screen the instant they&apos;re placed. Move orders through prep stages with a single tap. No refresh, no delay.
                </p>

                {/* Mock order feed */}
                <div className="rounded-xl border border-primary/15 bg-background/60 overflow-hidden mb-6 flex-shrink-0">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/10">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Live feed</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-success font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                      Connected
                    </span>
                  </div>
                  {[
                    { id: "#1042", items: "Cappuccino × 2, Croissant", amt: "₹460", status: "New", statusColor: "text-success bg-success/10" },
                    { id: "#1041", items: "Club Sandwich, Iced Tea", amt: "₹380", status: "Preparing", statusColor: "text-warning bg-warning/10" },
                    { id: "#1040", items: "Masala Chai × 3", amt: "₹270", status: "Ready", statusColor: "text-info bg-info/10" },
                  ].map((order, i) => (
                    <div key={order.id} className={`flex items-center justify-between px-4 py-3 ${i !== 2 ? "border-b border-primary/10" : ""}`}>
                      <div>
                        <p className="text-xs font-bold text-foreground">{order.id} &middot; {order.amt}</p>
                        <p className="text-[11px] text-muted mt-0.5 truncate max-w-[200px]">{order.items}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.statusColor}`}>{order.status}</span>
                    </div>
                  ))}
                </div>

                <ul className="space-y-3 mt-auto">
                  {[
                    "Real-time push via Server-Sent Events",
                    "One-tap status: Preparing → Ready → Done",
                    "Full order history and itemised receipts",
                    "Visual + audio alerts for new orders",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-muted">
                      <CheckCircle size={14} className="mt-0.5 text-primary flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            {/* Menu management */}
            <FadeIn delay={100}>
              <div className="bg-surface border border-border rounded-2xl p-7 hover:border-primary/20 transition-colors group h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors duration-300 flex-shrink-0">
                  <ChefHat size={18} />
                </div>
                <h3 className="text-[15px] font-bold text-foreground mb-2">Menu management</h3>
                <p className="text-sm text-muted leading-relaxed mb-5 flex-1">
                  Add, edit, or disable items and categories. Changes go live on every table QR instantly. No reprinting, no waiting.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Image uploads", "Category toggles", "Instant sync"].map((t) => (
                    <span key={t} className="text-[11px] bg-background text-muted px-2.5 py-1 rounded-full font-medium border border-border">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Analytics */}
            <FadeIn delay={180}>
              <div className="bg-surface border border-border rounded-2xl p-7 hover:border-primary/20 transition-colors group h-full flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors duration-300 flex-shrink-0">
                  <LineChart size={18} />
                </div>
                <h3 className="text-[15px] font-bold text-foreground mb-2">Deep insights</h3>
                <p className="text-sm text-muted leading-relaxed mb-5 flex-1">
                  Peak hours, top sellers, revenue breakdown. The metrics that drive real decisions, not vanity numbers.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Hourly charts", "Item revenue", "Customer trends"].map((t) => (
                    <span key={t} className="text-[11px] bg-background text-muted px-2.5 py-1 rounded-full font-medium border border-border">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-t border-border bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
              {[
                { value: "10k+",    label: "Orders processed" },
                { value: "5+",      label: "Partner cafes" },
                { value: "< 2 min", label: "Avg order time" },
                { value: "100%",    label: "Contactless" },
              ].map((s) => (
                <div key={s.label} className="bg-surface flex flex-col items-center justify-center py-10 px-6 text-center">
                  <div className="[font-family:var(--font-display)] text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight text-foreground leading-none mb-2.5 tabular-nums">
                    {s.value}
                  </div>
                  <div className="text-[11px] text-muted uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-border bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <FadeIn>
            <div className="relative bg-primary rounded-3xl px-8 sm:px-16 py-16 sm:py-20 text-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-white/10 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10">
                <p className="text-white/60 text-xs uppercase tracking-[0.18em] font-bold mb-5">
                  Get started today
                </p>
                <h2 className="[font-family:var(--font-display)] text-[clamp(1.8rem,4.5vw,3.2rem)] font-extrabold tracking-tight text-white mb-5 leading-tight">
                  Your cafe&apos;s first QR order<br />is minutes away.
                </h2>
                <p className="text-white/60 text-base max-w-sm mx-auto mb-9 leading-relaxed">
                  Sign in to get your cafe onboarded and taking orders fast.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors shadow-lg"
                >
                  Open Dashboard
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">

          {/* Top: brand + links */}
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <Wordmark />
              <p className="mt-4 text-sm leading-relaxed text-muted">
                QR ordering and payments for modern cafes. Scan, order, pay. No app, no wait.
              </p>
            </div>

            <nav className="flex flex-col gap-3.5 sm:items-end">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted/60">
                Legal
              </span>
              <Link href="/privacy" className="text-sm text-muted hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>

          {/* Divider + meta */}
          <div className="mt-12 flex flex-col gap-3 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              &copy; {new Date().getFullYear()} Scan&amp;Pay. All rights reserved.
            </p>
            <p className="text-xs text-muted/80">
              Built for modern dining · Made in Bengaluru, India
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
