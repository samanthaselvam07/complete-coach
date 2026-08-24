import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CtaBand, Footer, MarketingNav } from "../site-shell";
import { roadmapSections } from "../site-content";
import { ScrollEffects } from "../scroll-effects";

export default function RoadmapPage() {
  return (
    <main>
      <ScrollEffects />
      <MarketingNav />

      <section className="page-hero reveal">
        <span className="section-kicker">Product roadmap</span>
        <h1>What we are building and when.</h1>
        <p>
          A transparent view into the intelligence we're adding to Complete Coach, so you can plan your business around what is coming.
        </p>
      </section>

      <section className="roadmap-stack">
        {roadmapSections.map((section, index) => (
          <article className="roadmap-lane reveal motion-item" data-depth={String(0.16 + index * 0.1)} key={section.title}>
            <span className="lane-status">{section.status}</span>
            <h2>{section.title}</h2>
            {section.intro ? <p>{section.intro}</p> : null}
            {section.items ? (
              <div className="roadmap-items">
                {section.items.map((item) => (
                  <span key={item}>
                    <CheckCircle2 aria-hidden="true" size={16} />
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {section.features ? (
              <div className="roadmap-feature-grid">
                {section.features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div className="roadmap-feature-card" key={feature.title}>
                      <Icon aria-hidden="true" size={22} />
                      <h3>{feature.title}</h3>
                      <p>{feature.text}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="founding-input reveal">
        <span className="section-kicker">Founding input</span>
        <h2>You shape what gets built next.</h2>
        <p>
          Founding coaches have a direct line to the product team. If something is missing, tell us. If something does not work the way you expected, tell us.
        </p>
        <p>
          Every feature on this list exists because a coach said they needed it, or because we experienced it ourselves.
        </p>
        <a className="button button-light" href="/founder-program">
          Submit a Feature Request
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <CtaBand />
      <Footer />
    </main>
  );
}
