import styles from "./page.module.css";
import { LocalNotes } from "./LocalNotes";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.board}>
        <LocalNotes initialIndex={0} />
      </main>
    </div>
  );
}
