import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the vocabulary starter shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /build a calmer way/i })).toBeInTheDocument();
    expect(screen.getByText("serendipity")).toBeInTheDocument();
  });
});
