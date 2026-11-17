import { Link } from "react-router-dom";
import { ArrowLeft, Construction, Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <main className="status-page" aria-labelledby="not-found-title">
      <section className="status-card">
        <span className="status-icon status-icon-muted"><Compass size={24} aria-hidden="true" /></span>
        <p className="status-code">404 · PAGE NOT FOUND</p>
        <h1 id="not-found-title">We couldn’t find that page.</h1>
        <p className="status-description">The address may be out of date, or the page may have moved.</p>
        <div className="status-actions">
          <Link className="status-primary-link" to="/"><ArrowLeft size={15} /> Back to home</Link>
          <Link className="status-secondary-link" to="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}

export function UnderConstructionPage() {
  return (
    <main className="status-page" aria-labelledby="construction-title">
      <section className="status-card">
        <span className="status-icon status-icon-primary"><Construction size={24} aria-hidden="true" /></span>
        <p className="status-code">WORKSPACE UPDATE</p>
        <h1 id="construction-title">This page is being prepared.</h1>
        <p className="status-description">This part of the Natobotics HRMS workspace is not available yet. Please check back later.</p>
        <div className="status-actions">
          <Link className="status-primary-link" to="/"><ArrowLeft size={15} /> Back to home</Link>
          <Link className="status-secondary-link" to="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
