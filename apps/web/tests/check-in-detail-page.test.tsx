import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { CheckInDetailPage } from "@/components/check-ins/check-in-detail-page";

describe("CheckInDetailPage", () => {
  it("renders the full check-in detail surface", () => {
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24" }));

    expect(screen.getByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByText("Check-In Recording")).toBeInTheDocument();
    expect(screen.getByText("Key Measurements")).toBeInTheDocument();
    expect(screen.getByText("Well-being")).toBeInTheDocument();
    expect(screen.getByText("Wins")).toBeInTheDocument();
    expect(screen.getByText("Struggles")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare With Previous Checkin" })).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24?compare=previous"
    );
  });

  it("renders the previous/current comparison surface", () => {
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "week-24", compare: true }));

    expect(screen.getByRole("heading", { name: "Previous Check in" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByText("-0.8kg")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Close" })).toHaveAttribute(
      "href",
      "/clients/1/check-ins/week-24"
    );
  });

  it("keeps detail actions inside the client profile when embedded", () => {
    render(createElement(CheckInDetailPage, { clientId: "1", checkInId: "demo-weekly-check-in", embedded: true }));

    expect(screen.getByRole("heading", { name: "Current Checkin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare With Previous Checkin" })).toHaveAttribute(
      "href",
      "/clients/1?tab=check-ins&checkInId=demo-weekly-check-in&compare=previous"
    );
    expect(screen.getByRole("link", { name: "Go Back" })).toHaveAttribute("href", "/clients/1?tab=check-ins");
  });
});
