import { useSearchParams } from 'react-router';
import { useProductSearch } from '../api/catalogue';
import { Page } from '../components/Page';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { QueryError, StatusMessage } from '../components/StatusMessage';
import styles from './ListingPage.module.css';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const term = (searchParams.get('q') ?? '').trim();
  const results = useProductSearch(term);

  if (!term) {
    return (
      <Page title="Search">
        <StatusMessage title="Search the catalogue">
          <p>Type a word in the search bar above, then press Search.</p>
        </StatusMessage>
      </Page>
    );
  }

  return (
    <Page title={`Search: ${term}`}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Search results</p>
        <h1>“{term}”</h1>
        {results.isSuccess && (
          <p className={styles.count} role="status">
            {results.data.length} {results.data.length === 1 ? 'product' : 'products'} found
          </p>
        )}
      </div>

      {results.isPending && <ProductGridSkeleton />}
      {results.isError && <QueryError error={results.error} onRetry={() => results.refetch()} />}
      {results.isSuccess &&
        (results.data.length > 0 ? (
          <ProductGrid products={results.data} label={`Search results for ${term}`} />
        ) : (
          <StatusMessage title={`No products match “${term}”`}>
            <p>Try a different or shorter word.</p>
          </StatusMessage>
        ))}
    </Page>
  );
}
