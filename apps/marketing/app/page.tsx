import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { CtaBand, Footer, MarketingNav } from "./site-shell";
import { homeHero, platformPillars, problemCopy, proofMetrics, resources } from "./site-content";
import { ScrollEffects } from "./scroll-effects";

const clientSignals = [
  "Went quiet after a missed check-in",
  "Strength down across two sessions",
  "Says fine, numbers disagree",
  "Low steps, low sleep, high fatigue",
  "Payment due before renewal call"
];

export default function MarketingHomePage() {
  return (
    <main>
      <ScrollEffects />
      <MarketingNav />

      <section className="home-hero reveal">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles aria-hidden="true" size={16} />
            {homeHero.eyebrow}
          </div>
          <h1>{homeHero.headline}</h1>
          <p>{homeHero.subheadline}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/founder-program">
              {homeHero.primaryCta}
              <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button-secondary" href="/platform">
              {homeHero.secondaryCta}
            </a>
          </div>
        </div>

        <div className="hero-product motion-item" data-depth="0.62" aria-label="Complete Coach dashboard preview">
          <div className="hero-frame">
            <div className="screen-bar">
              <span />
              <span />
              <span />
            </div>
            <img src="/images/dashboard.png" alt="Complete Coach operations dashboard" />
          </div>
          <div className="hero-note top-note">
            <Play aria-hidden="true" size={16} />
            Intelligence that tells you where to look
          </div>
          <div className="hero-note bottom-note">
            <CheckCircle2 aria-hidden="true" size={16} />
            One place for clients, leads and coaching decisions
          </div>
        </div>
      </section>

      <section className="metric-row reveal">
        {proofMetrics.map((metric) => (
          <article className="metric-proof" key={metric.value}>
            <strong>{metric.value}</strong>
            <p>{metric.label}</p>
          </article>
        ))}
      </section>

      <section className="studio-section problem-section reveal">
        <div className="problem-copy">
          <span className="section-kicker">The problem</span>
          <h2>{problemCopy.heading}</h2>
          {problemCopy.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="signal-board motion-item" data-depth="0.48" aria-label="Client attention signals">
          <div className="signal-avatar">
            <span>ZT</span>
            <div>
              <strong>Zoe Thompson</strong>
              <small>Needs coach review</small>
            </div>
          </div>
          <div className="signal-pulse" />
          {clientSignals.map((signal, index) => (
            <div className="signal-row" style={{ "--delay": `${index * 160}ms` } as React.CSSProperties} key={signal}>
              <span />
              {signal}
            </div>
          ))}
        </div>
      </section>

      <section className="studio-section split-section reveal">
        <div>
          <span className="section-kicker">The platform</span>
          <h2>Everything in one place. Intelligence built in.</h2>
        </div>
        <p>
          Complete Coach is built around the moments where coaching quality can slip: missed signals, scattered context, slow follow-up and too many tools.
        </p>
      </section>

      <section className="pillar-grid">
        {platformPillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <article className="pillar-card reveal motion-item" data-depth={String(0.2 + index * 0.12)} key={pillar.title}>
              <Icon aria-hidden="true" size={24} />
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          );
        })}
      </section>

      <section className="founding-access reveal">
        <div>
          <span className="section-kicker">Founding access</span>
          <h2>We're building this with coaches, not for them.</h2>
        </div>
        <div>
          <p>
            A small group of online fitness coaches are working with us directly to shape Complete Coach before public launch. Founding coaches get lifetime discounted pricing and direct input into the product roadmap.
          </p>
          <div className="hero-actions">
            <a className="button button-light" href="/founder-program">
              Apply for Founding Access
              <ArrowRight aria-hidden="true" size={18} />
            </a>
            <a className="button button-glass-dark" href="/founder-program">
              Join the waitlist instead
            </a>
          </div>
        </div>
      </section>

      <section className="resources-preview reveal">
        <div className="section-heading">
          <span className="section-kicker">Resources</span>
          <h2>Practical writing on running a coaching business.</h2>
          <a href="/resources">View all resources</a>
        </div>
        <div className="resource-grid">
          {resources.slice(0, 3).map((resource) => (
            <a className="resource-card" href={`/resources/${resource.slug}`} key={resource.slug}>
              <span>{resource.type} / {resource.date}</span>
              <h3>{resource.title}</h3>
              <p>{resource.excerpt}</p>
              <strong>Read more</strong>
            </a>
          ))}
        </div>
      </section>

      <CtaBand />
      <Footer />
    </main>
  );
}
