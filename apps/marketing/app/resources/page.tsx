import { ArrowRight } from "lucide-react";
import { CtaBand, Footer, MarketingNav } from "../site-shell";
import { resources, resourcesCategories } from "../site-content";
import { ScrollEffects } from "../scroll-effects";

export default function ResourcesPage() {
  return (
    <main>
      <ScrollEffects />
      <MarketingNav />

      <section className="page-hero reveal">
        <span className="section-kicker">Resources</span>
        <h1>Built for coaches who think.</h1>
        <p>
          Practical writing on running a coaching business. No generic fitness content. Just the things that actually matter when you are trying to build something real.
        </p>
      </section>

      <section className="category-grid reveal">
        {resourcesCategories.map((category, index) => (
          <article className="category-card motion-item" data-depth={String(0.18 + index * 0.08)} key={category.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{category.title}</h2>
            <p>{category.text}</p>
          </article>
        ))}
      </section>

      <section className="resource-index">
        {resources.map((resource, index) => (
          <a className="resource-card reveal motion-item" data-depth={String(0.16 + index * 0.06)} href={`/resources/${resource.slug}`} key={resource.slug}>
            <span>{resource.type} / {resource.date}</span>
            <h2>{resource.title}</h2>
            <p>{resource.excerpt}</p>
            <strong>
              Read more
              <ArrowRight aria-hidden="true" size={16} />
            </strong>
          </a>
        ))}
      </section>

      <section className="newsletter-band reveal">
        <div>
          <span className="section-kicker">Newsletter</span>
          <h2>Get it in your inbox.</h2>
          <p>
            Occasional writing on building a better coaching business. When there is something worth saying, you will hear about it.
          </p>
        </div>
        <a className="button button-light" href="/founder-program">
          Subscribe
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <CtaBand />
      <Footer />
    </main>
  );
}
