import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";

type LearningStatus = "New" | "Learning" | "Mastered";
type ReviewBucket = "Again" | "Good" | "Easy";
type ActiveView = "library" | "study";

type VocabularyWord = {
  id: string;
  term: string;
  meaning: string;
  example: string;
  status: LearningStatus;
};

type WordFormState = Omit<VocabularyWord, "id">;
type ReviewProgress = {
  bucket: ReviewBucket;
  reviewCount: number;
  lastReviewedAt: string;
  nextDueAt: string;
};

type ReviewProgressMap = Record<string, ReviewProgress>;
type VocabularyExportPayload = {
  version: 1;
  exportedAt: string;
  words: VocabularyWord[];
  reviewProgress: ReviewProgressMap;
};
type SessionSummary = Record<ReviewBucket, number>;

const STORAGE_KEY = "vocabulary-studio.words";
const REVIEW_STORAGE_KEY = "vocabulary-studio.reviewProgress";

const statuses: LearningStatus[] = ["New", "Learning", "Mastered"];
const reviewBuckets: ReviewBucket[] = ["Again", "Good", "Easy"];
const reviewIntervals: Record<ReviewBucket, number> = {
  Again: 10 * 60 * 1000,
  Good: 24 * 60 * 60 * 1000,
  Easy: 4 * 24 * 60 * 60 * 1000
};

const seedWords: VocabularyWord[] = [
  {
    id: "seed-meticulous",
    term: "meticulous",
    meaning: "Showing great attention to detail.",
    example: "The meticulous editor caught every typo before publication.",
    status: "Mastered"
  },
  {
    id: "seed-resilient",
    term: "resilient",
    meaning: "Able to recover quickly after difficulty.",
    example: "Her resilient mindset helped the team adapt after the setback.",
    status: "Learning"
  },
  {
    id: "seed-lucid",
    term: "lucid",
    meaning: "Clear and easy to understand.",
    example: "His lucid explanation made the complex idea feel approachable.",
    status: "New"
  },
  {
    id: "seed-pragmatic",
    term: "pragmatic",
    meaning: "Focused on practical results rather than theory.",
    example: "They chose a pragmatic plan that could ship by Friday.",
    status: "Learning"
  },
  {
    id: "seed-eloquent",
    term: "eloquent",
    meaning: "Fluent, persuasive, and expressive in speech or writing.",
    example: "The advocate gave an eloquent argument for better libraries.",
    status: "New"
  },
  {
    id: "seed-candid",
    term: "candid",
    meaning: "Truthful and direct, even when the topic is difficult.",
    example: "The manager gave candid feedback without being harsh.",
    status: "Learning"
  },
  {
    id: "seed-nuance",
    term: "nuance",
    meaning: "A subtle difference in meaning, tone, or expression.",
    example: "Learning the nuance of a word makes writing more precise.",
    status: "New"
  },
  {
    id: "seed-diligent",
    term: "diligent",
    meaning: "Working carefully and steadily.",
    example: "The diligent student reviewed vocabulary for ten minutes daily.",
    status: "Learning"
  }
];

const emptyForm: WordFormState = {
  term: "",
  meaning: "",
  example: "",
  status: "New"
};

