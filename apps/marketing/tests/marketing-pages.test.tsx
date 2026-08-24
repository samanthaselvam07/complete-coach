import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FeaturesPage from "../app/features/page";
import FounderProgramPage from "../app/founder-program/page";
import MarketingHomePage from "../app/page";
import PlatformPage from "../app/platform/page";
import PricingPage from "../app/pricing/page";
import ResourcesPage from "../app/resources/page";
import RoadmapPage from "../app/roadmap/page";

describe("marketing pages", () => {
  it("renders the landing page with the founder CTA contract", () => {
    render(<MarketingHomePage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Coach smarter. Scale faster."
    );
    expect(screen.getAllByRole("link", { name: /Apply for Founding Access/i })[0]?.getAttribute("href")).toBe(
      "/founder-program"
    );
  });

  it("renders the founder program page", () => {
    render(<FounderProgramPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Help shape the coach workspace you actually want to use."
    );
    expect(screen.getByRole("link", { name: /Request founder access/i }).getAttribute("href")).toBe(
      "mailto:hello@completecoach.fit?subject=Complete%20Coach%20Founder%20Program"
    );
  });

  it("renders pricing plans from the existing landing reference", () => {
    render(<PricingPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Founding access. Built-in value.");
    expect(screen.getByText("$29")).toBeTruthy();
    expect(screen.getByText("$49")).toBeTruthy();
  });

  it("renders the platform page with feature content", () => {
    render(<PlatformPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Everything your coaching business needs. In one place."
    );
    expect(screen.getByText("Check-ins that actually get read.")).toBeTruthy();
    expect(screen.getByText("Run the business, not just the coaching.")).toBeTruthy();
  });

  it("keeps the old features route mapped to platform content", () => {
    render(<FeaturesPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Everything your coaching business needs. In one place."
    );
  });

  it("renders the resources index", () => {
    render(<ResourcesPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Built for coaches who think."
    );
    expect(screen.getByText("Why Your Check-In Form Is Not Actually Giving You What You Need")).toBeTruthy();
  });

  it("renders the roadmap structure from the existing landing reference", () => {
    render(<RoadmapPage />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("What we are building and when.");
    expect(screen.getByText("Core Platform")).toBeTruthy();
    expect(screen.getByText("AI Check-In Analysis")).toBeTruthy();
    expect(screen.getByText("Coach Community")).toBeTruthy();
  });
});
