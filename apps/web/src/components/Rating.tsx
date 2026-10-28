import styles from './Rating.module.css';

export function Rating({ rate, count }: { rate: number; count: number }) {
  const percent = Math.max(0, Math.min(100, (rate / 5) * 100));
  return (
    <span className={styles.rating}>
      <span className={styles.stars} aria-hidden="true">
        <span className={styles.filled} style={{ width: `${percent}%` }}>
          ★★★★★
        </span>
        ★★★★★
      </span>
      <span className="visually-hidden">
        Rated {rate} out of 5 from {count} reviews
      </span>
      <span className={styles.count} aria-hidden="true">
        {rate.toFixed(1)} ({count})
      </span>
    </span>
  );
}
