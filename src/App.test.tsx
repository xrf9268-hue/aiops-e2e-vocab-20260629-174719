import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders a seeded vocabulary library with definitions, examples, and status", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /vocabulary studio/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("word-card")).toHaveLength(8);
    expect(screen.getByRole("heading", { name: /meticulous/i })).toBeInTheDocument();
    expect(screen.getByText(/showing great attention to detail/i)).toBeInTheDocument();
    expect(screen.getByText(/the meticulous editor caught every typo/i)).toBeInTheDocument();
    expect(screen.getAllByText("Mastered").length).toBeGreaterThan(0);
  });

  it("adds a new word and persists it across reloads", () => {
    const { unmount } = render(<App />);

    fireEvent.change(screen.getByLabelText("Word"), { target: { value: "ephemeral" } });
    fireEvent.change(screen.getByLabelText("Meaning"), {
      target: { value: "Lasting for only a short time." }
    });
    fireEvent.change(screen.getByLabelText("Example sentence"), {
      target: { value: "The rainbow was ephemeral after the rain stopped." }
    });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Learning" } });
    fireEvent.click(screen.getByRole("button", { name: "Add word" }));

    expect(screen.getByRole("heading", { name: "ephemeral" })).toBeInTheDocument();
    expect(screen.getByText("Lasting for only a short time.")).toBeInTheDocument();

    unmount();
    render(<App />);

    expect(screen.getByRole("heading", { name: "ephemeral" })).toBeInTheDocument();
    expect(screen.getByText("The rainbow was ephemeral after the rain stopped.")).toBeInTheDocument();
  });

  it("edits an existing word and persists the changes", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Edit lucid" }));
    fireEvent.change(screen.getByLabelText("Meaning"), {
      target: { value: "Bright, clear, and easy to understand." }
    });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Mastered" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Bright, clear, and easy to understand.")).toBeInTheDocument();

    unmount();
    render(<App />);

    expect(screen.getByText("Bright, clear, and easy to understand.")).toBeInTheDocument();
    expect(screen.getAllByText("Mastered").length).toBeGreaterThanOrEqual(2);
  });

  it("deletes a word and keeps it deleted after reload", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Delete resilient" }));

    expect(screen.queryByRole("heading", { name: "resilient" })).not.toBeInTheDocument();

    unmount();
    render(<App />);

    expect(screen.queryByRole("heading", { name: "resilient" })).not.toBeInTheDocument();
  });

  it("filters the library by search text and learning status", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Search words"), { target: { value: "clear" } });

    expect(screen.getByRole("heading", { name: "lucid" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "resilient" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search words"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "Mastered" } });

    expect(screen.getByRole("heading", { name: "meticulous" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "lucid" })).not.toBeInTheDocument();
  });
});
