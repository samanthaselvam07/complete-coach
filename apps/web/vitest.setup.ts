import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, vi } from "vitest";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/complete_coach_test";

vi.mock("@rive-app/react-canvas", () => ({
  Alignment: {
    Center: "center"
  },
  Fit: {
    Contain: "contain"
  },
  Layout: class Layout {
    constructor(readonly params: Record<string, unknown> = {}) {}
  },
  useRive: () => ({
    rive: null,
    RiveComponent: (props: Record<string, unknown>) =>
      createElement("div", { ...props, role: "img", "data-rive-mock": "true" })
  }),
  useViewModel: () => null,
  useViewModelInstance: () => null,
  useViewModelInstanceBoolean: () => ({ setValue: vi.fn(), value: false })
}));

afterEach(() => {
  cleanup();
});
