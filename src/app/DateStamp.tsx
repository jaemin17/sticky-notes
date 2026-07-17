"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { formatDateStamp } from "./formatDateStamp";

export function DateStamp() {
  const [stamp, setStamp] = useState(() => formatDateStamp(new Date()));

  useEffect(() => {
    function refresh() {
      setStamp(formatDateStamp(new Date()));
    }

    refresh();

    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const timeoutId = window.setTimeout(refresh, nextMidnight.getTime() - now.getTime());

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <time className={styles.dateStamp} dateTime={stamp.dateTime}>
      <em>{stamp.label}</em>
    </time>
  );
}
