import {UiText} from "../../components/localized-ui";
import Image from 'next/image';
import brand from '@/components/brand.module.css';
import styles from './loading.module.css';
export default function Loading(){
  return <div className={styles.loading} role="status" aria-live="polite">
    <Image src="/brand/lockup-dark.svg" alt="VISTRAH" width={210} height={52} className={brand.dark} unoptimized/>
    <Image src="/brand/lockup-light.svg" alt="VISTRAH" width={210} height={52} className={brand.light} unoptimized/>
    <span className={styles.spinner} aria-hidden="true"/><p><UiText value={"Opening your next possibilities…"}/></p>
  </div>;
}
