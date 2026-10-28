import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useProduct } from '../api/catalogue';
import { ApiError } from '../api/client';
import { formatCategoryName, formatPrice } from '../lib/format';
import { Page } from '../components/Page';
import { Rating } from '../components/Rating';
import { QueryError, StatusMessage } from '../components/StatusMessage';
import styles from './ProductPage.module.css';

// Loaded on demand: the form (and the validation library it brings) is only needed after
// a customer clicks Enquire.
const EnquiryForm = lazy(() =>
  import('../components/EnquiryForm').then((module) => ({ default: module.EnquiryForm })),
);

export function ProductPage() {
  const { id } = useParams();
  // Keyed by id so moving between products resets the enquiry form state.
  return <ProductDetails key={id} productId={Number(id)} />;
}

function ProductDetails({ productId }: { productId: number }) {
  const product = useProduct(productId);
  const [enquiring, setEnquiring] = useState(false);

  const notFound =
    !Number.isInteger(productId) ||
    productId <= 0 ||
    (product.error instanceof ApiError && product.error.status === 404);

  if (notFound) {
    return (
      <Page title="Product not found">
        <StatusMessage title="Product not found">
          <p>It may have been removed from the catalogue.</p>
          <Link to="/" className="button">
            Back to home
          </Link>
        </StatusMessage>
      </Page>
    );
  }

  if (product.isError) {
    return (
      <Page title="Product">
        <QueryError error={product.error} onRetry={() => product.refetch()} />
      </Page>
    );
  }

  if (product.isPending) {
    return (
      <Page title="Product">
        <div className={styles.layout} aria-busy="true">
          <div className={`${styles.imageWell} ${styles.loading}`} />
          <div className={styles.details}>
            <p>Loading product…</p>
          </div>
        </div>
      </Page>
    );
  }

  const { data } = product;
  const categoryName = formatCategoryName(data.category.name);

  return (
    <Page title={data.title}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/categories/${data.category.slug}`}>{categoryName}</Link>
      </nav>

      <div className={styles.layout}>
        <motion.div
          className={styles.imageWell}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <img src={data.imageUrl} alt={data.title} className={styles.image} />
        </motion.div>

        <div className={styles.details}>
          <p className={styles.category}>{categoryName}</p>
          <h1 className={styles.title}>{data.title}</h1>
          <Rating rate={data.rating.rate} count={data.rating.count} />
          <p className={styles.price}>{formatPrice(data.price)}</p>
          <p className={styles.description}>{data.description}</p>

          {!enquiring && (
            <button
              type="button"
              className={`button ${styles.enquire}`}
              onClick={() => setEnquiring(true)}
            >
              Enquire
            </button>
          )}

          <AnimatePresence>
            {enquiring && (
              <motion.div
                key="enquiry"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Suspense fallback={<p>Loading form…</p>}>
                  <EnquiryForm product={data} />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Page>
  );
}