function createEmptySessionSummary(): SessionSummary {
  return {
    Again: 0,
    Good: 0,
    Easy: 0
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isVocabularyWord(value: unknown): value is VocabularyWord {
  if (!isRecord(value)) {
    return false;
  }

  const word = value as Partial<VocabularyWord>;
  return (
    typeof word.id === "string" &&
    word.id.trim().length > 0 &&
    typeof word.term === "string" &&
    word.term.trim().length > 0 &&
    typeof word.meaning === "string" &&
    word.meaning.trim().length > 0 &&
    typeof word.example === "string" &&
    word.example.trim().length > 0 &&
    typeof word.status === "string" &&
    statuses.includes(word.status as LearningStatus)
  );
}

function isReviewProgress(value: unknown): value is ReviewProgress {
  if (!isRecord(value)) {
    return false;
  }

  const progress = value as Partial<ReviewProgress>;
  return (
    typeof progress.bucket === "string" &&
    reviewBuckets.includes(progress.bucket as ReviewBucket) &&
    typeof progress.reviewCount === "number" &&
    Number.isInteger(progress.reviewCount) &&
    progress.reviewCount >= 0 &&
    typeof progress.lastReviewedAt === "string" &&
    Number.isFinite(Date.parse(progress.lastReviewedAt)) &&
    typeof progress.nextDueAt === "string" &&
    Number.isFinite(Date.parse(progress.nextDueAt))
  );
}

function hasUniqueWordIds(words: VocabularyWord[]): boolean {
  return new Set(words.map((word) => word.id)).size === words.length;
}

function isReviewProgressMapForWords(
  value: unknown,
  validWordIds: Set<string>
): value is ReviewProgressMap {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([wordId, progress]) => validWordIds.has(wordId) && isReviewProgress(progress)
  );
}

function isVocabularyExportPayload(value: unknown): value is VocabularyExportPayload {
  if (!isRecord(value) || value.version !== 1 || typeof value.exportedAt !== "string") {
    return false;
  }

  if (!Number.isFinite(Date.parse(value.exportedAt)) || !Array.isArray(value.words)) {
    return false;
  }

  if (!value.words.every(isVocabularyWord) || !hasUniqueWordIds(value.words)) {
    return false;
  }

  return isReviewProgressMapForWords(
    value.reviewProgress,
    new Set(value.words.map((word) => word.id))
  );
}

function createExportPayload(
  words: VocabularyWord[],
  reviewProgress: ReviewProgressMap
): VocabularyExportPayload {
  const wordIds = new Set(words.map((word) => word.id));
  const exportableProgress = Object.entries(reviewProgress).reduce<ReviewProgressMap>(
    (progressMap, [wordId, progress]) => {
      if (wordIds.has(wordId)) {
        progressMap[wordId] = progress;
      }

      return progressMap;
    },
    {}
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    words,
    reviewProgress: exportableProgress
  };
}

function parseImportPayload(source: string): VocabularyExportPayload | null {
  try {
    const parsed: unknown = JSON.parse(source);
    return isVocabularyExportPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadStoredWords(): VocabularyWord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return seedWords;
    }

    const parsed: unknown = JSON.parse(stored);

    if (Array.isArray(parsed) && parsed.every(isVocabularyWord)) {
      return parsed;
    }
  } catch {
    return seedWords;
  }

  return seedWords;
}

function loadStoredReviewProgress(): ReviewProgressMap {
  try {
    const stored = localStorage.getItem(REVIEW_STORAGE_KEY);

    if (!stored) {
      return {};
    }

    const parsed: unknown = JSON.parse(stored);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce<ReviewProgressMap>((progressMap, [wordId, progress]) => {
        if (isReviewProgress(progress)) {
          progressMap[wordId] = progress;
        }

        return progressMap;
      }, {});
    }
  } catch {
    return {};
  }

  return {};
}

