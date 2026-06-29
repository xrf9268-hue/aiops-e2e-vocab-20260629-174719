import { FormEvent, useEffect, useMemo, useState } from "react";

type LearningStatus = "New" | "Learning" | "Mastered";

type VocabularyWord = {
  id: string;
  term: string;
  meaning: string;
  example: string;
  status: LearningStatus;
};

type WordFormState = Omit<VocabularyWord, "id">;

const STORAGE_KEY = "vocabulary-studio.words";

const statuses: LearningStatus[] = ["New", "Learning", "Mastered"];

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

function isVocabularyWord(value: unknown): value is VocabularyWord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const word = value as Partial<VocabularyWord>;
  return (
    typeof word.id === "string" &&
    typeof word.term === "string" &&
    typeof word.meaning === "string" &&
    typeof word.example === "string" &&
    typeof word.status === "string" &&
    statuses.includes(word.status as LearningStatus)
  );
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

function createWordId(term: string): string {
  return `${term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
}

export function App() {
  const [words, setWords] = useState<VocabularyWord[]>(loadStoredWords);
  const [formState, setFormState] = useState<WordFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LearningStatus>("All");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }, [words]);

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

    if (editingId === wordId) {
      resetForm();
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
        </dl>
      </section>

      <section className="workspace" aria-label="Vocabulary workspace">
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
    </main>
  );
}
