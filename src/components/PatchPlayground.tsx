import { useEffect, useMemo, useRef, useState } from "react";
import { availableMaterials, dailyExperiment, EXPERIMENT_BY_ID, EXPERIMENTS, FAMILIES, MATERIAL_KINDS, MATERIALS, METHODS, mix, projectDay, type Experiment, type Method } from "../core/patch-playground";
import { loadMaterialCache, MAX_NOTEBOOK_BYTES, saveMaterialCache, serializeNotebook } from "../core/play-notebook";
import type { FeedEntry, UpdateKind } from "../core/types";
import { usePlayNotebook } from "../hooks/usePlayNotebook";
import "./patch-playground.css";

export function PatchPlayground({ entries, installedIds }: { entries: readonly FeedEntry[]; installedIds: readonly string[] }) {
  const { notebook, warning, record, importText } = usePlayNotebook();
  const [cache] = useState(() => { try { return loadMaterialCache(window.localStorage); } catch { return []; } });
  const materials = useMemo(() => availableMaterials(entries, installedIds, cache), [entries, installedIds, cache]);
  const owned = new Set(materials.map((item) => item.kind));
  const [a, setA] = useState<UpdateKind>("theme");
  const [b, setB] = useState<UpdateKind>("message");
  const first = materials.find((item) => item.kind === a) ?? materials[0];
  const second = materials.find((item) => item.kind === b) ?? materials[1] ?? materials[0];
  const [method, setMethod] = useState<Method>("shake");
  const [day, setDay] = useState(projectDay);
  const goal = dailyExperiment(day);
  const [hintState, setHintState] = useState({ day, count: 0 });
  const hints = hintState.day === day ? hintState.count : 0;
  const [result, setResult] = useState<Experiment | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [shareText, setShareText] = useState("");
  const [cacheWarning, setCacheWarning] = useState("");
  const [importing, setImporting] = useState(false);
  const importLock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const discoveries = new Set(notebook.discoveries);
  const missing = [...new Set([goal.a, goal.b])].filter((kind) => !owned.has(kind));
  const reachable = EXPERIMENTS.filter((recipe) => owned.has(recipe.a) && owned.has(recipe.b));
  const unexplored = reachable.filter((recipe) => !discoveries.has(recipe.id));

  useEffect(() => {
    const tick = () => setDay(projectDay());
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, []);
  useEffect(() => {
    try { saveMaterialCache(window.localStorage, materials); setCacheWarning(""); }
    catch { setCacheWarning("材料标签未能缓存，断网重开时可能需要先读取账本。"); }
  }, [materials]);

  const perform = () => {
    if (!first || !second) return;
    const experiment = mix(first.kind, second.kind, method);
    const fresh = record(experiment.id);
    setResult(experiment);
    setShareText("");
    setAnnouncement(`${experiment.id === goal.id ? "今日线索解开了！" : ""}${fresh ? "新发现：" : "再次见面："}${experiment.name}。${fresh ? "已加入本页图鉴。" : "重复实验不增加收集数。"}`);
  };
  const prepare = (recipe: Experiment) => {
    setA(recipe.a); setB(recipe.b); setMethod(recipe.method);
    setAnnouncement(`材料已摆好：${MATERIALS[recipe.a].label}、${MATERIALS[recipe.b].label}。试试${METHODS.find((item) => item.id === recipe.method)!.label}。`);
  };
  const exportFile = () => {
    try {
      const url = URL.createObjectURL(new Blob([serializeNotebook(notebook)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `updated-again-notebook-${day}.json`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setAnnouncement("已生成实验笔记文件。它只包含发现记录，不包含聊天、账号或签名存档。");
    } catch { setAnnouncement("浏览器没有允许导出文件，请保留本页后重试。"); }
  };
  const importFile = async (file: File | undefined) => {
    if (!file || importLock.current) return;
    importLock.current = true; setImporting(true);
    try {
      if (file.size > MAX_NOTEBOOK_BYTES) throw new Error("笔记太大了，最多支持 32 KB。");
      const added = importText(await file.text());
      setAnnouncement(`已合并 ${added} 条新发现；已有记录没有被替换。材料仍以本机实际安装为准。`);
    } catch (error) { setAnnouncement(error instanceof Error ? error.message : "导入失败，原笔记没有改动。"); }
    finally { importLock.current = false; setImporting(false); }
  };
  const copyResult = async () => {
    if (!result) return;
    const text = `我在「又更了」发现了${result.name}。\n${MATERIALS[result.a].label} + ${MATERIALS[result.b].label} → ${METHODS.find((item) => item.id === result.method)!.label}\n${result.note}\nhttps://wsl043.github.io/updated-again/`;
    try { await navigator.clipboard.writeText(text); setShareText(""); setAnnouncement("发现卡片已复制，可以发给朋友试同一个配方。"); }
    catch { setShareText(text); setAnnouncement("浏览器未允许复制。下方文字可以手动选择复制。"); }
  };

  return (
    <section className="patch-playground" aria-labelledby="playground-heading">
      <header className="playground-heading">
        <div><p className="playground-kicker">旧更新的新用法</p><h2 id="playground-heading">补丁混合台</h2><p>借两份装过的变化，看看会发生什么。同一种也能放两份；只借副本，不消耗原版。</p></div>
        <div className="playground-counter"><strong>{notebook.discoveries.length}<small> / {EXPERIMENTS.length}</small></strong><span>发现记录 · 28 类标本 × 3 种状态</span><progress aria-label="标本发现进度" value={notebook.discoveries.length} max={EXPERIMENTS.length} /></div>
      </header>

      <div className="playground-daily">
        <div><p className="playground-kicker">每日线索 · <time>{day}</time> · 上海时间</p><h3>{discoveries.has(goal.id) ? "这条线索，你已经解开了。" : goal.clue}</h3><p>线索每天换，配方一直在。没有连续签到，也没有错过惩罚。</p></div>
        <div className="playground-hints">
          {hints > 0 && <p>材料之一：{MATERIALS[goal.a].label}{hints > 1 ? `；另一份：${MATERIALS[goal.b].label}` : ""}{hints > 2 ? `；方法：${METHODS.find((item) => item.id === goal.method)!.label}` : ""}</p>}
          <button type="button" disabled={hints === 3} onClick={() => setHintState({ day, count: hints + 1 })}>{hints === 3 ? "线索已经齐了" : `再给一点提示 ${hints}/3`}</button>
          {missing.length > 0 && <p>这条线索还缺：{missing.map((kind) => MATERIALS[kind].label).join("、")}。<a href="#archive">去账本找找</a>，也可以先玩其他组合。</p>}
        </div>
      </div>

      <div className="playground-workbench">
      {!materials.length ? <div className="playground-empty"><h3>实验室有了，还差第一份材料。</h3><p>先在页面上方安装一个通过验签的更新，或去账本挑一份。已有离线材料会自动回来。</p><a href="#archive">去找第一份更新 →</a></div> : (
          <div className="playground-controls">
            <div className="playground-inputs">
              {([first, second] as const).map((item, index) => <label key={index} htmlFor={`mix-material-${index}`}><span>材料 {index === 0 ? "A" : "B"}</span><select id={`mix-material-${index}`} value={item.kind} onChange={(event) => (index === 0 ? setA : setB)(event.target.value as UpdateKind)}>{MATERIAL_KINDS.map((kind) => <option key={kind} value={kind} disabled={!owned.has(kind)}>{MATERIALS[kind].glyph} {MATERIALS[kind].label}{owned.has(kind) ? "" : " · 还没安装"}</option>)}</select><small title={item.headline}>{item.headline}</small></label>)}
            </div>
            <fieldset className="playground-methods"><legend>怎么处理它们？</legend>{METHODS.map((item) => <label key={item.id}><input type="radio" name="mix-method" value={item.id} checked={method === item.id} onChange={() => setMethod(item.id)} /><span>{item.label}</span></label>)}</fieldset>
            <div className="playground-actions"><button type="button" className="playground-mix" onClick={perform}>混一下，看看 →</button><button type="button" disabled={!unexplored.length} onClick={() => unexplored[0] && prepare(unexplored[0])}>{unexplored.length ? "给我一个没试过的组合" : "现有材料都试过了"}</button></div>
            <p className="playground-small">已解锁 {materials.length}/7 类材料，可探索 {reachable.length} 种状态。新类型更新会打开新的组合。</p>
          </div>
          )}
          <div ref={stage} tabIndex={-1} aria-label="实验结果" className="playground-stage" data-method={result?.method ?? "rest"}>
            <div className="playground-specimen" key={result?.id ?? "empty"} aria-hidden="true"><i>{result?.glyph ?? "?"}</i><i>{result?.glyph ?? "·"}</i><i>{result?.glyph ?? "·"}</i></div>
            <p className="playground-kicker">{result ? `标本 ${String(result.family + 1).padStart(2, "0")} · ${METHODS.find((item) => item.id === result.method)!.label}` : "等待第一次反应"}</p>
            <h3>{result?.name ?? "今天会冒出什么？"}</h3><p>{result?.note ?? "没有失败配方，也不用买材料。好奇就够了。"}</p>
            {result && <button type="button" onClick={() => void copyResult()}>复制这张发现卡片</button>}
          </div>
        </div>
      <p className="playground-announcement" role="status" aria-live="polite">{announcement}</p>
      {(warning || cacheWarning) && <p className="playground-warning" role="alert">{warning || cacheWarning}</p>}
      {shareText && <label className="playground-copy">手动复制卡片<textarea readOnly value={shareText} onFocus={(event) => event.target.select()} /></label>}

      <details className="playground-notebook"><summary>翻开我的实验笔记 <span>{notebook.discoveries.length}/{EXPERIMENTS.length}</span></summary>
        <p>点亮的状态可以重看。回滚不会抹掉见过的发现，但重做实验仍需要对应材料。</p>
        <div className="playground-backup"><button type="button" onClick={exportFile}>导出实验笔记</button><button type="button" disabled={importing} onClick={() => fileInput.current?.click()}>{importing ? "正在读取笔记" : "导入并合并笔记"}</button><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void importFile(file); }} /><p>笔记只保存在本机；清理浏览器前记得导出。导入只合并发现，不安装更新、不解锁材料，也不会上传文件。</p></div>
        <div className="playground-catalog">{FAMILIES.map((family, index) => {
          const variants = EXPERIMENTS.filter((recipe) => recipe.family === index);
          const seen = variants.some((recipe) => discoveries.has(recipe.id));
          return <article key={`${family.a}+${family.b}`}><span aria-hidden="true">{seen ? family.glyph : "?"}</span><h3>{seen ? family.name : `未命名标本 ${String(index + 1).padStart(2, "0")}`}</h3><div>{variants.map((recipe) => <button type="button" key={recipe.id} disabled={!discoveries.has(recipe.id)} aria-label={`${seen ? family.name : "未知标本"} · ${METHODS.find((item) => item.id === recipe.method)!.label}${discoveries.has(recipe.id) ? "，查看" : "，未发现"}`} onClick={() => { setResult(EXPERIMENT_BY_ID.get(recipe.id)!); setShareText(""); setAnnouncement(`翻到：${recipe.name}。${recipe.note}`); stage.current?.focus({ preventScroll: true }); stage.current?.scrollIntoView?.({ block: "center" }); }}>{METHODS.find((item) => item.id === recipe.method)!.label}</button>)}</div></article>;
        })}</div>

      </details>
    </section>
  );
}
