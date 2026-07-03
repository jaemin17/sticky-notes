import styles from "./page.module.css";

const sampleNotes = [
  {
    index: "001",
    text: "今天先把便签网站跑起来，确认本地和线上流程都通顺。",
    tone: "yellow",
  },
  {
    index: "002",
    text: "下一步试试新增便签，让想法可以被快速记下来。",
    tone: "green",
  },
  {
    index: "003",
    text: "保存功能先用浏览器本地存储，不急着做登录和云同步。",
    tone: "blue",
  },
  {
    index: "004",
    text: "界面保持轻一点，像一面可以随手贴东西的小墙。",
    tone: "purple",
  },
  {
    index: "005",
    text: "等基础体验稳定后，再慢慢加分类、搜索和更换颜色。",
    tone: "orange",
  },
] as const;

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.board}>
        {sampleNotes.map((note) => (
          <section key={note.index} className={`${styles.note} ${styles[note.tone]}`} aria-label="示例便签">
            <span className={styles.noteIndex}>{note.index}</span>
            <span className={styles.noteText}>{note.text}</span>
          </section>
        ))}
      </main>
    </div>
  );
}
