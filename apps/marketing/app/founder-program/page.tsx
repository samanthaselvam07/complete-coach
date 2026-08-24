import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

const founderIncludes = [
  "Early access to the redesigned Complete Coach workspace",
  "A direct feedback loop on check-ins, programming, nutrition, and client operations",
  "Founder pricing consideration before public launch",
  "Priority migration support for existing coaching systems"
];

export default function FounderProgramPage() {
  return (
    <main className="founder-page">
      <a className="back-link" href="/">
        <ArrowLeft aria-hidden="true" size={18} />
        Back to landing
      </a>
      <section className="founder-hero">
        <span>Founder Program</span>
        <h1>Help shape the coach workspace you actually want to use.</h1>
        <p>
          Join the early build group for Complete Coach and help pressure-test the workflows that matter most to high-touch online coaching.
        </p>
        <a className="primary-button" href="mailto:hello@completecoach.fit?subject=Complete%20Coach%20Founder%20Program">
          Request founder access
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>
      <section className="founder-includes" aria-label="Founder program includes">
        {founderIncludes.map((item) => (
          <div key={item}>
            <CheckCircle2 aria-hidden="true" size={18} />
            <p>{item}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
