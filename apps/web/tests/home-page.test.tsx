import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { metadata } from "@/app/layout";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the dashboard stub heading", () => {
    render(createElement(HomePage));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Coach Operations Dashboard"
      })
    ).toBeInTheDocument();
  });

  it("uses the landing page favicon asset", () => {
    expect(metadata.icons).toEqual({
      icon: "/brand/favicon.svg"
    });
  });
});
