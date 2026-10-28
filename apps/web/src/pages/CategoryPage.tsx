import { Link, useParams } from 'react-router';
import { useCategoryPage } from '../api/catalogue';
import { ApiError } from '../api/client';
import { formatCategoryName } from '../lib/format';
import { Page } from '../components/Page';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { QueryError, StatusMessage } from '../components/StatusMessage';
import styles from './ListingPage.module.css';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const page = useCategoryPage(slug);

  if (page.isError) {
    if (page.error instanceof ApiError && page.error.status === 404) {
      return (
        <Page title="Category not found">
          <StatusMessage title="Category not found">
            <Link to="/" className="button">
              Back to home
            </Link>
          </StatusMessage>
        </Page>
      );
    }
    return (
      <Page title="Category">
        <QueryError error={page.error} onRetry={() => page.refetch()} />
      </Page>
    );
  }

  if (page.isPending) {
    return (
      <Page title="Category">
        <div className={styles.header}>
          <h1 className={styles.placeholderTitle} aria-busy="true">
            Loading…
          </h1>
        </div>
        <ProductGridSkeleton count={3} />
      </Page>
    );
  }

  const { category, topRated, others } = page.data;
  const name = formatCategoryName(category.name);

  return (
    <Page title={name}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Category</p>
        <h1>{name}</h1>
      </div>

      <section className={styles.section} aria-labelledby="top-rated-heading">
        <h2 id="top-rated-heading" className={styles.sectionTitle}>
          Top rated in {name}
        </h2>
        <ProductGrid products={topRated} label={`Top rated in ${name}`} />
      </section>

      {others.length > 0 && (
        <section className={styles.section} aria-labelledby="more-heading">
          <h2 id="more-heading" className={styles.sectionTitle}>
            More in {name}
          </h2>
          <ProductGrid products={others} label={`More in ${name}`} />
        </section>
      )}
    </Page>
  );
}