function createWordId(term: string): string {
  return `${term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
}

function isDue(progress: ReviewProgress | undefined, now = Date.now()): boolean {
  if (!progress) {
    return true;
  }

  return Date.parse(progress.nextDueAt) <= now;
}

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getDueText(progress: ReviewProgress | undefined): string {
  if (!progress || isDue(progress)) {
    return "Due now";
  }

  return `Next due: ${formatDueDate(progress.nextDueAt)}`;
}

export function App() {
  const [words, setWords] = useState<VocabularyWord[]>(loadStoredWords);
  const [reviewProgress, setReviewProgress] = useState<ReviewProgressMap>(loadStoredReviewProgress);
  const [formState, setFormState] = useState<WordFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LearningStatus>("All");
  const [activeView, setActiveView] = useState<ActiveView>("library");
  const [studyIndex, setStudyIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [exportJson, setExportJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>(createEmptySessionSummary);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewProgress));
  }, [reviewProgress]);

  const visibleWords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return words.filter((word) => {
      const matchesSearch =
        query.length === 0 ||
        [word.term, word.meaning, word.example].some((field) => field.toLowerCase().includes(query));
      const matchesStatus = statusFilter === "All" || word.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, words]);

  const dueWords = useMemo(
    () => words.filter((word) => isDue(reviewProgress[word.id])),
    [reviewProgress, words]
  );

  const statusCounts = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: words.filter((word) => word.status === status).length
      })),
    [words]
  );

  const editingWord = editingId ? words.find((word) => word.id === editingId) : undefined;
  const formTitle = editingWord ? `Editing ${editingWord.term}` : "Add a word";
  const studyWord = dueWords[studyIndex] ?? dueWords[0];
  const currentStudyProgress = studyWord ? reviewProgress[studyWord.id] : undefined;
  const sessionReviewedCount = reviewBuckets.reduce(
    (total, bucket) => total + sessionSummary[bucket],
    0
  );

  useEffect(() => {
    if (studyIndex >= dueWords.length && dueWords.length > 0) {
      setStudyIndex(0);
    }
  }, [dueWords.length, studyIndex]);

  function updateFormField<Key extends keyof WordFormState>(field: Key, value: WordFormState[Key]) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setFormState(emptyForm);
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextWord: WordFormState = {
      term: formState.term.trim(),
      meaning: formState.meaning.trim(),
      example: formState.example.trim(),
      status: formState.status
    };

    if (!nextWord.term || !nextWord.meaning || !nextWord.example) {
      return;
    }

    if (editingId) {
      setWords((current) =>
        current.map((word) => (word.id === editingId ? { ...word, ...nextWord } : word))
      );
    } else {
      setWords((current) => [{ id: createWordId(nextWord.term), ...nextWord }, ...current]);
    }

    resetForm();
  }

  function startEditing(word: VocabularyWord) {
    setEditingId(word.id);
    setFormState({
      term: word.term,
      meaning: word.meaning,
      example: word.example,
      status: word.status
    });
  }

  function deleteWord(wordId: string) {
    setWords((current) => current.filter((word) => word.id !== wordId));
    setReviewProgress((current) => {
      const nextProgress = { ...current };
      delete nextProgress[wordId];
      return nextProgress;
    });

    if (editingId === wordId) {
      resetForm();
    }
  }

  function handleExport() {
    setExportJson(JSON.stringify(createExportPayload(words, reviewProgress), null, 2));
    setImportError("");
    setImportStatus("Export ready. Copy the JSON when you want to move this library.");
  }

  function handleImport() {
    const payload = parseImportPayload(importJson);

    if (!payload) {
      setImportError("Import failed: JSON must include valid vocabulary words and review progress.");
      setImportStatus("");
      return;
    }

    setWords(payload.words);
    setReviewProgress(payload.reviewProgress);
    setSearchTerm("");
    setStatusFilter("All");
    setStudyIndex(0);
    setAnswerVisible(false);
    setSessionSummary(createEmptySessionSummary());
    setImportError("");
    setImportStatus(`Import complete. ${payload.words.length} words restored.`);
    setExportJson("");
    resetForm();
  }

  function showView(view: ActiveView) {
    setActiveView(view);
    setAnswerVisible(false);
  }

  function revealAnswer() {
    setAnswerVisible(true);
  }

  function recordReview(bucket: ReviewBucket) {
    if (!studyWord || !answerVisible) {
      return;
    }

    const reviewedAt = new Date();
    const nextDue = new Date(reviewedAt.getTime() + reviewIntervals[bucket]);

    setReviewProgress((current) => ({
      ...current,
      [studyWord.id]: {
        bucket,
        reviewCount: (current[studyWord.id]?.reviewCount ?? 0) + 1,
        lastReviewedAt: reviewedAt.toISOString(),
        nextDueAt: nextDue.toISOString()
      }
    }));
    setSessionSummary((current) => ({
      ...current,
      [bucket]: current[bucket] + 1
    }));
    setAnswerVisible(false);
  }

  function handleStudyKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!studyWord) {
      return;
    }

    if (!answerVisible && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      revealAnswer();
      return;
    }

    if (!answerVisible) {
      return;
    }

    const bucketByKey: Record<string, ReviewBucket> = {
      "1": "Again",
      "2": "Good",
      "3": "Easy"
    };
    const bucket = bucketByKey[event.key];

    if (bucket) {
      event.preventDefault();
      recordReview(bucket);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="app-title">
        <div>
          <p className="eyebrow">Vocabulary library</p>
          <h1 id="app-title">Vocabulary Studio</h1>
          <p className="hero-copy">
            Capture words, examples, and learning status in one durable study workspace.
          </p>
          <div className="view-switcher" aria-label="Workspace view">
            <button
              type="button"
              aria-pressed={activeView === "library"}
              onClick={() => showView("library")}
            >
              Library
            </button>
            <button type="button" aria-pressed={activeView === "study"} onClick={() => showView("study")}>
              Study
            </button>
          </div>
        </div>
        <dl className="status-summary" aria-label="Vocabulary status summary">
          <div>
            <dt>Total</dt>
            <dd>{words.length}</dd>
          </div>
          {statusCounts.map(({ status, count }) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>{count}</dd>
            </div>
          ))}
          <div>
            <dt>Due</dt>
            <dd>{dueWords.length}</dd>
          </div>
        </dl>
      </section>

      {activeView === "library" ? (
      <section className="workspace" aria-label="Vocabulary workspace">
        <div className="workspace-sidebar">
          <form className="word-form" onSubmit={handleSubmit} aria-labelledby="word-form-title">
            <div className="section-heading">
              <p className="section-kicker">Editor</p>
              <h2 id="word-form-title">{formTitle}</h2>
            </div>

            <label>
              <span>Word</span>
              <input
                value={formState.term}
                onChange={(event) => updateFormField("term", event.target.value)}
                placeholder="e.g. ephemeral"
                required
              />
            </label>

            <label>
              <span>Meaning</span>
              <textarea
                value={formState.meaning}
                onChange={(event) => updateFormField("meaning", event.target.value)}
                placeholder="Short definition"
                required
                rows={3}
              />
            </label>

            <label>
              <span>Example sentence</span>
              <textarea
                value={formState.example}
                onChange={(event) => updateFormField("example", event.target.value)}
                placeholder="Use the word in context"
                required
                rows={3}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={formState.status}
                onChange={(event) => updateFormField("status", event.target.value as LearningStatus)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button type="submit" className="primary-action">
                {editingId ? "Save changes" : "Add word"}
              </button>
              {editingId ? (
                <button type="button" className="secondary-action" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <section className="data-panel" aria-labelledby="data-tools-title">
            <div className="section-heading">
              <p className="section-kicker">Portability</p>
              <h2 id="data-tools-title">Import and export</h2>
            </div>

            <button type="button" className="secondary-action" onClick={handleExport}>
              Export JSON
            </button>

            {exportJson ? (
              <label>
                <span>Export JSON</span>
                <textarea readOnly value={exportJson} rows={7} />
              </label>
            ) : null}

            <label>
              <span>Import JSON</span>
              <textarea
                value={importJson}
                onChange={(event) => setImportJson(event.target.value)}
                placeholder="Paste exported vocabulary JSON"
                rows={6}
              />
            </label>

            <div className="form-actions">
              <button type="button" className="primary-action" onClick={handleImport}>
                Import JSON
              </button>
            </div>

            {importError ? (
              <p className="import-error" role="alert">
                {importError}
              </p>
            ) : null}
            {importStatus ? <p className="import-status">{importStatus}</p> : null}
          </section>
        </div>

        <section className="library" aria-labelledby="library-title">
          <div className="library-header">
            <div className="section-heading">
              <p className="section-kicker">Library</p>
              <h2 id="library-title">Word list</h2>
            </div>
            <div className="filters" aria-label="Vocabulary filters">
              <label>
                <span>Search words</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search word, meaning, or example"
                />
              </label>
              <label>
                <span>Filter by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "All" | LearningStatus)}
                >
                  <option value="All">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="word-list" aria-live="polite">
            {visibleWords.length > 0 ? (
              visibleWords.map((word) => (
                <article key={word.id} className="word-card" data-testid="word-card">
                  <div className="word-card-main">
                    <div>
                      <h3>{word.term}</h3>
                      <p>{word.meaning}</p>
                      <div className="review-metadata" aria-label={`${word.term} review progress`}>
                        <span>Review: {reviewProgress[word.id]?.bucket ?? "Not started"}</span>
                        <span>Reviews: {reviewProgress[word.id]?.reviewCount ?? 0}</span>
                        <span>{getDueText(reviewProgress[word.id])}</span>
                      </div>
                    </div>
                    <span className={`status-pill status-${word.status.toLowerCase()}`}>
                      {word.status}
                    </span>
                  </div>
                  <blockquote>{word.example}</blockquote>
                  <div className="word-actions">
                    <button type="button" onClick={() => startEditing(word)}>
                      Edit {word.term}
                    </button>
                    <button type="button" onClick={() => deleteWord(word.id)}>
                      Delete {word.term}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No words match the current filters.</p>
            )}
          </div>
        </section>
      </section>
      ) : (
        <section className="study-view" aria-labelledby="study-title">
          <div className="study-header">
            <div className="section-heading">
              <p className="section-kicker">Study</p>
              <h2 id="study-title">Study mode</h2>
            </div>
            <p className="study-count">{dueWords.length} due</p>
          </div>

          {studyWord ? (
            <article
              className="study-card"
              data-testid="study-card"
              tabIndex={0}
              onKeyDown={handleStudyKeyDown}
              aria-describedby="study-shortcuts"
            >
              <div className="study-card-topline">
                <span>
                  Card {Math.min(studyIndex + 1, dueWords.length)} of {dueWords.length}
                </span>
                <span>{getDueText(currentStudyProgress)}</span>
              </div>
              <h3>{studyWord.term}</h3>
              <p className="study-prompt">Recall the meaning and example before checking the answer.</p>
              <div className="review-metadata" aria-label={`${studyWord.term} study progress`}>
                <span>Review: {currentStudyProgress?.bucket ?? "Not started"}</span>
                <span>Reviews: {currentStudyProgress?.reviewCount ?? 0}</span>
              </div>

              {answerVisible ? (
                <div className="study-answer">
                  <p>{studyWord.meaning}</p>
                  <blockquote>{studyWord.example}</blockquote>
                  <div className="review-actions" aria-label="Record review result">
                    {reviewBuckets.map((bucket) => (
                      <button key={bucket} type="button" onClick={() => recordReview(bucket)}>
                        {bucket}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button type="button" className="primary-action" onClick={revealAnswer}>
                  Check answer
                </button>
              )}

              <p id="study-shortcuts" className="shortcut-hint">
                Enter reveals. After reveal, 1 Again, 2 Good, 3 Easy.
              </p>
            </article>
          ) : (
            <div className="study-empty">
              <h3>No cards due</h3>
              <p>Every saved word has review progress scheduled for later.</p>
            </div>
          )}

          {sessionReviewedCount > 0 ? (
            <section className="session-summary" aria-label="Study session summary">
              <p className="section-kicker">Session summary</p>
              <dl>
                <div>
                  <dt>Reviewed</dt>
                  <dd>{sessionReviewedCount}</dd>
                </div>
                {reviewBuckets.map((bucket) => (
                  <div key={bucket}>
                    <dt>{bucket}</dt>
                    <dd>{sessionSummary[bucket]}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}
