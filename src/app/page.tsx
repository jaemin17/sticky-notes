import styles from "./page.module.css";
import { DateStamp } from "./DateStamp";
import { LocalNotes } from "./LocalNotes";

export default function Home() {
  return (
    <div className={styles.page}>
      <DateStamp />
      <main className={styles.board}>
        <LocalNotes initialIndex={0} />
      </main>
    </div>
  );
}
