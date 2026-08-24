import { ArrowRight } from "lucide-react";
import { navItems } from "./site-content";

export function MarketingNav() {
  return (
    <nav className="site-nav" aria-label="Primary navigation">
      <a className="brand-lockup" href="/">
        <span className="brand-tile">CC</span>
        <span>
          Complete Coach
          <small>Business OS for fitness professionals</small>
        </span>
      </a>
      <div className="site-links">
        {navItems.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </div>
      <div className="site-actions">
        <a className="login-link" href="https://app.completecoach.fit/sign-in">
          Login
        </a>
        <a className="button button-primary" href="/founder-program">
          Apply for Founding Access
        </a>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <a className="brand-lockup" href="/">
          <span className="brand-tile">CC</span>
          <span>
            Complete Coach
            <small>Built for serious coaches</small>
          </span>
        </a>
        <p>Built for coaches who are serious about their clients and their business.</p>
      </div>
      <div className="footer-grid">
        <div>
          <h3>Platform</h3>
          <a href="/platform">Platform</a>
          <a href="/pricing">Pricing</a>
          <a href="/roadmap">Roadmap</a>
        </div>
        <div>
          <h3>Learn</h3>
          <a href="/resources">Resources</a>
          <a href="/resources/ai-assisted-check-ins">AI check-ins</a>
          <a href="/resources/scale-without-losing-touch">Scaling delivery</a>
        </div>
        <div>
          <h3>Start</h3>
          <a href="/founder-program">Founder Program</a>
          <a href="/founder-program">Apply</a>
          <a href="/founder-program">Waitlist</a>
        </div>
      </div>
    </footer>
  );
}

export function CtaBand() {
  return (
    <section className="cta-band reveal motion-item" data-depth="0.32">
      <span className="section-kicker">Founder access</span>
      <h2>We're building this with coaches, not for them.</h2>
      <p>
        Founding coaches get lifetime discounted pricing and direct input into the product roadmap. Spots are limited and selected.
      </p>
      <a className="button button-light" href="/founder-program">
        Apply for Founding Access
        <ArrowRight aria-hidden="true" size={18} />
      </a>
    </section>
  );
}
