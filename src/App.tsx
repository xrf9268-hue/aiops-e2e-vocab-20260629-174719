const sampleWords = [
  { term: "serendipity", meaning: "Finding something good without looking for it." },
  { term: "resilient", meaning: "Able to recover after difficulty." },
  { term: "lucid", meaning: "Clear and easy to understand." }
];

export function App() {
  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="app-title">
        <p className="eyebrow">Vocabulary Studio</p>
        <h1 id="app-title">Build a calmer way to learn words</h1>
        <p>
          This starter app is ready for the maker/reviewer workflow. The GitHub
          issues will turn it into a full vocabulary library and study tool.
        </p>
      </section>
      <section className="word-preview" aria-label="Starter vocabulary">
        {sampleWords.map((word) => (
          <article key={word.term}>
            <h2>{word.term}</h2>
            <p>{word.meaning}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

