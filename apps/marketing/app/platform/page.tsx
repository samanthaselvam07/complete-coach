import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CtaBand, Footer, MarketingNav } from "../site-shell";
import { platformSections } from "../site-content";
import { ScrollEffects } from "../scroll-effects";

export default function PlatformPage() {
  return (
    <main>
      <ScrollEffects />
      <MarketingNav />

      <section className="page-hero platform-hero reveal">
        <span className="section-kicker">Platform</span>
        <h1>Everything your coaching business needs. In one place.</h1>
        <p>
          Complete Coach combines client management, programme delivery, check-in intelligence, nutrition, payments, and business insights into a single platform. With an AI layer that makes sense of it all.
        </p>
      </section>

      <section className="platform-map reveal motion-item" data-depth="0.36" aria-label="Complete Coach platform map">
        <div className="map-centre">Complete Coach</div>
        {["Check-ins", "Programmes", "Nutrition", "Clients", "CRM", "Revenue"].map((item, index) => (
          <span className={`map-node node-${index + 1}`} key={item}>{item}</span>
        ))}
      </section>

      <section className="platform-sections">
        {platformSections.map((section, index) => {
          const Icon = section.icon;
          const hasCrmDemo = section.kicker === "Lead Capture and CRM";
          const hasProgrammePreview = section.kicker === "Programme Delivery";
          return (
            <article className="platform-detail reveal" key={section.title}>
              <div className="platform-copy">
                <span className="section-kicker">{section.kicker}</span>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="feature-list-panel motion-item" data-depth={String(0.22 + index * 0.04)}>
                <Icon aria-hidden="true" size={26} />
                {hasCrmDemo ? (
                  <div className="crm-demo-frame">
                    <video autoPlay loop muted playsInline preload="metadata" aria-label="CRM workflow demo">
                      <source src="/videos/crm-workflow.mp4" type="video/mp4" />
                    </video>
                  </div>
                ) : hasProgrammePreview ? (
                  <div className="program-preview-frame" aria-label="Programme delivery screenshot preview">
                    <div className="program-preview-tabs">
                      <span>Upper Strength</span>
                      <span>Day 2</span>
                      <span>+</span>
                    </div>
                    <div className="program-preview-field">Upper Strength</div>
                    <div className="program-preview-volume">
                      <div>
                        <small>Anatomy volume</small>
                        <strong>Upper Strength volume map</strong>
                        <div className="program-preview-bodymap" aria-hidden="true">
                          <span />
                          <span />
                        </div>
                      </div>
                      <div className="program-preview-bars" aria-hidden="true">
                        {["Back", "Biceps", "Core", "Quads", "Glutes"].map((muscle) => (
                          <span key={muscle}>
                            <b>{muscle}</b>
                            <i>3 sets</i>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="program-preview-add">+ Add an Exercise</div>
                    <div className="program-preview-workout">
                      {["Single leg incline 45 degree leg press machine", "AB Wheel All The Way out_Female", "Lat pull down wide grip"].map((exercise) => (
                        <span key={exercise}>{exercise}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mini-bars" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {section.features.map((feature) => (
                  <div className="feature-check" key={feature}>
                    <CheckCircle2 aria-hidden="true" size={17} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className="see-action-band reveal">
        <span className="section-kicker">See Complete Coach in action</span>
        <h2>Apply for founding access and get a live walkthrough of the platform.</h2>
        <div className="hero-actions">
          <a className="button button-light" href="/founder-program">
            Apply for Founding Access
            <ArrowRight aria-hidden="true" size={18} />
          </a>
          <a className="button button-glass-dark" href="/founder-program">
            Join the waitlist
          </a>
        </div>
      </section>

      <CtaBand />
      <Footer />
    </main>
  );
}
