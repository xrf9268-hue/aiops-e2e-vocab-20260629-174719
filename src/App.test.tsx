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

  it("runs a study review by revealing the answer before recording progress", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Study" }));

    expect(screen.getByRole("heading", { name: /study mode/i })).toBeInTheDocument();
    expect(screen.getByTestId("study-card")).toHaveTextContent("meticulous");
    expect(screen.queryByText(/showing great attention to detail/i)).not.toBeInTheDocument();
    expect(screen.getByText("Reviews: 0")).toBeInTheDocument();
    expect(screen.getByText("Due now")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByText(/showing great attention to detail/i)).toBeInTheDocument();
    expect(screen.getByText(/the meticulous editor caught every typo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Good" }));

    const storedProgress = JSON.parse(localStorage.getItem("vocabulary-studio.reviewProgress") ?? "{}");
    expect(storedProgress["seed-meticulous"]).toMatchObject({
      bucket: "Good",
      reviewCount: 1
    });
    expect(storedProgress["seed-meticulous"].lastReviewedAt).toEqual(expect.any(String));
    expect(storedProgress["seed-meticulous"].nextDueAt).toEqual(expect.any(String));

    fireEvent.click(screen.getByRole("button", { name: "Library" }));

    expect(screen.getByText("Review: Good")).toBeInTheDocument();
    expect(screen.getByText("Reviews: 1")).toBeInTheDocument();
  });

  it("supports keyboard shortcuts for revealing and grading study cards", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Study" }));

    const studyCard = screen.getByTestId("study-card");
    fireEvent.keyDown(studyCard, { key: "Enter" });

    expect(screen.getByText(/showing great attention to detail/i)).toBeInTheDocument();

    fireEvent.keyDown(studyCard, { key: "3" });

    const storedProgress = JSON.parse(localStorage.getItem("vocabulary-studio.reviewProgress") ?? "{}");
    expect(storedProgress["seed-meticulous"]).toMatchObject({
      bucket: "Easy",
      reviewCount: 1
    });
  });

  it("rejects invalid import JSON with a clear error and keeps the current library", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Import JSON"), {
      target: { value: '{"words":[{"id":"broken","term":"broken"}],"reviewProgress":{}}' }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import JSON" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Import failed: JSON must include valid vocabulary words and review progress."
    );
    expect(screen.getByRole("heading", { name: "meticulous" })).toBeInTheDocument();
    expect(screen.getAllByTestId("word-card")).toHaveLength(8);
  });

  it("exports words with review progress and imports the JSON into a fresh library", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Study" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));

    const exportedJson = screen.getByLabelText("Export JSON") as HTMLTextAreaElement;
    expect(exportedJson.value).toContain('"version": 1');
    expect(exportedJson.value).toContain('"reviewProgress"');

    unmount();
    localStorage.clear();
    render(<App />);

    fireEvent.change(screen.getByLabelText("Import JSON"), {
      target: { value: exportedJson.value }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import JSON" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Import complete. 8 words restored.")).toBeInTheDocument();
    expect(screen.getByText("Review: Good")).toBeInTheDocument();
    expect(screen.getByText("Reviews: 1")).toBeInTheDocument();
  });

  it("shows a study-session summary after recording review results", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Study" }));

    expect(screen.queryByRole("region", { name: "Study session summary" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Again" }));

    expect(screen.getByRole("region", { name: "Study session summary" })).toHaveTextContent(
      /Reviewed\s*1/
    );
    expect(screen.getByRole("region", { name: "Study session summary" })).toHaveTextContent(
      /Again\s*1/
    );
    expect(screen.getByRole("region", { name: "Study session summary" })).toHaveTextContent(
      /Good\s*0/
    );
    expect(screen.getByRole("region", { name: "Study session summary" })).toHaveTextContent(
      /Easy\s*0/
    );
  });
});
