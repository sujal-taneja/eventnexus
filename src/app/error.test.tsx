import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import ErrorPage from "./error";

describe("error boundary page", () => {
  it("renders generic error copy and reset button", () => {
    const reset = vi.fn();
    render(
      <ErrorPage
        error={Object.assign(new Error("boom"), {})}
        reset={reset}
      />
    );
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset when clicking Try again", () => {
    const reset = vi.fn();
    render(
      <ErrorPage
        error={Object.assign(new Error("boom"), {})}
        reset={reset}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

