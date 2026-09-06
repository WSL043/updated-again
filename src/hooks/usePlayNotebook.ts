import { useCallback, useEffect, useRef, useState } from "react";
import { discover, emptyNotebook, loadNotebook, mergeNotebooks, NOTEBOOK_KEY, parseNotebook, saveNotebook, type Notebook } from "../core/play-notebook";

export function usePlayNotebook() {
  const [initial] = useState(() => {
    try { return { notebook: loadNotebook(window.localStorage), warning: "" }; }
    catch { return { notebook: emptyNotebook(), warning: "本地笔记不可读取。可以继续玩；新发现请及时导出，旧数据不会被覆盖。" }; }
  });
  const [notebook, setNotebook] = useState(initial.notebook);
  const [warning, setWarning] = useState(initial.warning);
  const current = useRef(notebook);
  const accept = useCallback((next: Notebook) => { current.current = next; setNotebook(next); }, []);
  const persist = useCallback((next: Notebook) => {
    let merged = next;
    try { merged = saveNotebook(window.localStorage, next); setWarning(""); }
    catch { setWarning("本地保存失败。新发现暂留在本页，请导出笔记；不要直接关闭页面。旧数据没有被覆盖。"); }
    accept(merged);
    return merged;
  }, [accept]);

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (event.key !== NOTEBOOK_KEY && event.key !== null) return;
      // Respect an explicit storage clear instead of resurrecting deleted data.
      if (event.newValue === null) { accept(emptyNotebook()); return; }
      try { persist(mergeNotebooks(current.current, parseNotebook(event.newValue))); }
      catch { setWarning("另一个窗口的笔记无法读取；这页的发现仍然保留。"); }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [accept, persist]);

  const record = useCallback((id: string) => {
    const known = current.current.discoveries.includes(id);
    persist(discover(current.current, id));
    return !known;
  }, [persist]);
  const importText = useCallback((text: string) => {
    const incoming = parseNotebook(text); // Validate the entire file before changing anything.
    const before = current.current.discoveries.length;
    const merged = persist(mergeNotebooks(current.current, incoming));
    return merged.discoveries.length - before;
  }, [persist]);
  return { notebook, warning, record, importText };
}
