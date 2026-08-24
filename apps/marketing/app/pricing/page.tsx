import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CtaBand, Footer, MarketingNav } from "../site-shell";
import { faqs, plans } from "../site-content";
import { ScrollEffects } from "../scroll-effects";

export default function PricingPage() {
  return (
    <main>
      <ScrollEffects />
      <MarketingNav />

      <section className="page-hero reveal">
        <span className="section-kicker">Pricing</span>
        <h1>Founding access. Built-in value.</h1>
        <p>
          Complete Coach is currently in founding cohort phase. Two ways to get in. Both lock in permanent pricing before public launch.
        </p>
      </section>

      <section className="founding-note reveal">
        <strong>Founding pricing is permanent.</strong>
        <span>It does not increase when Complete Coach opens to the public.</span>
      </section>

      <section className="pricing-grid">
        {plans.map((plan, index) => (
          <article className={`pricing-card reveal motion-item ${plan.featured ? "featured" : ""}`} data-depth={String(0.2 + index * 0.14)} key={plan.name}>
            {plan.featured ? <span className="plan-badge">Design cohort</span> : null}
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <div className="price-line">
              <strong>{plan.price}</strong>
              <span>/month</span>
            </div>
            <p className="spots-line">{plan.spots}</p>
            <p>{plan.details}</p>
            <h3>Includes</h3>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 aria-hidden="true" size={18} />
                  {feature}
                </li>
              ))}
            </ul>
            <h3>Requirements</h3>
            <ul>
              {plan.requirements.map((requirement) => (
                <li key={requirement}>
                  <CheckCircle2 aria-hidden="true" size={18} />
                  {requirement}
                </li>
              ))}
            </ul>
            <a className={plan.featured ? "button button-light" : "button button-secondary"} href="/founder-program">
              Apply for Founding Access
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </article>
        ))}
      </section>

      <section className="waitlist-band reveal">
        <div>
          <span className="section-kicker">Waitlist</span>
          <h2>Not ready to apply yet?</h2>
          <p>
            Join the waitlist and we will reach out when founding spots open up or when Complete Coach launches publicly.
          </p>
        </div>
        <a className="button button-primary" href="/founder-program">
          Join the Waitlist
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <section className="faq-section reveal">
        <div className="section-heading">
          <span className="section-kicker">FAQ</span>
          <h2>Questions before you apply.</h2>
        </div>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <article className="faq-card" key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand />
      <Footer />
    </main>
  );
}
