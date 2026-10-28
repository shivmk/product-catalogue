import { motion, type Variants } from 'motion/react';
import type { Product } from '@catalogue/shared';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function ProductGrid({
  products,
  label,
  variant = 'default',
}: {
  products: Product[];
  label: string;
  /** "featured" uses a wider layout so five products sit on one row on desktop. */
  variant?: 'default' | 'featured';
}) {
  return (
    <motion.ul
      className={`${styles.grid} ${variant === 'featured' ? styles.featured : ''}`}
      aria-label={label}
      variants={list}
      initial="hidden"
      animate="visible"
    >
      {products.map((product) => (
        <motion.li key={product.id} variants={item} className={styles.item}>
          <ProductCard product={product} />
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.item}>
          <div className={styles.skeleton} />
        </li>
      ))}
    </ul>
  );
}
