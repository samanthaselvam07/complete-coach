import { ArrowLeft } from "lucide-react";
import { Footer, MarketingNav } from "../../site-shell";
import { resources } from "../../site-content";
import { ScrollEffects } from "../../scroll-effects";

interface ResourcePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return resources.map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({ params }: ResourcePageProps) {
  const { slug } = await params;
  const resource = resources.find((item) => item.slug === slug);

  return {
    title: resource ? `${resource.title} | Complete Coach` : "Resource | Complete Coach"
  };
}

export default async function ResourceArticlePage({ params }: ResourcePageProps) {
  const { slug } = await params;
  const resource = resources.find((item) => item.slug === slug) ?? resources[0];

  return (
    <main>
      <ScrollEffects />
      <MarketingNav />
      <article className="article-page reveal">
        <a className="back-link" href="/resources">
          <ArrowLeft aria-hidden="true" size={18} />
          Back to resources
        </a>
        <span className="section-kicker">{resource.type} / {resource.date}</span>
        <h1>{resource.title}</h1>
        <p className="article-lede">{resource.excerpt}</p>
        <div className="article-body">
          <p>
            The strongest coaching businesses do not scale by adding more admin. They scale by turning judgement, communication and follow-through into a repeatable operating rhythm.
          </p>
          <p>
            Complete Coach is being built around that rhythm. Collect the right client signals, help the coach make a better decision, then keep the next action visible until it is done.
          </p>
          <h2>What to put in place</h2>
          <p>
            Start with one review standard, one source of truth for client status, and one clear owner for every follow-up. Once those basics are visible, AI support becomes useful because it has context to work from.
          </p>
          <h2>What to avoid</h2>
          <p>
            Avoid spreading important client decisions across messages, forms, spreadsheets and disconnected notes. The more places a coach has to check, the easier it is for quality to become personality-dependent.
          </p>
        </div>
      </article>
      <Footer />
    </main>
  );
}
