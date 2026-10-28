import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';

const SITE_NAME = 'Catalogue';

/** Every route renders inside a Page: it sets the document title and fades the content in. */
export function Page({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
