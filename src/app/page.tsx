import Link from "next/link";
import LinqMeLogo from "@/components/LinqMeLogo";
import ThemeToggle from "@/components/ThemeToggle";
import ScrollReveal from "@/components/ScrollReveal";
import VantaFog from "@/components/VantaFog";
import HomePricingTeaser from "./HomePricingTeaser";
import { getSession } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "/login";
  return (
    <main className="min-h-screen flex flex-col selection:bg-primary/30">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-4 bg-background/70 backdrop-blur-2xl border-b border-on-surface/[0.04]">
        <Link href="/" className="flex items-center gap-2.5">
          <LinqMeLogo variant="auto" className="h-7 w-auto text-primary" />
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="#features">Features</a>
          <a className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="#how-it-works">How It Works</a>
          <Link className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="/pricing">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle showAuto={false} />
          <div className="h-5 w-px bg-on-surface/10 hidden sm:block" />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] active:scale-[0.97] transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                Sign in
              </Link>
              <Link
                href={`${appUrl}/signup`}
                className="px-5 py-2 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] active:scale-[0.97] transition-all duration-300"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
          HERO — gradient mesh + dot grid + big glows
         ═══════════════════════════════════════════════ */}
      <section className="relative pt-36 md:pt-44 pb-24 md:pb-32 px-6 overflow-hidden">
        <VantaFog />
        <div className="absolute inset-0 bg-dot-grid pointer-events-none" />
        {/* Big radial spotlight */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-primary/[0.15] rounded-full blur-[150px] pointer-events-none" />
        {/* Secondary glow */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[500px] bg-tertiary/[0.10] rounded-full blur-[120px] pointer-events-none" />

        {/* Floating orbs - bigger and brighter */}
        <div className="absolute top-28 left-[8%] w-5 h-5 rounded-full bg-primary/40 blur-[3px] float hidden md:block" />
        <div className="absolute top-44 right-[10%] w-3.5 h-3.5 rounded-full bg-tertiary/50 blur-[2px] float-delayed hidden md:block" />
        <div className="absolute bottom-24 left-[15%] w-4 h-4 rounded-full bg-inverse-primary/35 blur-[3px] float hidden md:block" />
        <div className="absolute bottom-36 right-[20%] w-3 h-3 rounded-full bg-primary/30 blur-[2px] float-delayed hidden md:block" />
        <div className="absolute top-60 left-[42%] w-2 h-2 rounded-full bg-tertiary/40 float hidden md:block" />
        <div className="absolute top-72 right-[35%] w-2.5 h-2.5 rounded-full bg-primary/25 float hidden md:block" />

        {/* Breathing rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-primary/10 animate-glow-breathe pointer-events-none hidden md:block" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full border border-primary/[0.06] animate-glow-breathe pointer-events-none hidden md:block" style={{ animationDelay: "2s" }} />

        {/* Force light text — Vanta fog is always dark regardless of theme */}
        <div className="max-w-5xl mx-auto text-center relative z-10 text-white">
          <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/15 mb-8 shadow-[0_0_20px_rgba(var(--color-primary),0.12)]">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-glow-pulse" />
            <span className="text-xs font-semibold text-primary tracking-wide">Now in Public Beta</span>
          </div>

          <h1 className="animate-fade-up delay-1 text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold tracking-tight mb-8 leading-[1.1] text-white">
            Your Agency&apos;s
            <br />
            <span className="gradient-text-hero">Command Center.</span>
          </h1>

          <p className="animate-fade-up delay-2 max-w-2xl mx-auto text-lg md:text-xl text-white/70 font-body mb-12 leading-relaxed">
            Build custom forms, collect client data and files, manage entries,
            and visualize it all with real-time insights, under your own brand.
          </p>

          <div className="animate-fade-up delay-3 flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="group relative px-8 py-4 bg-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_40px_rgba(var(--color-primary),0.35)] transition-all duration-500 text-base"
              >
                Go to Dashboard
                <i className="fa-solid fa-arrow-right ml-2 text-sm group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="group relative px-8 py-4 bg-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_40px_rgba(var(--color-primary),0.35)] transition-all duration-500 text-base"
                >
                  Get Started Free
                  <i className="fa-solid fa-arrow-right ml-2 text-sm group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-xl hover:border-primary/40 hover:bg-white/[0.12] transition-all duration-300 text-white font-medium"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>

          <p className="animate-fade-up delay-4 text-xs text-white/40">
            <span className="text-primary/80">Free forever</span> &middot; <span className="text-tertiary/80">No credit card required</span> &middot; <span className="text-primary/80">White-label ready</span>
          </p>
        </div>

        {/* Hero dashboard composition */}
        <div className="animate-slide-up delay-5 max-w-5xl mx-auto mt-16 md:mt-20 relative">
          {/* Main dashboard window */}
          <div className="gradient-border rounded-2xl">
            <div className="relative rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/10 shadow-[0_32px_80px_rgba(0,0,0,0.3)]">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 bg-surface-container-high/50 border-b border-outline-variant/10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-6 rounded-lg bg-surface-container-lowest/60 flex items-center px-3">
                    <i className="fa-solid fa-lock text-[8px] text-tertiary/60 mr-2" />
                    <span className="text-[10px] text-on-surface-variant/40 font-mono">youragency.linqme.io</span>
                  </div>
                </div>
              </div>
              {/* Dashboard content */}
              <div className="p-5 md:p-8">
                <div className="flex gap-5">
                  {/* Sidebar */}
                  <div className="w-44 shrink-0 hidden md:block space-y-5">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <i className="fa-solid fa-rocket text-[10px] text-primary" />
                      </div>
                      <span className="text-xs font-bold text-on-surface">Acme Creative</span>
                    </div>
                    <div className="space-y-1">
                      {[
                        { icon: "fa-table-cells", label: "Dashboard", active: true },
                        { icon: "fa-pen-ruler", label: "Forms", active: false },
                        { icon: "fa-inbox", label: "Entries", active: false },
                        { icon: "fa-users", label: "Accounts", active: false },
                        { icon: "fa-lightbulb", label: "Insights", active: false },
                        { icon: "fa-chart-pie", label: "Analytics", active: false },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] ${item.active ? "bg-primary/10 text-primary font-semibold" : "text-on-surface-variant/50"}`}>
                          <i className={`fa-solid ${item.icon} text-[10px]`} />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 space-y-5">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-on-surface">Welcome back, Sarah</div>
                        <div className="text-[11px] text-on-surface-variant/50">5 new entries this week</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 px-3 bg-primary/15 rounded-lg flex items-center gap-1.5 text-[11px] text-primary font-semibold">
                          <i className="fa-solid fa-plus text-[9px]" /> New Form
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-surface-container-low/80 border border-outline-variant/[0.06] border-l-2 border-l-primary/40 p-3.5">
                        <div className="text-[10px] text-on-surface-variant/50 mb-1">Active Forms</div>
                        <div className="text-xl font-bold text-primary">12</div>
                        <div className="text-[10px] text-tertiary mt-0.5"><i className="fa-solid fa-arrow-up text-[8px]" /> 3 new this month</div>
                      </div>
                      <div className="rounded-xl bg-surface-container-low/80 border border-outline-variant/[0.06] border-l-2 border-l-tertiary/40 p-3.5">
                        <div className="text-[10px] text-on-surface-variant/50 mb-1">Total Entries</div>
                        <div className="text-xl font-bold text-tertiary">248</div>
                        <div className="text-[10px] text-tertiary mt-0.5"><i className="fa-solid fa-arrow-up text-[8px]" /> 18 this week</div>
                      </div>
                      <div className="rounded-xl bg-surface-container-low/80 border border-outline-variant/[0.06] border-l-2 border-l-primary/40 p-3.5">
                        <div className="text-[10px] text-on-surface-variant/50 mb-1">Accounts</div>
                        <div className="text-xl font-bold text-primary">36</div>
                        <div className="text-[10px] text-primary mt-0.5"><i className="fa-solid fa-check text-[8px]" /> 92% complete</div>
                      </div>
                    </div>

                    {/* Recent submissions list */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">Recent Entries</div>
                      {[
                        { name: "Bloom Agency", status: "Complete", statusColor: "tertiary", time: "2h ago", progress: 100 },
                        { name: "Horizon Digital", status: "In Progress", statusColor: "primary", time: "5h ago", progress: 65 },
                        { name: "Bloom Studio", status: "Pending Review", statusColor: "warning", time: "1d ago", progress: 100 },
                      ].map((item) => (
                        <div key={item.name} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-low/60 border border-outline-variant/[0.05]">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{item.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-on-surface">{item.name}</div>
                            <div className="w-full h-1 bg-surface-container-high rounded-full mt-1.5">
                              <div className={`h-1 rounded-full bg-${item.statusColor}/40`} style={{ width: `${item.progress}%` }} />
                            </div>
                          </div>
                          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${item.statusColor}/10 text-${item.statusColor}`}>{item.status}</div>
                          <div className="text-[10px] text-on-surface-variant/40 hidden sm:block">{item.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Floating UI cards overlaying the dashboard ── */}

          {/* Floating notification card — top right */}
          <div className="absolute -top-6 -right-4 md:-right-12 z-20 animate-fade-up delay-6 hidden md:block">
            <div className="glass-panel-strong rounded-xl border border-outline-variant/15 p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.3)] w-56">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-full bg-tertiary/15 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-bell text-[10px] text-tertiary" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-on-surface">New Entry</div>
                  <div className="text-[9px] text-on-surface-variant/50">Just now</div>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant/70 leading-relaxed">
                Bloom Agency submitted their brand intake form with 12 uploaded files.
              </div>
            </div>
          </div>

          {/* Floating stats card — bottom left */}
          <div className="absolute -bottom-8 -left-4 md:-left-10 z-20 animate-fade-up delay-7 hidden md:block">
            <div className="glass-panel-strong rounded-xl border border-outline-variant/15 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.3)] w-52">
              <div className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-semibold mb-2">This Month</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-headline font-bold gradient-text">18</span>
                <span className="text-[11px] text-on-surface-variant/60">entries</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <i className="fa-solid fa-arrow-trend-up text-[10px] text-tertiary" />
                <span className="text-[10px] text-tertiary font-medium">+23% vs last month</span>
              </div>
            </div>
          </div>

          {/* Floating file upload card — mid right */}
          <div className="absolute top-1/2 -right-6 md:-right-16 -translate-y-1/4 z-20 animate-fade-up delay-8 hidden lg:block">
            <div className="glass-panel-strong rounded-xl border border-outline-variant/15 p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.3)] w-48">
              <div className="text-[10px] font-semibold text-on-surface mb-2">Files Uploaded</div>
              <div className="space-y-1.5">
                {[
                  { name: "logo-final.svg", icon: "fa-file-image", color: "primary" },
                  { name: "brand-guide.pdf", icon: "fa-file-pdf", color: "error" },
                  { name: "copy-deck.docx", icon: "fa-file-word", color: "tertiary" },
                ].map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-[10px]">
                    <i className={`fa-solid ${f.icon} text-${f.color}/60`} />
                    <span className="text-on-surface-variant/70 truncate">{f.name}</span>
                    <i className="fa-solid fa-check text-[8px] text-tertiary ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow under dashboard */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-primary/15 blur-[80px] rounded-full" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TRUST STRIP — scanlines + bright spotlight
         ═══════════════════════════════════════════════ */}
      <section className="relative py-14 border-y border-primary/[0.08] overflow-hidden">
        <div className="absolute inset-0 bg-scanlines pointer-events-none" />
        <div className="absolute inset-0 bg-spotlight pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <ScrollReveal animation="fade-in">
            <p className="text-xs uppercase tracking-[0.25em] text-on-surface-variant/40 font-semibold mb-6">Powering agencies and creative teams worldwide</p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 items-center text-on-surface-variant/20">
              {["Agency Co", "Studio X", "PixelForge", "BrandHive", "CreativOps"].map((name, i) => {
                const colors = ["text-[#4285F4]/50", "text-[#DB4437]/50", "text-[#0F9D58]/50", "text-[#F4B400]/50", "text-[#4285F4]/50"];
                return (
                  <span key={name} className={`text-lg md:text-xl font-headline font-bold tracking-tight hover:${colors[i]} transition-colors duration-500`}>{name}</span>
                );
              })}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          STATS — ripple rings + bold corner glows
         ═══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-ripple pointer-events-none" />
        <div className="absolute inset-0 bg-corner-glow pointer-events-none" />
        {/* Extra color wash */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/[0.08] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[350px] bg-tertiary/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <ScrollReveal animation="fade-up" delay={0}><StatBlock value="10,000+" label="Entries collected" icon="fa-paper-plane" color="blue" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}><StatBlock value="500+" label="Agencies onboard" icon="fa-building" color="red" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={200}><StatBlock value="99.9%" label="Uptime SLA" icon="fa-shield-halved" color="green" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={300}><StatBlock value="30+" label="Field types available" icon="fa-cube" color="amber" /></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          HOW IT WORKS — topo lines + big blobs
         ═══════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-24 md:py-32 overflow-hidden bg-surface-container-low/30">
        <div className="absolute inset-0 bg-topo pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        {/* Vivid accent blobs */}
        <div className="absolute top-10 right-[5%] w-[400px] h-[400px] bg-tertiary/[0.08] rounded-full blur-[120px] pointer-events-none animate-glow-breathe" />
        <div className="absolute bottom-10 left-[0%] w-[350px] h-[350px] bg-primary/[0.08] rounded-full blur-[100px] pointer-events-none animate-glow-breathe" style={{ animationDelay: "3s" }} />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block text-xs font-bold text-tertiary uppercase tracking-[0.2em] mb-4">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-on-surface leading-tight">
              Build it. Share it.<br className="hidden md:block" /> <span className="gradient-text">Know everything.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <ScrollReveal animation="fade-up" delay={0}><StepCard num={1} title="Build Your Forms" desc="Use the drag-and-drop builder to create multi-step forms with 30+ field types including file uploads, packages, repeaters, conditional logic, and more." icon="fa-pen-ruler" color="blue" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={150}><StepCard num={2} title="Collect Data & Files" desc="Share a white-labeled link with clients. They fill it out step by step, upload files, and auto-save as they go. No login needed." icon="fa-inbox" color="green" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={300}><StepCard num={3} title="Analyze & Act" desc="Every entry flows into your dashboard. Build custom Insights widgets, export to CSV or PDF, manage accounts, and track trends over time." icon="fa-chart-pie" color="amber" /></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURES — crosshatch + aurora wash
         ═══════════════════════════════════════════════ */}
      <section id="features" className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-crosshatch pointer-events-none" />
        <div className="absolute inset-0 bg-aurora pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        {/* Big tertiary blob */}
        <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[400px] bg-tertiary/[0.09] rounded-full blur-[130px] pointer-events-none" />
        {/* Additional primary blob top-right */}
        <div className="absolute top-[15%] right-[-3%] w-[400px] h-[350px] bg-primary/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Features</span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4">Everything Your Agency <span className="gradient-text">Needs</span></h2>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto">Forms, entries, insights, team management, and white-label branding. All in one platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ScrollReveal animation="slide-left" delay={0} className="md:col-span-2">
              <div className="group relative rounded-2xl overflow-hidden glow-card h-full">
                <div className="gradient-border rounded-2xl h-full">
                  <div className="relative glass-panel noise-overlay p-8 md:p-10 rounded-2xl min-h-[220px] flex flex-col justify-end border-t-4 border-t-primary/40">
                    <div className="absolute top-6 right-6 w-14 h-14 rounded-2xl bg-[#4285F4]/15 flex items-center justify-center text-[#4285F4] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_30px_rgba(66,133,244,0.2)] transition-all duration-500">
                      <i className="fa-solid fa-wand-magic-sparkles text-xl" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 relative z-10">Total White-Labeling</h3>
                    <p className="text-on-surface-variant max-w-md relative z-10">Your brand, your domain, your colors. Clients see your portal, not ours.</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="slide-right" delay={100}>
              <div className="group relative rounded-2xl overflow-hidden glow-card h-full">
                <div className="relative bg-surface-container-high/60 noise-overlay p-8 rounded-2xl border border-outline-variant/10 min-h-[220px] flex flex-col justify-end border-t-4 border-t-[#0F9D58]/40">
                  <div className="absolute top-6 right-6 w-14 h-14 rounded-2xl bg-[#0F9D58]/15 flex items-center justify-center text-[#0F9D58] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_30px_rgba(15,157,88,0.2)] transition-all duration-500">
                    <i className="fa-solid fa-sitemap text-xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 relative z-10">Accounts & Team Management</h3>
                  <p className="text-on-surface-variant text-sm relative z-10">Track client accounts, invite team members, and control permissions from one workspace.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="slide-left" delay={100}>
              <div className="group relative rounded-2xl overflow-hidden glow-card h-full">
                <div className="relative bg-surface-container-high/60 noise-overlay p-8 rounded-2xl border border-outline-variant/10 min-h-[220px] flex flex-col justify-end border-t-4 border-t-[#DB4437]/40">
                  <div className="absolute top-6 right-6 w-14 h-14 rounded-2xl bg-[#DB4437]/15 flex items-center justify-center text-[#DB4437] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_30px_rgba(219,68,55,0.2)] transition-all duration-500">
                    <i className="fa-solid fa-pen-ruler text-xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 relative z-10">Powerful Form Builder</h3>
                  <p className="text-on-surface-variant text-sm relative z-10">30+ field types, multi-step flows, conditional logic, file uploads, and repeater fields.</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="slide-right" delay={0} className="md:col-span-2">
              <div className="group relative rounded-2xl overflow-hidden glow-card h-full">
                <div className="gradient-border rounded-2xl h-full">
                  <div className="relative glass-panel noise-overlay p-8 md:p-10 rounded-2xl min-h-[220px] flex flex-col justify-end border-t-4 border-t-[#F4B400]/40">
                    <div className="absolute top-6 right-6 w-14 h-14 rounded-2xl bg-[#F4B400]/15 flex items-center justify-center text-[#F4B400] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_0_30px_rgba(244,180,0,0.2)] transition-all duration-500">
                      <i className="fa-solid fa-chart-pie text-xl" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 relative z-10">Insights Dashboard</h3>
                    <p className="text-on-surface-variant max-w-md relative z-10">Build custom dashboards with charts, number cards, and tables. Auto-generate widgets per form or create your own from scratch.</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <div className="mt-12 mb-2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <ScrollReveal animation="fade-up" delay={0}><MiniFeature icon="fa-file-csv" title="CSV & PDF Exports" desc="Download entries as spreadsheets or branded PDFs anytime." color="blue" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={80}><MiniFeature icon="fa-clock-rotate-left" title="Auto-save Drafts" desc="Clients can leave and come back. Progress is never lost." color="green" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={160}><MiniFeature icon="fa-code-branch" title="Conditional Logic" desc="Show or hide fields and steps based on previous answers." color="red" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={0}><MiniFeature icon="fa-bell" title="Instant Notifications" desc="Get notified the moment a client submits an entry." color="amber" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={80}><MiniFeature icon="fa-shield-halved" title="Secure File Storage" desc="Encrypted uploads with signed URLs. Only authorized users can access." color="blue" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={160}><MiniFeature icon="fa-arrows-repeat" title="Repeater Fields" desc="Let clients add dynamic rows of data like team members or pages." color="green" /></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TESTIMONIALS — diagonal lines + big dual glows
         ═══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden bg-surface-container-low/20">
        <div className="absolute inset-0 bg-diagonal-lines pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        {/* Bold dual blobs */}
        <div className="absolute top-[15%] left-[0%] w-[500px] h-[450px] bg-primary/[0.10] rounded-full blur-[140px] pointer-events-none animate-glow-breathe" />
        <div className="absolute bottom-[10%] right-[0%] w-[450px] h-[400px] bg-tertiary/[0.08] rounded-full blur-[120px] pointer-events-none animate-glow-breathe" style={{ animationDelay: "2.5s" }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block text-xs font-bold text-tertiary uppercase tracking-[0.2em] mb-4">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4">Loved by agencies <span className="gradient-text">everywhere</span></h2>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto">See what teams are saying about running their workflow on linqme.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal animation="fade-up" delay={0}><TestimonialCard quote="We replaced three tools with linqme. Forms, client data, and analytics are all in one place now, and our clients think it's our own platform." name="Lena Morales" role="Founder, PixelForge Studio" /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={150}><TestimonialCard quote="The Insights dashboard changed how we report to stakeholders. We auto-generate charts per form and the data updates in real time." name="Jordan Ellis" role="Creative Director, BrandHive" featured /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={300}><TestimonialCard quote="30+ field types, conditional logic, repeater fields. We've built intake forms for web design, branding, and SEO that each feel completely different." name="Priya Sandoval" role="Operations Lead, CreativOps" /></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          USE CASES — diamond grid + spotlight + streaks
         ═══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-diamond-grid pointer-events-none" />
        <div className="absolute inset-0 bg-spotlight pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        {/* Diagonal accent lines */}
        <div className="absolute top-[25%] -left-[10%] w-[70%] h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent rotate-[6deg] pointer-events-none" />
        <div className="absolute bottom-[25%] -right-[10%] w-[70%] h-[2px] bg-gradient-to-r from-transparent via-tertiary/18 to-transparent -rotate-[4deg] pointer-events-none" />
        {/* Color blobs */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/[0.08] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[10%] left-[-3%] w-[350px] h-[300px] bg-tertiary/[0.07] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Use Cases</span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4">Built for <span className="gradient-text">any workflow</span></h2>
            <p className="text-on-surface-variant text-lg max-w-xl mx-auto">From client intake to ongoing data collection, linqme adapts to how you work.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScrollReveal animation="slide-left" delay={0}><UseCaseCard icon="fa-laptop-code" title="Web Design & Development" desc="Collect copy, images, sitemaps, and brand assets before starting a project. Track every client with accounts and visualize progress in Insights." color="blue" /></ScrollReveal>
            <ScrollReveal animation="slide-right" delay={100}><UseCaseCard icon="fa-bullhorn" title="Marketing & Social Media" desc="Build intake forms for campaign briefs, brand guidelines, and creative assets. Use conditional logic to tailor questions per service type." color="red" /></ScrollReveal>
            <ScrollReveal animation="slide-left" delay={100}><UseCaseCard icon="fa-paintbrush" title="Branding & Identity" desc="Create questionnaires with package selectors, mood board uploads, and competitor analysis fields. Export entries as branded PDFs for your team." color="green" /></ScrollReveal>
            <ScrollReveal animation="slide-right" delay={0}><UseCaseCard icon="fa-handshake" title="Consulting & Freelance" desc="Standardize your intake with multi-step forms, auto-save drafts, and repeater fields for dynamic data. Manage everything from one dashboard." color="amber" /></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          PRICING TEASER — honeycomb + aurora + glow
         ═══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden bg-surface-container-low/20">
        <div className="absolute inset-0 bg-honeycomb pointer-events-none" />
        <div className="absolute inset-0 bg-aurora pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />
        {/* Central glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/[0.08] rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <ScrollReveal animation="fade-up">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4">Plans for <span className="gradient-text">every stage</span></h2>
            <p className="text-on-surface-variant text-lg mb-12 max-w-xl mx-auto">
              Start free with Free, grow with Starter, and go unlimited with Agency.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="zoom-in" delay={150}>
            <HomePricingTeaser />
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={300}>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 border border-outline-variant/20 rounded-xl font-bold hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-300 group"
            >
              Compare all plans
              <i className="fa-solid fa-arrow-right text-sm group-hover:translate-x-1 transition-transform" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FAQ — iso grid + corner glows
         ═══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-iso-grid pointer-events-none" />
        <div className="absolute inset-0 bg-corner-glow pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-[30%] left-[-5%] w-[350px] h-[300px] bg-tertiary/[0.06] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[300px] h-[250px] bg-primary/[0.05] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4">Common <span className="gradient-text">questions</span></h2>
          </div>

          <div className="space-y-4">
            <ScrollReveal animation="fade-up" delay={0}><FaqItem q="Is linqme really free?" a="Yes. The Free plan is free forever with 1 submission per month and 1 GB of storage. No credit card required. Upgrade to Starter or Agency when you're ready for more." /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={60}><FaqItem q="Can my clients see linqme branding?" a="On paid plans, you can completely remove all linqme branding. Your clients will see your logo, your colors, and your custom domain. It looks 100% like your own tool." /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={120}><FaqItem q="What can I build with the form builder?" a="Multi-step forms with 30+ field types including text, dropdowns, file uploads, repeater fields, package selectors, conditional logic, and more. Each form can have its own unique flow." /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={60}><FaqItem q="Do I need to give clients a login?" a="No. Clients access forms via a unique, secure link. No accounts or passwords needed on their end. You get a full dashboard to manage everything." /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={120}><FaqItem q="What are Insights dashboards?" a="Insights lets you build custom dashboards with number cards, bar charts, line graphs, pie charts, tables, and more. Auto-generate a dashboard per form, or create widgets from scratch." /></ScrollReveal>
            <ScrollReveal animation="fade-up" delay={60}><FaqItem q="Is there a contract?" a="No. All plans are month-to-month. Cancel anytime from your dashboard. Annual billing with 20% off is also available." /></ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA — ripple + mesh + breathing blobs + rings
         ═══════════════════════════════════════════════ */}
      <section className="relative py-24 md:py-32 px-6 text-center overflow-hidden bg-surface-container-low/20">
        <div className="absolute inset-0 bg-ripple pointer-events-none" />
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline-variant/15 to-transparent" />

        <div className="max-w-4xl mx-auto relative z-10">
          <ScrollReveal animation="zoom-in">
          <div className="gradient-border rounded-3xl">
            <div className="relative glass-panel noise-overlay p-12 md:p-20 rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/[0.18] rounded-full blur-[80px] pointer-events-none animate-glow-breathe" />
              <div className="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-tertiary/[0.14] rounded-full blur-[60px] pointer-events-none animate-glow-breathe" style={{ animationDelay: "2s" }} />
              <div className="absolute top-[20%] right-[10%] w-1/4 h-1/4 bg-inverse-primary/[0.10] rounded-full blur-[50px] pointer-events-none animate-glow-breathe" style={{ animationDelay: "4s" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/[0.10] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-tertiary/[0.05] pointer-events-none" />

              <h2 className="text-4xl md:text-5xl font-headline font-bold mb-6 relative z-10">
                Ready to run your agency <span className="gradient-text-hero">smarter?</span>
              </h2>
              <p className="text-on-surface-variant mb-10 text-lg relative z-10 max-w-xl mx-auto">
                Join agencies using linqme to collect data, manage clients, and make better decisions with real-time insights.
              </p>
              <Link
                href="/signup"
                className="relative z-10 inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-primary to-inverse-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_50px_rgba(var(--color-primary),0.4)] transition-all duration-500 text-lg group"
              >
                Get Started Free
                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-8 border-t border-on-surface/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LinqMeLogo variant="auto" className="h-5 w-auto text-primary" />
          </Link>
          <div className="flex flex-wrap justify-center gap-8 text-xs text-on-surface-variant/40 uppercase tracking-widest font-label">
            <Link className="hover:text-primary transition-colors duration-300" href="/privacy">Privacy Policy</Link>
            <Link className="hover:text-primary transition-colors duration-300" href="/terms">Terms of Service</Link>
            <Link className="hover:text-primary transition-colors duration-300" href="/pricing">Pricing</Link>
            <Link className="hover:text-primary transition-colors duration-300" href="/status">Status</Link>
            <Link className="hover:text-primary transition-colors duration-300" href="/support">Contact</Link>
          </div>
          <div className="text-xs text-on-surface-variant/30">
            &copy; {new Date().getFullYear()} linqme
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-components ───────────────────────────────── */

const COLOR_MAP: Record<string, { bg: string; text: string; shadow: string }> = {
  blue:  { bg: "bg-[#4285F4]", text: "text-[#4285F4]", shadow: "shadow-[0_0_30px_rgba(66,133,244,0.25)]" },
  red:   { bg: "bg-[#DB4437]", text: "text-[#DB4437]", shadow: "shadow-[0_0_30px_rgba(219,68,55,0.25)]" },
  green: { bg: "bg-[#0F9D58]", text: "text-[#0F9D58]", shadow: "shadow-[0_0_30px_rgba(15,157,88,0.25)]" },
  amber: { bg: "bg-[#F4B400]", text: "text-[#F4B400]", shadow: "shadow-[0_0_30px_rgba(244,180,0,0.25)]" },
};

function StatBlock({ value, label, icon, color = "blue" }: { value: string; label: string; icon: string; color?: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="text-center group">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${c.bg}/15 border border-current/10 mb-4 group-hover:${c.bg}/25 group-hover:${c.shadow} group-hover:scale-110 transition-all duration-500`}>
        <i className={`fa-solid ${icon} ${c.text} text-lg`} />
      </div>
      <div className={`text-4xl md:text-5xl font-headline font-extrabold ${c.text} mb-2`}>{value}</div>
      <p className="text-sm text-on-surface-variant/60">{label}</p>
    </div>
  );
}

function StepCard({ num, title, desc, icon, color = "blue" }: { num: number; title: string; desc: string; icon: string; color?: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="group relative">
      <div className="relative glass-panel noise-overlay rounded-2xl border border-outline-variant/10 p-8 h-full hover:border-outline-variant/20 transition-all duration-500 glow-card">
        <div className="flex items-center gap-4 mb-5">
          <div className={`relative w-11 h-11 rounded-full ${c.bg}/15 flex items-center justify-center ${c.text} text-sm font-bold font-headline group-hover:${c.shadow} transition-all duration-500`}>
            {num}
          </div>
          <div className={`w-11 h-11 rounded-xl ${c.bg}/10 group-hover:${c.bg}/20 flex items-center justify-center ${c.text} transition-all duration-500`}>
            <i className={`fa-solid ${icon}`} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-3 relative z-10">{title}</h3>
        <p className="text-on-surface-variant relative z-10 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function MiniFeature({ icon, title, desc, color = "blue" }: { icon: string; title: string; desc: string; color?: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl border border-outline-variant/[0.06] hover:border-outline-variant/15 hover:bg-surface-container/30 transition-all duration-300 group">
      <div className={`w-9 h-9 rounded-lg ${c.bg}/10 ${c.text} group-hover:${c.bg}/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-all duration-500`}>
        <i className={`fa-solid ${icon} text-sm`} />
      </div>
      <div>
        <h4 className="font-bold text-sm mb-1">{title}</h4>
        <p className="text-xs text-on-surface-variant/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, name, role, featured }: { quote: string; name: string; role: string; featured?: boolean }) {
  return (
    <div className={`rounded-2xl p-8 flex flex-col justify-between h-full transition-all duration-500 glow-card ${
      featured ? "gradient-border" : "border border-outline-variant/[0.08] hover:border-outline-variant/15"
    }`}>
      <div className={featured ? "glass-panel rounded-2xl p-8 -m-8 h-full flex flex-col justify-between" : "flex flex-col justify-between h-full"}>
        <div>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <i key={s} className="fa-solid fa-star text-xs text-primary/70" />
            ))}
          </div>
          <p className="text-on-surface/90 leading-relaxed mb-6">&ldquo;{quote}&rdquo;</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/25 to-tertiary/25 flex items-center justify-center text-xs font-bold text-primary border border-primary/10">
            {name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-sm">{name}</p>
            <p className="text-xs text-on-surface-variant/50">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard({ icon, title, desc, color = "blue" }: { icon: string; title: string; desc: string; color?: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="glass-panel noise-overlay rounded-2xl border border-outline-variant/[0.08] p-8 relative overflow-hidden group glow-card hover:border-outline-variant/15 transition-all duration-500">
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${c.bg}/[0.08] rounded-full blur-[40px] pointer-events-none group-hover:opacity-150 transition-opacity`} />
      <div className={`absolute top-6 right-6 w-12 h-12 rounded-xl ${c.bg}/10 group-hover:${c.bg}/20 flex items-center justify-center ${c.text} group-hover:scale-110 transition-all duration-500`}>
        <i className={`fa-solid ${icon} text-lg`} />
      </div>
      <h3 className="text-xl font-bold mb-3 relative z-10 pr-16">{title}</h3>
      <p className="text-on-surface-variant relative z-10 leading-relaxed">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/[0.08] p-6 hover:border-outline-variant/15 transition-all duration-300 glow-card">
      <h3 className="font-bold text-on-surface mb-2">{q}</h3>
      <p className="text-sm text-on-surface-variant/70 leading-relaxed">{a}</p>
    </div>
  );
}
