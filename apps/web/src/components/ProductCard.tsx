import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { Product } from '@catalogue/shared';
import { formatCategoryName, formatPrice } from '../lib/format';
import { Rating } from './Rating';
import styles from './ProductCard.module.css';

export function ProductCard({ product }: { product: Product }) {
  return (
    <motion.article
      className={styles.card}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div className={styles.imageWell}>
        <img src={product.imageUrl} alt="" loading="lazy" className={styles.image} />
      </div>
      <div className={styles.body}>
        <p className={styles.category}>{formatCategoryName(product.category.name)}</p>
        <h3 className={styles.title}>
          {/* The link covers the whole card (see .link::after), so the tile is one click target. */}
          <Link to={`/products/${product.id}`} className={styles.link}>
            {product.title}
          </Link>
        </h3>
        <div className={styles.meta}>
          <Rating rate={product.rating.rate} count={product.rating.count} />
          <span className={styles.price}>{formatPrice(product.price)}</span>
        </div>
      </div>
    </motion.article>
  );
}
