import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

export const Hero = () => (
  <section className="relative min-h-screen flex items-end pb-24 overflow-hidden">
    {/* Background image */}
    <img
      src={heroBg}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
    />
    <div className="absolute inset-0 hero-overlay" />

    {/* Top bar */}
    <div className="absolute top-0 left-0 right-0 z-20">
      <div className="container max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-[2px] bg-gold" />
          <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-gold">
            NLD Synapse 2026
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {[
            { label: "Overview", href: "#overview" },
            { label: "Baseline", href: "#baseline" },
            { label: "Recalibration", href: "#recalibration" },
            { label: "Optimization", href: "#optimization" },
            { label: "Verdict", href: "#verdict" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="font-sans text-[13px] text-foreground/50 hover:text-gold transition-colors tracking-wide"
            >
              {label}
            </a>
          ))}
          <Link
            to="/dashboard"
            className="font-sans text-[13px] font-medium text-gold hover:text-gold/80 transition-colors tracking-wide flex items-center gap-2"
          >
            <span>Dashboard</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>
        </nav>
      </div>
      <div className="section-divider" />
    </div>

    {/* Hero content */}
    <div className="container max-w-7xl mx-auto px-8 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-[1px] bg-gold" />
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-gold/80">
            Data Analytics Finale
          </span>
        </div>

        <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-[0.9] mb-6">
          <span className="text-foreground">Decode</span>
          <br />
          <span className="gold-text italic">X</span>
        </h1>

        <p className="font-sans text-lg md:text-xl text-foreground/40 max-w-xl mb-10 leading-relaxed font-light">
          Diagnosis → Adaptation → Constrained Optimization
        </p>

        <div className="flex flex-wrap items-center gap-6 mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-gold/50 bg-gold/10 text-gold font-sans text-sm font-medium hover:bg-gold/20 hover:border-gold/70 transition-colors"
          >
            <span>Open interactive dashboard</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <div className="flex flex-wrap gap-12 mb-8">
          <HeroStat label="Team" value="Your Team" />
          <HeroStat label="Case No." value="XX" />
          <HeroStat label="Date" value="28 Feb — 01 Mar" />
          <HeroStat label="Institution" value="N. L. Dalmia IMSR" />
        </div>
      </motion.div>
    </div>

    {/* Stage progress bar at bottom */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="absolute bottom-0 left-0 right-0 z-20"
    >
      <div className="container max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-3 border-t border-border/40">
          {[
            { n: "01", label: "Baseline Analysis", time: "11:00 AM" },
            { n: "02", label: "Regime Shift", time: "7:00 PM" },
            { n: "03", label: "Board Directive", time: "1:00 AM" },
          ].map((s, i) => (
            <div
              key={s.n}
              className={`py-5 px-4 flex items-center gap-4 ${
                i < 2 ? "border-r border-border/40" : ""
              }`}
            >
              <span className="font-serif text-2xl text-gold/60 font-semibold">{s.n}</span>
              <div>
                <p className="text-[13px] font-medium text-foreground/80">{s.label}</p>
                <p className="font-mono text-[10px] text-foreground/30 tracking-wider">{s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  </section>
);

const HeroStat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold/50 mb-1">{label}</p>
    <p className="font-sans text-sm text-foreground/80 font-medium">{value}</p>
  </div>
);
