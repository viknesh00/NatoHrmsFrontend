import { Link } from "react-router-dom";
import "./landing.css";

/* ─── Feature data ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    index: "01",
    title: "Employee Management",
    body: "Centralise every employee record — contracts, documents, roles, and history — in one searchable, permission-aware workspace.",
    tag: "People",
  },
  {
    index: "02",
    title: "Attendance & Time",
    body: "Real-time clock-in, automated shift calculations, overtime flagging, and downloadable reports that accounting actually wants.",
    tag: "Tracking",
  },
  {
    index: "03",
    title: "Leave & Approvals",
    body: "Policy-driven leave types, multi-tier approval chains, and a live balance view so no one ever asks HR the same question twice.",
    tag: "Workflow",
  },
  {
    index: "04",
    title: "Payslip Generation",
    body: "Auto-computed payslips with deduction breakdowns, PDF export, and direct delivery to employee inboxes every pay cycle.",
    tag: "Payroll",
  },
  {
    index: "05",
    title: "Project & Timesheet",
    body: "Link timesheets to live projects, track billable hours per task, and surface utilisation data before deadlines slip.",
    tag: "Projects",
  },
  {
    index: "06",
    title: "Announcements & Chat",
    body: "Broadcast company-wide notices or have direct conversations — all within the same platform your team already lives in.",
    tag: "Communication",
  },
];

const STATS = [
  { value: "10k+", label: "Employees managed" },
  { value: "98%",  label: "Customer satisfaction" },
  { value: "3 min", label: "Average onboarding time" },
  { value: "Zero", label: "Data silos" },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    heading: "Set up your workspace",
    body: "Add your company profile, configure leave policies, and define roles in under ten minutes.",
  },
  {
    step: "2",
    heading: "Invite your team",
    body: "Send personalised onboarding links. Employees self-submit their details — HR just reviews.",
  },
  {
    step: "3",
    heading: "Automate the routine",
    body: "Attendance, payslips, and approvals run themselves. You focus on the work that matters.",
  },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="lp-root">

      {/* ══ VIDEO BACKGROUND ═══════════════════════════════════════════════ */}
      <div className="lp-video-wrap" aria-hidden="true">
        <video
          className="lp-video"
          src="https://designerstephen.github.io/public-assets/videos/serene-art-hero.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="lp-overlay" />
      </div>

      {/* ══ NAVIGATION ══════════════════════════════════════════════════════ */}
      <header className="lp-nav-wrap">
        <div className="lp-nav">

          {/* Brand */}
          <Link to="/" className="lp-brand">
            <img
              src="/assets/images/natobotics-logo.png"
              alt="Natobotics"
              className="lp-brand-logo"
            />
            <span className="lp-brand-name">
              Nato<strong>HRMS</strong><sup className="lp-brand-tm">®</sup>
            </span>
          </Link>

          {/* Centre links */}
          <nav className="lp-links" aria-label="Primary navigation">
            <a href="#features"   className="lp-link">Features</a>
            <a href="#how"        className="lp-link">How it works</a>
            <a href="#stats"      className="lp-link">Results</a>
            <Link to="/login"     className="lp-link">Sign in</Link>
          </nav>

          {/* CTA */}
          <Link to="/login" className="lp-pill lp-pill--sm">
            Get started
          </Link>
        </div>
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <main>
        <section className="lp-hero">
          <div className="lp-hero-inner">

            <p className="lp-eyebrow lp-anim lp-anim--d0">
              <span className="lp-eyebrow-line" />
              YOUR PEOPLE WORKSPACE
            </p>

            <h1 className="lp-h1 lp-anim lp-anim--d1">
              Bring your<br />
              <em>people operations</em><br />
              into focus.
            </h1>

            <p className="lp-sub lp-anim lp-anim--d2">
              Manage employee information, attendance, leave, and timesheets
              in one connected workspace — built for the way modern teams work.
            </p>

            <div className="lp-cta-row lp-anim lp-anim--d3">
              <Link to="/login" className="lp-pill lp-pill--hero">
                Sign in to your workspace
              </Link>
              <a href="#features" className="lp-ghost-btn">
                Explore features →
              </a>
            </div>

            <p className="lp-attr lp-anim lp-anim--d4">
              Powered by&nbsp;<strong>Natobotics</strong>
            </p>
          </div>

          {/* scroll cue */}
          <div className="lp-scroll-cue lp-anim lp-anim--d4" aria-hidden="true">
            <span className="lp-scroll-line" />
          </div>
        </section>

        {/* ══ STATS RIBBON ═════════════════════════════════════════════════ */}
        <section id="stats" className="lp-stats">
          <div className="lp-stats-inner">
            {STATS.map((s) => (
              <div key={s.label} className="lp-stat">
                <span className="lp-stat-value">{s.value}</span>
                <span className="lp-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ══ FEATURES GRID ════════════════════════════════════════════════ */}
        <section id="features" className="lp-features">
          <div className="lp-section-inner">

            <div className="lp-section-header">
              <p className="lp-section-eyebrow">
                <span className="lp-eyebrow-line lp-eyebrow-line--dark" />
                PLATFORM CAPABILITIES
              </p>
              <h2 className="lp-section-h2">
                Every tool your<br /><em>HR team needs.</em>
              </h2>
              <p className="lp-section-sub">
                NatoHRMS consolidates the full employee lifecycle into a single,
                coherent platform — no patchwork of spreadsheets required.
              </p>
            </div>

            <div className="lp-features-grid">
              {FEATURES.map((f) => (
                <article key={f.index} className="lp-feat-card">
                  <div className="lp-feat-top">
                    <span className="lp-feat-index">{f.index}</span>
                    <span className="lp-feat-tag">{f.tag}</span>
                  </div>
                  <h3 className="lp-feat-title">{f.title}</h3>
                  <p className="lp-feat-body">{f.body}</p>
                  <Link to="/login" className="lp-feat-link">
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ═════════════════════════════════════════════════ */}
        <section id="how" className="lp-how">
          <div className="lp-section-inner">

            <div className="lp-section-header lp-section-header--light">
              <p className="lp-section-eyebrow lp-section-eyebrow--light">
                <span className="lp-eyebrow-line" />
                THREE STEPS TO CLARITY
              </p>
              <h2 className="lp-section-h2 lp-section-h2--light">
                Up and running<br /><em>in an afternoon.</em>
              </h2>
            </div>

            <div className="lp-how-steps">
              {HOW_IT_WORKS.map((h) => (
                <div key={h.step} className="lp-how-step">
                  <div className="lp-how-num">{h.step}</div>
                  <div className="lp-how-content">
                    <h3 className="lp-how-heading">{h.heading}</h3>
                    <p className="lp-how-body">{h.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-how-cta">
              <Link to="/login" className="lp-pill lp-pill--hero lp-pill--white">
                Start your workspace
              </Link>
            </div>
          </div>
        </section>

        {/* ══ EDITORIAL QUOTE ══════════════════════════════════════════════ */}
        <section className="lp-quote">
          <div className="lp-section-inner lp-quote-inner">
            <blockquote className="lp-quote-text">
              "NatoHRMS gave us one place for every conversation about our people.
              Onboarding that used to take days now takes minutes."
            </blockquote>
            <cite className="lp-quote-cite">
              <img
                src="/assets/images/natobotics-logo.png"
                alt="Natobotics"
                className="lp-quote-logo"
              />
              <span>
                <strong>Natobotics Client</strong><br />
                Head of People Operations
              </span>
            </cite>
          </div>
        </section>

        {/* ══ FINAL CTA BAND ═══════════════════════════════════════════════ */}
        <section className="lp-band">
          <div className="lp-section-inner lp-band-inner">
            <div className="lp-band-copy">
              <h2 className="lp-band-h2">
                Ready to simplify<br /><em>people operations?</em>
              </h2>
              <p className="lp-band-sub">
                Join teams already running attendance, payroll, leave, and
                projects inside NatoHRMS — one login, everything connected.
              </p>
            </div>
            <div className="lp-band-action">
              <Link to="/login" className="lp-pill lp-pill--hero">
                Sign in to your workspace
              </Link>
              <p className="lp-band-fine">No credit card required.</p>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ═══════════════════════════════════════════════════════ */}
        <footer className="lp-footer">
          <div className="lp-section-inner lp-footer-inner">

            <div className="lp-footer-brand">
              <Link to="/" className="lp-brand lp-brand--dark">
                <img
                  src="/assets/images/natobotics-logo.png"
                  alt="Natobotics"
                  className="lp-brand-logo lp-brand-logo--dark"
                />
                <span className="lp-brand-name">
                  Nato<strong>HRMS</strong><sup className="lp-brand-tm">®</sup>
                </span>
              </Link>
              <p className="lp-footer-tagline">
                People operations, simplified.
              </p>
            </div>

            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <p className="lp-footer-col-title">Platform</p>
                <Link to="/login" className="lp-footer-link">Employees</Link>
                <Link to="/login" className="lp-footer-link">Attendance</Link>
                <Link to="/login" className="lp-footer-link">Leave</Link>
                <Link to="/login" className="lp-footer-link">Payslip</Link>
              </div>
              <div className="lp-footer-col">
                <p className="lp-footer-col-title">Company</p>
                <Link to="/login" className="lp-footer-link">About</Link>
                <Link to="/terms"  className="lp-footer-link">Terms</Link>
                <Link to="/privacy-policy" className="lp-footer-link">Privacy</Link>
                <Link to="/standards" className="lp-footer-link">Standards</Link>
              </div>
              <div className="lp-footer-col">
                <p className="lp-footer-col-title">Support</p>
                <Link to="/login" className="lp-footer-link">Help centre</Link>
                <Link to="/login" className="lp-footer-link">Sign in</Link>
                <Link to="/forgot-password" className="lp-footer-link">Reset password</Link>
              </div>
            </div>
          </div>

          <div className="lp-footer-bar">
            <p>© {new Date().getFullYear()} Natobotics. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
