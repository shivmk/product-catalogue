import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import styles from './StatusMessage.module.css';

export function StatusMessage({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children?: ReactNode;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div
      className={`${styles.status} ${styles[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.body}>{children}</div>}
    </div>
  );
}

/** Standard error block for a failed query, with a retry button. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiError ? error.message : 'Something went wrong while loading this page.';
  return (
    <StatusMessage title="We couldn't load this" tone="error">
      <p>{message}</p>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Try again
      </button>
    </StatusMessage>
  );
}
