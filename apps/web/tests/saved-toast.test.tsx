import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SavedToast } from "@/components/ui/saved-toast";

afterEach(() => {
  vi.useRealTimers();
});

describe("SavedToast", () => {
  it("dismisses itself after the configured duration", () => {
    vi.useFakeTimers();

    render(<SavedToast durationMs={5000} message="Meal plan saved." />);

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByText("Meal plan saved.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
