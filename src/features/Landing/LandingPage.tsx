import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/">
          <img src="/assets/images/natobotics-logo.png" alt="" />
          <span>NATO<strong>HRMS</strong></span>
        </Link>
        <nav className="landing-nav" aria-label="Public navigation">
          <Link className="landing-signin" to="/login">Sign in</Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span /> YOUR PEOPLE WORKSPACE</div>
            <h1>Bring your people operations into focus.</h1>
            <p>Manage employee information, attendance, leave, and timesheets in one connected workspace.</p>
            <div className="landing-actions">
              <Link className="landing-primary-action" to="/login">Sign in to your workspace</Link>
            </div>
            <p className="landing-owner">Powered by Natobotics</p>
          </div>
          <div className="landing-preview">
            <h2>One place for your working day</h2>
            <p>Keep your profile up to date, track your time, and stay connected with company announcements.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
