import { useState, type SubmitEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { SEARCH_TERM_MAX_LENGTH } from '@catalogue/shared';
import styles from './SearchBar.module.css';

export function SearchBar() {
  const [searchParams] = useSearchParams();
  const currentTerm = searchParams.get('q') ?? '';
  // Re-mount when the URL term changes (back button, shared links) so the box shows it.
  return <SearchForm key={currentTerm} initialTerm={currentTerm} />;
}

function SearchForm({ initialTerm }: { initialTerm: string }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState(initialTerm);
  const [showHint, setShowHint] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) {
      setShowHint(true);
      return;
    }
    setShowHint(false);
    navigate(`/search?${new URLSearchParams({ q: trimmed })}`);
  }

  return (
    <form role="search" className={styles.form} onSubmit={handleSubmit} noValidate>
      <label htmlFor="site-search" className="visually-hidden">
        Search products
      </label>
      <input
        id="site-search"
        type="search"
        className={styles.input}
        placeholder="Search products"
        value={term}
        maxLength={SEARCH_TERM_MAX_LENGTH}
        onChange={(event) => setTerm(event.target.value)}
        aria-describedby={showHint ? 'site-search-hint' : undefined}
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
      {showHint && (
        <p id="site-search-hint" className={styles.hint} role="alert">
          Enter a word to search for.
        </p>
      )}
    </form>
  );
}
