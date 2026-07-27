import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompleteCoachLoadingScreen } from "@/components/ui/complete-coach-loading-screen";

describe("CompleteCoachLoadingScreen", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not flash for fast page loads", () => {
    vi.useFakeTimers();

    render(<CompleteCoachLoadingScreen title="Preparing clients" label="Preparing clients." />);

    expect(screen.queryByRole("status", { name: "Preparing clients." })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(159);
    });

    expect(screen.queryByRole("status", { name: "Preparing clients." })).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole("status", { name: "Preparing clients." })).toBeInTheDocument();
  });

  it("can show immediately when a caller opts out of the delay", () => {
    render(<CompleteCoachLoadingScreen title="Opening notes" label="Opening notes." delayMs={0} />);

    expect(screen.getByRole("status", { name: "Opening notes." })).toBeInTheDocument();
    expect(screen.getByText("Opening notes")).toBeInTheDocument();
  });
});
