import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useCategories } from '../api/catalogue';
import { formatCategoryName } from '../lib/format';
import { SearchBar } from './SearchBar';
import styles from './Layout.module.css';

export function Layout() {
  const categories = useCategories();

  return (
    <>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMark} aria-hidden="true" />
            Catalogue
          </Link>
          <SearchBar />
        </div>
        <nav aria-label="Categories" className={styles.nav}>
          <ul className={`container ${styles.navList}`}>
            {categories.data?.map((category) => (
              <li key={category.slug}>
                <NavLink
                  to={`/categories/${category.slug}`}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  {formatCategoryName(category.name)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className={`container ${styles.main}`}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className="container">Proof of concept · product data from Fake Store API</div>
      </footer>
      <ScrollRestoration />
    </>
  );
}
