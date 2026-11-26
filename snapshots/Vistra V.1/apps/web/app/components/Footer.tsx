import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <Link className={styles.brand} href="/">VISTRAH</Link>
          <p>Managed services. One platform.</p>
        </div>
        <nav className={styles.links} aria-label="Footer navigation">
          <Link href="/about">About</Link>
          <Link href="/how-it-works">How It Works</Link>
          <Link href="/for-business">For Business</Link>
          <Link href="/refer">Refer &amp; Earn</Link>
        </nav>
        <div className={styles.copy}>© {new Date().getFullYear()} VISTRAH</div>
      </div>
    </footer>
  );
}
