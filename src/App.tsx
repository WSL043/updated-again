import { useCallback, useEffect, useMemo, useState } from "react";
import { CAPABILITY_LIST, rollbackLatest } from "./capabilities";
import { Companion } from "./components/Companion";
import { StreakCalendar } from "./components/StreakCalendar";
import { UpdateCard } from "./components/UpdateCard";
import { VersionGhost } from "./components/VersionGhost";
import { checkForCoreUpdate, enableNotifications, isDesktopApp, listenForTrayCheckUpdate, notifyUpdate } from "./core/native";
import { loadArchive, saveArchive } from "./core/storage";
import type { FeedIndex, LocalArchive, UpdateCapsule } from "./core/types";
import { fetchCapsule, fetchCoreVersion, fetchFeed, findPendingCapsules, installVerifiedCapsule } from "./core/update-client";

type Status = "idle" | "checking" | "installing" | "error";
type Tab = "today" | "museum" | "lab";

function dateLabel(value?: string): string {
  if (!value) return "等待下一次开机";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function App() {
  const [archive, setArchive] = useState<LocalArchive>(() => loadArchive());
  const [feed, setFeed] = useState<FeedIndex | null>(null);
  const [capsules, setCapsules] = useState<Map<string, UpdateCapsule>>(new Map());
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState("压印机正在读取公共账本……");
  const [tab, setTab] = useState<Tab>("today");
  const [coreVersion, setCoreVersion] = useState("0.1.2");

  const installedIds = useMemo(() => new Set(archive.state.installedIds), [archive.state.installedIds]);
  const pendingCount = feed?.entries.filter((entry) => !installedIds.has(entry.id)).length ?? 0;
  const latestEntry = feed?.entries[0];
  const latestCapsule = latestEntry ? capsules.get(latestEntry.id) : undefined;
  const isBusy = status === "checking" || status === "installing";

  const persist = useCallback((next: LocalArchive) => { setArchive(next); saveArchive(next); }, []);

  const refresh = useCallback(async () => {
    setStatus("checking");
    setNotice("滚筒正在对齐远端账本……");
    try {
      const nextFeed = await fetchFeed();
      setFeed(nextFeed);
      const pending = await findPendingCapsules(nextFeed, archive);
      const latest = nextFeed.entries[0];
      const visible = [...pending];
      if (latest && !visible.some((capsule) => capsule.id === latest.id)) visible.push(await fetchCapsule(latest.path));
      setCapsules((current) => new Map([...current, ...visible.map((capsule) => [capsule.id, capsule] as const)]));
      setNotice(pending.length ? `发现 ${pending.length} 张尚未压印的更新票。` : "账本平整：你已经拥有目前全部变化。");
      if (pending.length) await notifyUpdate("Updated Again 又更了", pending[0].reason.headline);
      if (archive.autoInstall && pending.length) {
        setStatus("installing");
        let next = archive;
        for (const capsule of pending) next = await installVerifiedCapsule(next, capsule);
        persist(next);
        setNotice(`自动压印了 ${pending.length} 张真实更新票。`);
      }
      setStatus("idle");
      try { setCoreVersion(await fetchCoreVersion()); } catch { /* capsule ledger remains authoritative */ }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, persist]);

  useEffect(() => {
    void refresh();
    // Read once at launch; manual checks use the same verified path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void listenForTrayCheckUpdate(() => void checkForCoreUpdate()).then((handler) => { unsubscribe = handler; });
    return () => unsubscribe?.();
  }, []);

  const installOne = useCallback(async (id: string) => {
    setStatus("installing");
    try {
      const entry = feed?.entries.find((candidate) => candidate.id === id);
      if (!entry) throw new Error("公开账本里找不到这张更新票。");
      const capsule = capsules.get(id) ?? await fetchCapsule(entry.path);
      persist(await installVerifiedCapsule(archive, capsule));
      setCapsules((current) => new Map(current).set(id, capsule));
      setNotice(`压印完成：${capsule.reason.headline}`);
      setStatus("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, capsules, feed, persist]);

  const installAll = useCallback(async () => {
    if (!feed) return void refresh();
    setStatus("installing");
    setNotice("拉杆已落下：正在验签、压印并保存回滚快照……");
    try {
      const pending = await findPendingCapsules(feed, archive);
      let next = archive;
      for (const capsule of pending) next = await installVerifiedCapsule(next, capsule);
      persist(next);
      setNotice(pending.length ? `咔哒——${pending.length} 张更新票已经进入你的世界。` : "空压一次也算一种认真检查。");
      setStatus("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, feed, persist, refresh]);

  const ghostContext = `Core v${coreVersion}；公开账本 ${feed?.total ?? 0} 更；待安装 ${pendingCount} 更；最新理由：${latestCapsule?.reason.headline ?? latestEntry?.headline ?? "未知"}`;

  return (
    <main className="press-app">
      <header className="masthead">
        <button className="wordmark" type="button" onClick={() => setTab("today")} aria-label="返回今日更新"><span>UPDATED</span><strong>AGAIN</strong><small>又更了 / 一份拒绝停刊的软件</small></button>
        <nav aria-label="主导航">
          <button type="button" className={tab === "today" ? "active" : ""} aria-pressed={tab === "today"} onClick={() => setTab("today")}><span>01</span><strong>今日压印</strong></button>
          <button type="button" className={tab === "museum" ? "active" : ""} aria-pressed={tab === "museum"} onClick={() => setTab("museum")}><span>02</span><strong>版本票仓</strong></button>
          <button type="button" className={tab === "lab" ? "active" : ""} aria-pressed={tab === "lab"} onClick={() => setTab("lab")}><span>03</span><strong>改装车间</strong></button>
        </nav>
        <div className="masthead__status"><span className={`live-dot live-dot--${status}`} /><strong>{status === "error" ? "线路异常" : isBusy ? "正在压印" : "今日仍在更新"}</strong><small>{isDesktopApp() ? "DESKTOP PRESS" : "WEB / PWA PRESS"}</small></div>
      </header>

      <div className="ticker" aria-label="项目原则"><div><span>理由可以荒唐 · 改动必须真实 · 每天至少一更 · 所有版本进入博物馆 · 可以回滚但不抹掉历史 ·&nbsp;</span><span aria-hidden="true">理由可以荒唐 · 改动必须真实 · 每天至少一更 · 所有版本进入博物馆 · 可以回滚但不抹掉历史 ·&nbsp;</span></div></div>

      {tab === "today" && <>
        <section className="front-page">
          <article className="lead-update">
            <div className="lead-update__meta"><span>VOL. {String(feed?.total ?? 0).padStart(4, "0")}</span><span>CORE {coreVersion}</span><span>{dateLabel(latestEntry?.publishedAt)}</span></div>
            <p className="section-code">LATEST SIGNED CAPSULE / 最新签名胶囊</p>
            <h1>{latestCapsule?.reason.headline ?? latestEntry?.headline ?? "今天也必须发生一点变化"}</h1>
            <p className="lead-update__detail">{latestCapsule?.reason.detail ?? "每次更新理由可以不正经，但更新包必须真的改变些什么。"}</p>
            <dl className="reason-ledger">
              <div><dt>心情</dt><dd>{latestCapsule?.reason.mood ?? latestEntry?.mood ?? "等待中"}</dd></div>
              <div><dt>荒诞度</dt><dd>{latestCapsule?.reason.absurdity ?? latestEntry?.absurdity ?? "--"}<small>/100</small></dd></div>
              <div><dt>待压印</dt><dd>{pendingCount}<small> CAPSULES</small></dd></div>
            </dl>
            <button type="button" className="lever-button" disabled={isBusy} onClick={() => void (pendingCount ? installAll() : refresh())}><span className="lever-button__handle" aria-hidden="true" /><span><small>{isBusy ? "ROLLERS MOVING" : pendingCount ? "PULL TO INSTALL" : "PULL TO CHECK"}</small>{status === "checking" ? "正在对账" : status === "installing" ? "正在压印" : status === "error" ? "重新接通线路" : pendingCount ? "拉下更新杆" : "再空压一次"}</span></button>
            <p className={`press-notice press-notice--${status}`} role="status" aria-live="polite">{notice}</p>
          </article>

          <figure className="press-portrait">
            <img src="./assets/press-console.webp" width="1536" height="1024" alt="一台带有滚筒、出票口和黄色更新拉杆的复古更新压印机" />
            <figcaption><span>FIG. 01</span><p>这不是装饰图：它规定了整站的纸张、油墨、金属和黄色警告色。</p></figcaption>
            <div className="press-portrait__stamp">SIGNED<br />&amp; SILLY</div>
          </figure>
        </section>

        <section className="broadcast-grid">
          <VersionGhost context={ghostContext} />
          <aside className="world-desk">
            <p className="section-code">CURRENT LOCAL WORLD / 当前本地世界</p>
            <blockquote>“{archive.state.banner}”</blockquote>
            <div className="world-desk__companion"><Companion name={archive.state.companion.name} mood={archive.state.companion.mood} phrase={archive.state.companion.phrase} glyph={archive.state.companion.glyph} /></div>
            <dl><div><dt>已安装</dt><dd>{archive.state.stats.updatesInstalled}</dd></div><div><dt>藏品</dt><dd>{archive.state.collectibles.length}</dd></div><div><dt>版本星</dt><dd>{archive.state.stars.length}</dd></div></dl>
          </aside>
        </section>

        <section className="heartbeat-section"><header><div><p className="section-code">THE PROJECT IS BREATHING / 更新心电图</p><h2>每一格都是真实发生过的一天</h2></div><button type="button" onClick={() => setTab("museum")}>打开完整票仓 ↗</button></header><StreakCalendar entries={feed?.entries ?? []} /></section>
        <section className="latest-editions"><header><p className="section-code">RECENT EDITIONS</p><h2>最近三张票根</h2></header><div>{feed?.entries.slice(0, 3).map((entry) => <UpdateCard key={entry.id} entry={entry} installed={installedIds.has(entry.id)} onInstall={() => void installOne(entry.id)} busy={isBusy} />)}</div></section>
      </>}

      {tab === "museum" && <section className="archive-page">
        <header className="page-heading"><div><p className="section-code">APPEND-ONLY LEDGER / VOL. {feed?.total ?? 0}</p><h1>版本票仓</h1><p>荒唐理由、真实变化、签名与安装状态一张不少。回滚只改变你的本地世界，不焚毁公共历史。</p></div><button type="button" disabled={!archive.history.length} onClick={() => { persist(rollbackLatest(archive)); setNotice("最后一张本地更新票已回滚；公共账本仍然完整。"); }}>↶ 回滚最后一更</button></header>
        <div className="archive-layout"><div className="archive-list">{feed?.entries.map((entry) => <UpdateCard key={entry.id} entry={entry} installed={installedIds.has(entry.id)} onInstall={() => void installOne(entry.id)} busy={isBusy} />)}</div><aside className="relic-cabinet"><p className="section-code">YOUR CABINET</p><h2>我的版本藏柜</h2>{archive.state.collectibles.length ? archive.state.collectibles.map((item) => <article key={item.id}><span>{item.glyph}</span><div><strong>{item.name}</strong><p>{item.note}</p></div></article>) : <p className="muted">空柜子也属于博物馆。某次更新迟早会硬塞给你一点东西。</p>}</aside></div>
      </section>}

      {tab === "lab" && <section className="lab-page">
        <header className="page-heading"><div><p className="section-code">CAPABILITY REGISTRY</p><h1>改装车间</h1><p>配方负责每天变花样，核心版本负责增加真正的新器官。这里列出压印机当前听得懂的全部怪癖。</p></div><span className="workshop-number">{String(CAPABILITY_LIST.length).padStart(2, "0")}</span></header>
        <div className="capability-list">{CAPABILITY_LIST.map((capability, index) => <article key={capability.kind}><span>{String(index + 1).padStart(2, "0")}</span><div><code>{capability.kind}</code><h2>{capability.label}</h2><p>{capability.description}</p></div></article>)}</div>
        <div className="lab-controls"><label><input type="checkbox" checked={archive.autoInstall} onChange={(event) => persist({ ...archive, autoInstall: event.target.checked })} /><span><strong>自动进纸</strong>启动时自动安装所有通过签名验证的胶囊</span></label><button type="button" onClick={async () => { const enabled = await enableNotifications(); setNotice(enabled ? "更新通知已获准。" : "未获得通知权限；打开应用时仍会检查。"); }}>开启更新通知</button>{isDesktopApp() && <button type="button" onClick={() => void checkForCoreUpdate()}>检查核心机件</button>}</div>
      </section>}

      <footer className="site-footer"><div><strong>UPDATED AGAIN</strong><span>更新不是维护工作的副产品；在这里，更新就是作品。</span></div><div><a href="https://github.com/WSL043/updated-again" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://github.com/WSL043/updated-again/issues/new?template=update-idea.yml" target="_blank" rel="noreferrer">投稿荒唐更新 ↗</a></div></footer>
    </main>
  );
}

export default App;
