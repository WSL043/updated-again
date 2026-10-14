import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CIRCUIT_SIZES, createCircuit, fullBoard, MAX_CIRCUIT_MOVES, neighbors, newSession, sessionBoard, solveCircuit, type CircuitSize } from "../core/circuit";
import { CHOICE_KEY, CIRCUIT_LAUNCH, choiceFromHash, defaultChoice, loadCircuitRecord, loadCircuitSession, puzzleLink, saveCircuitWin, selectedPuzzle, sessionKey, shiftCircuitDay, validDay, validateChoice, weeklyPuzzles, weekStart, type CircuitChoice, type CircuitPuzzle } from "../core/circuit-challenges";
import { CircuitScoreCard } from "./CircuitScoreCard";
import { projectDay } from "../core/patch-playground";
import "./circuit-room.css";

export function CircuitRoom() {
  const [initialChoice] = useState(() => {
    const today = projectDay();
    const shared = choiceFromHash(window.location.hash, today);
    if (shared) return { choice: shared, warning: "" };
    try {
      const text = localStorage.getItem(CHOICE_KEY);
      if (text) return { choice: validateChoice(JSON.parse(text), today), warning: "" };
      const value = JSON.parse(localStorage.getItem("updated-again:circuit-choice:v1") ?? "null");
      if (value && CIRCUIT_SIZES.includes(value.size) && (value.practice === null ||
        (typeof value.practice === "string" && /^practice-[a-f0-9-]{36}$/.test(value.practice)))) {
        return { choice: { ...defaultChoice(today), size: value.size as CircuitSize, practice: value.practice as string | null, mode: value.practice ? "practice" as const : "today" as const }, warning: "" };
      }
    } catch { return { choice: defaultChoice(today), warning: "关卡选择未能读取；旧数据会保留，本页仍可玩。" }; }
    return { choice: defaultChoice(today), warning: window.location.hash.startsWith("#play?") ? "分享链接无法读取，已打开今日题。" : "" };
  });
  const [day, setDay] = useState(projectDay);
  const [choice, setChoice] = useState<CircuitChoice>(initialChoice.choice);
  const [selectionWarning, setSelectionWarning] = useState(initialChoice.warning);
  const [revision, setRevision] = useState(0);
  const refreshRecords = useCallback(() => setRevision((value) => value + 1), []);
  const choose = (patch: Partial<CircuitChoice>) => {
    if (window.location.hash.startsWith("#play?")) window.history.replaceState(null, "", "#play");
    setChoice((value) => ({ ...value, ...patch }));
  };
  const selectHistoryDay = (value: string) => { if (validDay(value) && value >= CIRCUIT_LAUNCH && value <= day && value !== choice.day) choose({ day: value }); };
  const puzzle = useMemo(() => selectedPuzzle(choice, day), [choice, day]);
  const week = useMemo(() => weeklyPuzzles(choice.week), [choice.week]);
  const weekly = useMemo(() => {
    let warning = "";
    const records = week.map((item) => { try { return loadCircuitRecord(localStorage, item); } catch { warning = "部分周赛成绩无法读取；旧记录会保留。"; return null; } });
    return { records, warning };
  }, [week, revision]);
  const completed = weekly.records.filter(Boolean).length;
  const solo = weekly.records.filter((record) => record?.solo).length;
  const totalSteps = weekly.records.reduce((sum, record) => sum + (record?.best.presses.length ?? 0), 0);
  useEffect(() => {
    if (initialChoice.warning) return;
    try { localStorage.setItem(CHOICE_KEY, JSON.stringify(choice)); setSelectionWarning(""); }
    catch { setSelectionWarning("未能记住关卡选择，刷新后可能回到默认每日题。"); }
  }, [choice, initialChoice.warning]);
  useEffect(() => {
    if (window.location.hash.startsWith("#play")) document.getElementById("play")?.scrollIntoView?.({ block: "start" });
    const tick = () => setDay(projectDay());
    const shared = () => { const next = choiceFromHash(window.location.hash, projectDay()); if (next) setChoice(next); };
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("hashchange", shared);
    window.addEventListener("storage", refreshRecords);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); window.removeEventListener("hashchange", shared); window.removeEventListener("storage", refreshRecords); };
  }, [refreshRecords]);
  return <section className="circuit-room" id="play" aria-labelledby="circuit-heading">
    <header className="circuit-heading"><div><p className="circuit-kicker">CIRCUIT CLUB / 每天亮一点</p><h2 id="circuit-heading">补丁接线室<span>接通今天，也接着玩。</span></h2></div><p>一次按下，自己和上下左右一起翻转。<br />让所有接点亮起来，就算修好了这个小世界。</p><span className="circuit-heading-mark" aria-hidden="true">↗</span></header>
    <div className="circuit-mode-nav" aria-label="玩法选择">{([
      ["today", "每日同题", "一日一题"], ["history", "历史每日题", "把错过的补回来"], ["weekly", "每周挑战", "七关，一张成绩单"], ["practice", "自由练习", "随时再来一局"],
    ] as const).map(([mode, label, note]) => <button key={mode} aria-pressed={choice.mode === mode} onClick={() => choose({ mode, ...(mode === "practice" && !choice.practice ? { practice: `practice-${crypto.randomUUID()}` } : {}) })}><span>{label}</span><small>{note}</small></button>)}</div>
    {choice.mode === "history" && <div className="circuit-datebar"><div><strong>翻到那一天。</strong><p>同一天、同尺寸，还是原来的接线图。</p></div><div className="circuit-date-controls"><button aria-label="上一天" disabled={choice.day <= CIRCUIT_LAUNCH} onClick={() => choose({ day: shiftCircuitDay(choice.day, -1) })}>←</button><label>题目日期<input type="date" min={CIRCUIT_LAUNCH} max={day} value={choice.day} onInput={(event) => selectHistoryDay(event.currentTarget.value)} onChange={(event) => selectHistoryDay(event.currentTarget.value)} /></label><button aria-label="下一天" disabled={choice.day >= day} onClick={() => choose({ day: shiftCircuitDay(choice.day, 1) })}>→</button></div></div>}
    {choice.mode === "weekly" && <div className="circuit-weekly"><div className="circuit-weekly-heading"><div><p className="circuit-kicker">THE WEEKLY SEVEN</p><h3>七次接通，攒一周的光。</h3><p>从热身到挑战。七关随时可选，重玩会保留最佳成绩。</p></div><div className="circuit-week-total"><strong>{completed}<small> / 7</small></strong><span>已通关 · {solo} 关独立完成</span></div></div><div className="circuit-week-picker"><button aria-label="上一周" disabled={choice.week <= weekStart(CIRCUIT_LAUNCH)} onClick={() => choose({ week: shiftCircuitDay(choice.week, -7), round: 0 })}>← 上一周</button><span>{choice.week} — {shiftCircuitDay(choice.week, 6)}</span><button aria-label="下一周" disabled={choice.week >= weekStart(day)} onClick={() => choose({ week: shiftCircuitDay(choice.week, 7), round: 0 })}>下一周 →</button>{choice.week !== weekStart(day) && <button onClick={() => choose({ week: weekStart(day), round: 0 })}>回到本周</button>}</div><div className="circuit-week-rounds" aria-label="每周挑战关卡">{week.map((item, index) => <button key={item.seed} aria-pressed={choice.round === index} onClick={() => choose({ round: index })}><small>ROUND {String(index + 1).padStart(2, "0")}</small><strong>{item.size} × {item.size}</strong><span>{weekly.records[index] ? `${weekly.records[index]!.best.presses.length} 步 · ${!weekly.records[index]!.best.assisted ? "独立完成" : "借助提示"}` : "尚未通关"}</span></button>)}</div>{weekly.warning && <p role="alert">{weekly.warning}</p>}</div>}
    <div className="circuit-toolbar">{choice.mode !== "weekly" ? <div className="circuit-tabs" aria-label="关卡大小">{CIRCUIT_SIZES.map((value) => <button key={value} aria-pressed={choice.size === value} onClick={() => choose({ size: value })}>{value} × {value}<small>{value === 3 ? "热身" : value === 4 ? "动脑" : "挑战"}</small></button>)}</div> : <strong>{puzzle.title} · {puzzle.size} × {puzzle.size}</strong>}<span className="circuit-toolbar-note">{choice.mode === "today" ? `${day} · 上海日期` : choice.mode === "weekly" ? "固定题目 · 本机成绩" : choice.mode === "history" ? "历史与今日同题共享该日进度" : "随机题目 · 自动续玩"}</span>{choice.mode === "practice" && <button onClick={() => choose({ practice: `practice-${crypto.randomUUID()}` })}>再来一局 ↗</button>}</div>
    <CircuitGame key={`${puzzle.seed}:${puzzle.size}`} puzzle={puzzle} onRecord={refreshRecords} onNext={choice.mode === "weekly" && choice.round < 6 ? () => choose({ round: choice.round + 1 }) : undefined} />
    {choice.mode === "weekly" && completed > 0 && <details className="circuit-week-card"><summary>查看周赛成绩单 · {completed} / 7 关</summary><CircuitScoreCard key={`${choice.week}:${revision}`} filename={`updated-again-week-${choice.week}`} card={{ title: completed === 7 ? "一周的光，接通了。" : "每周挑战 · 进行中", subtitle: `${choice.week} — ${shiftCircuitDay(choice.week, 6)}`, score: `${completed} / 7 关`, detail: `已完成关卡最佳共 ${totalSteps} 步 · ${solo} 关独立完成`, notes: week.map((item, index) => `第 ${index + 1} 关 / ${item.size}×${item.size}：${weekly.records[index] ? `${weekly.records[index]!.best.presses.length} 步${weekly.records[index]!.best.assisted ? "（提示）" : "（独立）"}` : "待接通"}`), url: puzzleLink(week[0]) }} /></details>}
    {selectionWarning && <p className="circuit-selection-warning" role="alert">{selectionWarning}</p>}
  </section>;
}

