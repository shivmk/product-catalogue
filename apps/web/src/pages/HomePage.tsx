import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useCategories, useFeaturedProducts } from '../api/catalogue';
import { formatCategoryName } from '../lib/format';
import { Page } from '../components/Page';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { QueryError } from '../components/StatusMessage';
import styles from './HomePage.module.css';

export function HomePage() {
  const featured = useFeaturedProducts();
  const categories = useCategories();

  return (
    <Page title="">
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className={styles.eyebrow}>New season catalogue</p>
          <h1 className={styles.heroTitle}>Things worth having, picked with care.</h1>
          <p className={styles.heroText}>
            Browse our favourites, explore by category, and enquire about anything that catches your
            eye.
          </p>
          <a href="#top-rated" className="button">
            See our top rated
          </a>
        </motion.div>
      </section>

      <section id="top-rated" className={styles.section} aria-labelledby="top-rated-heading">
        <div className={styles.sectionHeader}>
          <h2 id="top-rated-heading">Top rated</h2>
          <p>Hand-picked favourites from across the catalogue.</p>
        </div>
        {featured.isPending && <ProductGridSkeleton count={5} />}
        {featured.isError && (
          <QueryError error={featured.error} onRetry={() => featured.refetch()} />
        )}
        {featured.isSuccess && (
          <ProductGrid products={featured.data} label="Top rated products" variant="featured" />
        )}
      </section>

      {categories.isSuccess && categories.data.length > 0 && (
        <section className={styles.section} aria-labelledby="categories-heading">
          <div className={styles.sectionHeader}>
            <h2 id="categories-heading">Shop by category</h2>
          </div>
          <ul className={styles.categoryList}>
            {categories.data.map((category) => (
              <li key={category.slug}>
                <Link to={`/categories/${category.slug}`} className={styles.categoryTile}>
                  <span>{formatCategoryName(category.name)}</span>
                  <span aria-hidden="true" className={styles.arrow}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
