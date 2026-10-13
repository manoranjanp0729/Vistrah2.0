import Image from 'next/image';
import brand from '@/components/brand.module.css';
import styles from './loading.module.css';
export default function Loading(){
  return <div className={styles.loading} role="status" aria-live="polite">
    <Image src="/brand/lockup-dark.svg" alt="VISTRAH" width={176} height={44} className={brand.dark} unoptimized/>
    <Image src="/brand/lockup-light.svg" alt="VISTRAH" width={176} height={44} className={brand.light} unoptimized/>
    <span className={styles.spinner} aria-hidden="true"/><p>Opening your next possibilities…</p>
  </div>;
}