function CircuitGame({ puzzle, onRecord, onNext }: { puzzle: CircuitPuzzle; onRecord: () => void; onNext?: () => void }) {
  const { seed, size } = puzzle;
  const key = sessionKey(puzzle);
  const [initial] = useState(() => {
    try { return { session: loadCircuitSession(localStorage, puzzle), warning: "" }; }
    catch { return { session: newSession(seed, size), warning: "旧接线存档无法读取。这局仍能玩，原存档会保留。" }; }
  });
  const [session, setSession] = useState(initial.session);
  const [warning, setWarning] = useState(initial.warning);
  const [hint, setHint] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [recordState, setRecordState] = useState(() => { try { return { record: loadCircuitRecord(localStorage, puzzle), warning: "" }; } catch { return { record: null, warning: "旧成绩无法读取，会保留原数据。" }; } });
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const start = useMemo(() => createCircuit(seed, size), [seed, size]);
  const board = useMemo(() => sessionBoard(session), [session]);
  const target = fullBoard(size);
  const won = board === target;
  useEffect(() => {
    if (!won || recordState.warning) return;
    try { const record = saveCircuitWin(localStorage, puzzle, session); setRecordState({ record, warning: "" }); onRecord(); }
    catch { setRecordState((value) => ({ ...value, warning: "成绩未能保存；请先下载成绩卡，旧记录没有被覆盖。" })); }
  }, [won, puzzle, session, onRecord, recordState.warning]);
  const optimum = useMemo(() => solveCircuit(start, size)!.length, [start, size]);
  const lit = Array.from({ length: size * size }, (_, cell) => !!(board & (1 << cell))).filter(Boolean).length;
  const affected = hover === null ? [] : neighbors(size, hover);
  const save = (next: typeof session) => {
    setSession(next);
    if (initial.warning) return;
    try { localStorage.setItem(key, JSON.stringify(next)); setWarning(""); }
    catch { setWarning("本机没有保存成功，刷新会丢失这局；仍然可以继续玩。"); }
  };
  const tap = (cell: number) => {
    if (won || session.presses.length >= MAX_CIRCUIT_MOVES) return;
    save({ ...session, presses: [...session.presses, cell] });
    setHint(null); setMessage("");
  };
  const showHint = () => {
    const path = solveCircuit(board, size);
    if (!path?.length) return;
    setHint(path[0]); save({ ...session, assisted: true });
    setMessage(`试试第 ${Math.floor(path[0] / size) + 1} 行、第 ${path[0] % size + 1} 列。当前局面最少还需 ${path.length} 步。`);
  };
  return <div className="circuit-layout">
    <div className="circuit-machine" data-won={won}>
      <div className="circuit-machine-top"><span><i />{won ? "全部接通" : "等待接通"}</span><span>{puzzle.mode === "weekly" ? `${puzzle.week} / ROUND ${puzzle.round! + 1}` : puzzle.mode === "practice" ? "自由练习" : puzzle.day} / {size * size} NODES</span></div>
      <div className="circuit-board" style={{ "--circuit-size": size } as CSSProperties} role="group" aria-label={`${size} 乘 ${size} 接线盘`} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: size * size }, (_, cell) => <button key={cell} ref={(element) => { cells.current[cell] = element; }} type="button" className="circuit-cell" data-on={!!(board & (1 << cell))} data-affected={affected.includes(cell)} data-hint={hint === cell} aria-label={`第 ${Math.floor(cell / size) + 1} 行第 ${cell % size + 1} 列，${board & (1 << cell) ? "亮" : "暗"}${hint === cell ? "，建议按这里" : ""}`} aria-pressed={!!(board & (1 << cell))} aria-disabled={won} onClick={() => tap(cell)} onMouseEnter={() => setHover(cell)} onFocus={() => setHover(cell)} onBlur={() => setHover(null)} onKeyDown={(event) => {
          const row = Math.floor(cell / size), col = cell % size;
          const next = event.key === "ArrowRight" ? row * size + (col + 1) % size : event.key === "ArrowLeft" ? row * size + (col + size - 1) % size : event.key === "ArrowDown" ? ((row + 1) % size) * size + col : event.key === "ArrowUp" ? ((row + size - 1) % size) * size + col : null;
          if (next !== null) { event.preventDefault(); cells.current[next]?.focus(); }
        }}><span className="circuit-node" aria-hidden="true">{board & (1 << cell) ? "✦" : "·"}</span><small aria-hidden="true">{String(cell + 1).padStart(2, "0")}</small></button>)}
      </div>
      <div className="circuit-machine-bottom"><span>{String(lit).padStart(2, "0")} / {size * size} 已点亮</span><span>{won ? "已完成 ↗" : `${session.presses.length} 步 · 最少 ${optimum} 步`}</span></div>
    </div>
    <aside className="circuit-console">
      <div className="circuit-score"><p>这局走了</p><strong>{String(session.presses.length).padStart(2, "0")}<small>步</small></strong><span>这道题最少 {optimum} 步 · {session.assisted ? "使用过提示" : "还没借提示"}</span></div>
      <div className="circuit-personal-best"><span>本机最佳<strong>{recordState.record ? `${recordState.record.best.presses.length} 步${recordState.record.best.assisted ? " · 提示" : " · 独立"}` : "等你接通"}</strong></span><span>独立最佳<strong>{recordState.record?.solo ? `${recordState.record.solo.presses.length} 步` : "还未完成"}</strong></span></div>
      <div className="circuit-feedback" role="status" aria-live="polite">{won ? <><h3>{session.presses.length === optimum ? "刚刚好，一步没多。" : "接通了！今天亮了一点。"}</h3><p>{session.assisted ? "借来的灵感也算灵感。下一局再试试独立完成。" : "这一局，靠你自己接通了。"}</p></> : <><h3>{message ? "一点接线灵感" : "有时候，要先关掉一盏灯。"}</h3><p>{message || "亮灯也可以按。浅色边框会提前告诉你，这一按会影响哪些接点。"}</p></>}</div>
      <div className="circuit-actions">{!won ? <button className="circuit-primary" onClick={showHint}>给我一步提示 ↗</button> : onNext ? <button className="circuit-primary" onClick={onNext}>接着挑战下一关 →</button> : null}<button disabled={!session.presses.length} onClick={() => { save({ ...session, presses: session.presses.slice(0, -1) }); setHint(null); setMessage("退回一步，换个方向想。"); }}>撤销上一步</button><button disabled={!session.presses.length && !session.assisted} onClick={() => { save(newSession(seed, size)); setHint(null); setMessage("同一张接线图，再来一次。"); }}>重开这道题</button></div>
      {won && <CircuitScoreCard filename={`updated-again-${seed.replaceAll(":", "-")}-${size}`} card={{ title: puzzle.mode === "weekly" ? `每周挑战 · ${puzzle.title}接通` : "补丁接线室 · 通关", subtitle: puzzle.subtitle, score: `${session.presses.length} 步全部点亮`, detail: `${session.assisted ? "借了一点提示" : "独立完成"} · 理论最少 ${optimum} 步`, notes: [session.presses.length === optimum ? "刚刚好，一步没多。" : `比最短解多 ${session.presses.length - optimum} 步，下次再试试。`], url: puzzleLink(puzzle) }} />}
      {won && message && <p role="status">{message}</p>}
      {session.presses.length >= MAX_CIRCUIT_MOVES && <p role="status">这局的笔记写满了。可以撤销或重开。</p>}
      {warning && <p role="alert">{warning}</p>}
      {recordState.warning && <p role="alert">{recordState.warning}</p>}
      <p className="circuit-footnote">进度与最佳成绩留在这台设备；每日与历史按日期保存，周赛七关分别保存。没有倒计时，也没有失败惩罚。键盘方向键选格，空格或回车操作。</p>
      <details className="circuit-explainer"><summary>提示真的会解题吗？</summary><p>会。程序枚举第一行的按法，再逐行消去暗灯；最多检查 32 种候选，选出步数最少的解。每道题从全亮状态反向打乱，所以一定能解开。</p><a href="https://github.com/WSL043/updated-again/blob/main/src/core/circuit.ts" target="_blank" rel="noreferrer">看看解题算法 ↗</a></details>
    </aside>
  </div>;
}
