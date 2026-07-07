import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { metadata } from "@/app/layout";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the waitlist as the public home page", () => {
    render(createElement(HomePage));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your coaching platform should work as hard as you do."
      })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /join the waitlist/i })).toHaveLength(2);
  });

  it("uses the landing page favicon asset", () => {
    expect(metadata.icons).toEqual({
      icon: "/brand/favicon.svg"
    });
  });
});
