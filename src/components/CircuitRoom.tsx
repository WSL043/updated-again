import { t, useLanguage } from "../i18n";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CIRCUIT_SIZES, createCircuit, fullBoard, MAX_CIRCUIT_MOVES, neighbors, newSession, sessionBoard, solveCircuit, type CircuitSize } from "../core/circuit";
import { CHOICE_KEY, CIRCUIT_LAUNCH, choiceFromHash, defaultChoice, loadCircuitRecord, loadCircuitSession, puzzleLink, saveCircuitWin, selectedPuzzle, sessionKey, shiftCircuitDay, validDay, validateChoice, weeklyPuzzles, weekStart, type CircuitChoice, type CircuitPuzzle } from "../core/circuit-challenges";
import { CircuitScoreCard } from "./CircuitScoreCard";
import { projectDay } from "../core/patch-playground";
import "./circuit-room.css";
export function CircuitRoom() {
    useLanguage();
    const [initialChoice] = useState(() => {
        const today = projectDay();
        const shared = choiceFromHash(window.location.hash, today);
        if (shared)
            return { choice: shared, warning: "" };
        try {
            const text = localStorage.getItem(CHOICE_KEY);
            if (text)
                return { choice: validateChoice(JSON.parse(text), today), warning: "" };
            const value = JSON.parse(localStorage.getItem("updated-again:circuit-choice:v1") ?? "null");
            if (value && CIRCUIT_SIZES.includes(value.size) && (value.practice === null ||
                (typeof value.practice === "string" && /^practice-[a-f0-9-]{36}$/.test(value.practice)))) {
                return { choice: { ...defaultChoice(today), size: value.size as CircuitSize, practice: value.practice as string | null, mode: value.practice ? "practice" as const : "today" as const }, warning: "" };
            }
        }
        catch {
            return { choice: defaultChoice(today), warning: t("关卡选择未能读取；旧数据会保留，本页仍可玩。") };
        }
        return { choice: defaultChoice(today), warning: window.location.hash.startsWith("#play?") ? t("分享链接无法读取，已打开今日题。") : "" };
    });
    const [day, setDay] = useState(projectDay);
    const [choice, setChoice] = useState<CircuitChoice>(initialChoice.choice);
    const [selectionWarning, setSelectionWarning] = useState(initialChoice.warning);
    const [revision, setRevision] = useState(0);
    const refreshRecords = useCallback(() => setRevision((value) => value + 1), []);
    const choose = (patch: Partial<CircuitChoice>) => {
        if (window.location.hash.startsWith("#play?"))
            window.history.replaceState(null, "", "#play");
        setChoice((value) => ({ ...value, ...patch }));
    };
    const selectHistoryDay = (value: string) => { if (validDay(value) && value >= CIRCUIT_LAUNCH && value <= day && value !== choice.day)
        choose({ day: value }); };
    const puzzle = useMemo(() => selectedPuzzle(choice, day), [choice, day]);
    const week = useMemo(() => weeklyPuzzles(choice.week), [choice.week]);
    const weekly = useMemo(() => {
        let warning = "";
        const records = week.map((item) => { try {
            return loadCircuitRecord(localStorage, item);
        }
        catch {
            warning = t("部分周赛成绩无法读取；旧记录会保留。");
            return null;
        } });
        return { records, warning };
    }, [week, revision]);
    const completed = weekly.records.filter(Boolean).length;
    const solo = weekly.records.filter((record) => record?.solo).length;
    const totalSteps = weekly.records.reduce((sum, record) => sum + (record?.best.presses.length ?? 0), 0);
    useEffect(() => {
        if (initialChoice.warning)
            return;
        try {
            localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
            setSelectionWarning("");
        }
        catch {
            setSelectionWarning(t("未能记住关卡选择，刷新后可能回到默认每日题。"));
        }
    }, [choice, initialChoice.warning]);
    useEffect(() => {
        const tick = () => setDay(projectDay());
        const shared = () => { const next = choiceFromHash(window.location.hash, projectDay()); if (next)
            setChoice(next); };
        const timer = window.setInterval(tick, 60000);
        window.addEventListener("focus", tick);
        document.addEventListener("visibilitychange", tick);
        window.addEventListener("hashchange", shared);
        window.addEventListener("storage", refreshRecords);
        return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); window.removeEventListener("hashchange", shared); window.removeEventListener("storage", refreshRecords); };
    }, [refreshRecords]);
    return <section className="circuit-room" id="circuit-room" aria-labelledby="circuit-heading">
    <header className="circuit-heading"><div><p className="circuit-kicker">{t("CIRCUIT CLUB / 每天亮一点")}</p><h2 id="circuit-heading">{t("补丁接线室")}<span>{t("接通今天，也接着玩。")}</span></h2></div><p>{t("一次按下，自己和上下左右一起翻转。")}<br />{" "}{t("让所有接点亮起来，就算修好了这个小世界。")}</p><span className="circuit-heading-mark" aria-hidden="true">↗</span></header>
    <div className="circuit-mode-nav" aria-label={t("玩法选择")}>{([
            ["today", t("每日同题"), t("一日一题")], ["history", t("历史每日题"), t("把错过的补回来")], ["weekly", t("每周挑战"), t("七关，一张成绩单")], ["practice", t("自由练习"), t("随时再来一局")],
        ] as const).map(([mode, label, note]) => <button key={mode} aria-pressed={choice.mode === mode} onClick={() => choose({ mode, ...(mode === "practice" && !choice.practice ? { practice: `practice-${crypto.randomUUID()}` } : {}) })}><span>{label}</span><small>{note}</small></button>)}</div>
    {choice.mode === "history" && <div className="circuit-datebar"><div><strong>{t("翻到那一天。")}</strong><p>{t("同一天、同尺寸，还是原来的接线图。")}</p></div><div className="circuit-date-controls"><button aria-label={t("上一天")} disabled={choice.day <= CIRCUIT_LAUNCH} onClick={() => choose({ day: shiftCircuitDay(choice.day, -1) })}>←</button><label>{t("题目日期")}<input type="date" min={CIRCUIT_LAUNCH} max={day} value={choice.day} onInput={(event) => selectHistoryDay(event.currentTarget.value)} onChange={(event) => selectHistoryDay(event.currentTarget.value)}/></label><button aria-label={t("下一天")} disabled={choice.day >= day} onClick={() => choose({ day: shiftCircuitDay(choice.day, 1) })}>→</button></div></div>}
    {choice.mode === "weekly" && <div className="circuit-weekly"><div className="circuit-weekly-heading"><div><p className="circuit-kicker">THE WEEKLY SEVEN</p><h3>{t("七次接通，攒一周的光。")}</h3><p>{t("从热身到挑战。七关随时可选，重玩会保留最佳成绩。")}</p></div><div className="circuit-week-total"><strong>{completed}<small> / 7</small></strong><span>{t("已通关 · {0} 关独立完成", [solo])}</span></div></div><div className="circuit-week-picker"><button aria-label={t("上一周")} disabled={choice.week <= weekStart(CIRCUIT_LAUNCH)} onClick={() => choose({ week: shiftCircuitDay(choice.week, -7), round: 0 })}>{t("← 上一周")}</button><span>{choice.week} — {shiftCircuitDay(choice.week, 6)}</span><button aria-label={t("下一周")} disabled={choice.week >= weekStart(day)} onClick={() => choose({ week: shiftCircuitDay(choice.week, 7), round: 0 })}>{t("下一周 →")}</button>{choice.week !== weekStart(day) && <button onClick={() => choose({ week: weekStart(day), round: 0 })}>{t("回到本周")}</button>}</div><div className="circuit-week-rounds" aria-label={t("每周挑战关卡")}>{week.map((item, index) => <button key={item.seed} aria-pressed={choice.round === index} onClick={() => choose({ round: index })}><small>ROUND {String(index + 1).padStart(2, "0")}</small><strong>{item.size} × {item.size}</strong><span>{weekly.records[index] ? t("{0} 步 · {1}", [weekly.records[index]!.best.presses.length, !weekly.records[index]!.best.assisted ? t("独立完成") : t("借助提示")]) : t("尚未通关")}</span></button>)}</div>{weekly.warning && <p role="alert">{weekly.warning}</p>}</div>}
    <div className="circuit-toolbar">{choice.mode !== "weekly" ? <div className="circuit-tabs" aria-label={t("关卡大小")}>{CIRCUIT_SIZES.map((value) => <button key={value} aria-pressed={choice.size === value} onClick={() => choose({ size: value })}>{value} × {value}<small>{value === 3 ? t("热身") : value === 4 ? t("动脑") : t("挑战")}</small></button>)}</div> : <strong>{t(puzzle.title)} · {puzzle.size} × {puzzle.size}</strong>}<span className="circuit-toolbar-note">{choice.mode === "today" ? t("{0} · 本地日期", [day]) : choice.mode === "weekly" ? t("固定题目 · 本机成绩") : choice.mode === "history" ? t("历史与今日同题共享该日进度") : t("随机题目 · 自动续玩")}</span>{choice.mode === "practice" && <button onClick={() => choose({ practice: `practice-${crypto.randomUUID()}` })}>{t("再来一局 ↗")}</button>}</div>
    <CircuitGame key={`${puzzle.seed}:${puzzle.size}`} puzzle={puzzle} onRecord={refreshRecords} onNext={choice.mode === "weekly" && choice.round < 6 ? () => choose({ round: choice.round + 1 }) : undefined}/>
    {choice.mode === "weekly" && completed > 0 && <details className="circuit-week-card"><summary>{t("查看周赛成绩单 ·")}{completed}{t("/ 7 关")}</summary><CircuitScoreCard key={`${choice.week}:${revision}`} filename={`updated-again-week-${choice.week}`} card={{ title: completed === 7 ? t("一周的光，接通了。") : t("每周挑战 · 进行中"), subtitle: `${choice.week} — ${shiftCircuitDay(choice.week, 6)}`, score: t("{0} / 7 关", [completed]), detail: t("已完成关卡最佳共 {0} 步 · {1} 关独立完成", [totalSteps, solo]), notes: week.map((item, index) => t("第 {0} 关 / {1}×{2}：{3}", [index + 1, item.size, item.size, weekly.records[index] ? t("{0} 步{1}", [weekly.records[index]!.best.presses.length, weekly.records[index]!.best.assisted ? t("（提示）") : t("（独立）")]) : t("待接通")])), url: puzzleLink(week[0]) }}/></details>}
    {selectionWarning && <p className="circuit-selection-warning" role="alert">{t(selectionWarning)}</p>}
  </section>;
}
function CircuitGame({ puzzle, onRecord, onNext }: {
    puzzle: CircuitPuzzle;
    onRecord: () => void;
    onNext?: () => void;
}) {
    useLanguage();
    const { seed, size } = puzzle;
    const key = sessionKey(puzzle);
    const [initial] = useState(() => {
        try {
            return { session: loadCircuitSession(localStorage, puzzle), warning: "" };
        }
        catch {
            return { session: newSession(seed, size), warning: t("旧接线存档无法读取。这局仍能玩，原存档会保留。") };
        }
    });
    const [session, setSession] = useState(initial.session);
    const [warning, setWarning] = useState(initial.warning);
    const [hint, setHint] = useState<number | null>(null);
    const [hover, setHover] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [recordState, setRecordState] = useState(() => { try {
        return { record: loadCircuitRecord(localStorage, puzzle), warning: "" };
    }
    catch {
        return { record: null, warning: t("旧成绩无法读取，会保留原数据。") };
    } });
    const cells = useRef<(HTMLButtonElement | null)[]>([]);
    const start = useMemo(() => createCircuit(seed, size), [seed, size]);
    const board = useMemo(() => sessionBoard(session), [session]);
    const target = fullBoard(size);
    const won = board === target;
    useEffect(() => {
        if (!won || recordState.warning)
            return;
        try {
            const record = saveCircuitWin(localStorage, puzzle, session);
            setRecordState({ record, warning: "" });
            onRecord();
        }
        catch {
            setRecordState((value) => ({ ...value, warning: t("成绩未能保存；请先下载成绩卡，旧记录没有被覆盖。") }));
        }
    }, [won, puzzle, session, onRecord, recordState.warning]);
    const optimum = useMemo(() => solveCircuit(start, size)!.length, [start, size]);
    const lit = Array.from({ length: size * size }, (_, cell) => !!(board & (1 << cell))).filter(Boolean).length;
    const affected = hover === null ? [] : neighbors(size, hover);
    const save = (next: typeof session) => {
        setSession(next);
        if (initial.warning)
            return;
        try {
            localStorage.setItem(key, JSON.stringify(next));
            setWarning("");
        }
        catch {
            setWarning(t("本机没有保存成功，刷新会丢失这局；仍然可以继续玩。"));
        }
    };
    const tap = (cell: number) => {
        if (won || session.presses.length >= MAX_CIRCUIT_MOVES)
            return;
        save({ ...session, presses: [...session.presses, cell] });
        setHint(null);
        setMessage("");
    };
    const showHint = () => {
        const path = solveCircuit(board, size);
        if (!path?.length)
            return;
        setHint(path[0]);
        save({ ...session, assisted: true });
        setMessage(t("试试第 {0} 行、第 {1} 列。当前局面最少还需 {2} 步。", [Math.floor(path[0] / size) + 1, path[0] % size + 1, path.length]));
    };
    return <div className="circuit-layout">
    <div className="circuit-machine" data-won={won}>
      <div className="circuit-machine-top"><span><i />{won ? t("全部接通") : t("等待接通")}</span><span>{puzzle.mode === "weekly" ? `${puzzle.week} / ROUND ${puzzle.round! + 1}` : puzzle.mode === "practice" ? t("自由练习") : puzzle.day} / {size * size} NODES</span></div>
      <div className="circuit-board" style={{ "--circuit-size": size } as CSSProperties} role="group" aria-label={t("{0} 乘 {1} 接线盘", [size, size])} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: size * size }, (_, cell) => <button key={cell} ref={(element) => { cells.current[cell] = element; }} type="button" className="circuit-cell" data-on={!!(board & (1 << cell))} data-affected={affected.includes(cell)} data-hint={hint === cell} aria-label={t("第 {0} 行第 {1} 列，{2}{3}", [Math.floor(cell / size) + 1, cell % size + 1, board & (1 << cell) ? t("亮") : t("暗"), hint === cell ? t("，建议按这里") : ""])} aria-pressed={!!(board & (1 << cell))} aria-disabled={won} onClick={() => tap(cell)} onMouseEnter={() => setHover(cell)} onFocus={() => setHover(cell)} onBlur={() => setHover(null)} onKeyDown={(event) => {
                const row = Math.floor(cell / size), col = cell % size;
                const next = event.key === "ArrowRight" ? row * size + (col + 1) % size : event.key === "ArrowLeft" ? row * size + (col + size - 1) % size : event.key === "ArrowDown" ? ((row + 1) % size) * size + col : event.key === "ArrowUp" ? ((row + size - 1) % size) * size + col : null;
                if (next !== null) {
                    event.preventDefault();
                    cells.current[next]?.focus();
                }
            }}><span className="circuit-node" aria-hidden="true">{board & (1 << cell) ? "✦" : "·"}</span><small aria-hidden="true">{String(cell + 1).padStart(2, "0")}</small></button>)}
      </div>
      <div className="circuit-machine-bottom"><span>{String(lit).padStart(2, "0")} / {size * size}{t("已点亮")}</span><span>{won ? t("已完成 ↗") : t("{0} 步 · 最少 {1} 步", [session.presses.length, optimum])}</span></div>
    </div>
    <aside className="circuit-console">
      <div className="circuit-score"><p>{t("这局走了")}</p><strong>{String(session.presses.length).padStart(2, "0")}<small>{t("步")}</small></strong><span>{t("这道题最少")}{optimum}{t("步 ·")}{session.assisted ? t("使用过提示") : t("还没借提示")}</span></div>
      <div className="circuit-personal-best"><span>{t("本机最佳")}<strong>{recordState.record ? t("{0} 步{1}", [recordState.record.best.presses.length, recordState.record.best.assisted ? t(" · 提示") : t(" · 独立")]) : t("等你接通")}</strong></span><span>{t("独立最佳")}<strong>{recordState.record?.solo ? t("{0} 步", [recordState.record.solo.presses.length]) : t("还未完成")}</strong></span></div>
      <div className="circuit-feedback" role="status" aria-live="polite">{won ? <><h3>{session.presses.length === optimum ? t("刚刚好，一步没多。") : t("接通了！今天亮了一点。")}</h3><p>{session.assisted ? t("借来的灵感也算灵感。下一局再试试独立完成。") : t("这一局，靠你自己接通了。")}</p></> : <><h3>{message ? t("一点接线灵感") : t("有时候，要先关掉一盏灯。")}</h3><p>{message || t("亮灯也可以按。浅色边框会提前告诉你，这一按会影响哪些接点。")}</p></>}</div>
      <div className="circuit-actions">{!won ? <button className="circuit-primary" onClick={showHint}>{t("给我一步提示 ↗")}</button> : onNext ? <button className="circuit-primary" onClick={onNext}>{t("接着挑战下一关 →")}</button> : null}<button disabled={!session.presses.length} onClick={() => { save({ ...session, presses: session.presses.slice(0, -1) }); setHint(null); setMessage(t("退回一步，换个方向想。")); }}>{t("撤销上一步")}</button><button disabled={!session.presses.length && !session.assisted} onClick={() => { save(newSession(seed, size)); setHint(null); setMessage(t("同一张接线图，再来一次。")); }}>{t("重开这道题")}</button></div>
      {won && <CircuitScoreCard filename={`updated-again-${seed.replaceAll(":", "-")}-${size}`} card={{ title: puzzle.mode === "weekly" ? t("每周挑战 · {0}接通", [t(puzzle.title)]) : t("补丁接线室 · 通关"), subtitle: t(puzzle.subtitle), score: t("{0} 步全部点亮", [session.presses.length]), detail: t("{0} · 理论最少 {1} 步", [session.assisted ? t("借了一点提示") : t("独立完成"), optimum]), notes: [session.presses.length === optimum ? t("刚刚好，一步没多。") : t("比最短解多 {0} 步，下次再试试。", [session.presses.length - optimum])], url: puzzleLink(puzzle) }}/>}
      {won && message && <p role="status">{t(message)}</p>}
      {session.presses.length >= MAX_CIRCUIT_MOVES && <p role="status">{t("这局的笔记写满了。可以撤销或重开。")}</p>}
      {warning && <p role="alert">{t(warning)}</p>}
      {recordState.warning && <p role="alert">{recordState.warning}</p>}
      <p className="circuit-footnote">{t("进度与最佳成绩留在这台设备；每日与历史按日期保存，周赛七关分别保存。没有倒计时，也没有失败惩罚。键盘方向键选格，空格或回车操作。")}</p>
      <details className="circuit-explainer"><summary>{t("提示真的会解题吗？")}</summary><p>{t("会。程序枚举第一行的按法，再逐行消去暗灯；最多检查 32 种候选，选出步数最少的解。每道题从全亮状态反向打乱，所以一定能解开。")}</p><a href="https://github.com/WSL043/updated-again/blob/main/src/core/circuit.ts" target="_blank" rel="noreferrer">{t("看看解题算法 ↗")}</a></details>
    </aside>
  </div>;
}
