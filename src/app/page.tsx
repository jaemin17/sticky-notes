import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.board}>
        <section className={styles.hero} aria-labelledby="page-title">
          <p className={styles.eyebrow}>Next.js + GitHub Pages</p>
          <h1 id="page-title">我的便签网站</h1>
          <p>
            这是一个用 Next.js 创建、准备部署到 GitHub Pages 的最小页面。
            现在先跑通上线流程，之后再加入新增、删除和保存便签的功能。
          </p>
        </section>

        <section className={styles.note} aria-label="示例便签">
          <span className={styles.pin} aria-hidden="true" />
          <h2>今天的目标</h2>
          <p>先让这个页面从本地跑起来，再发布成一个可以访问的网址。</p>
        </section>
      </main>
    </div>
  );
}
