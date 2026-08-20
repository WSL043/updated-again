import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CAPABILITY_LIST, rollbackLatest } from "./capabilities";
import { Companion } from "./components/Companion";
import { Constellation } from "./components/Constellation";
import { ParticleBurst } from "./components/ParticleBurst";
import { StreakCalendar } from "./components/StreakCalendar";
import { UpdateCard } from "./components/UpdateCard";
import { checkForCoreUpdate, enableNotifications, isDesktopApp, listenForTrayCheckUpdate, notifyUpdate } from "./core/native";
import { loadArchive, saveArchive } from "./core/storage";
import type { FeedIndex, LocalArchive, UpdateCapsule } from "./core/types";
import { fetchCapsule, fetchCoreVersion, fetchFeed, findPendingCapsules, installVerifiedCapsule } from "./core/update-client";

type Status = "idle" | "checking" | "installing" | "error";

function App() {
  const [archive, setArchive] = useState<LocalArchive>(() => loadArchive());
  const [feed, setFeed] = useState<FeedIndex | null>(null);
  const [capsules, setCapsules] = useState<Map<string, UpdateCapsule>>(new Map());
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState("正在倾听版本宇宙……");
  const [tab, setTab] = useState<"today" | "museum" | "lab">("today");
  const [coreVersion, setCoreVersion] = useState("0.1.1-1");
  const [burstKey, setBurstKey] = useState(0);

  const installedIds = useMemo(() => new Set(archive.state.installedIds), [archive.state.installedIds]);
  const pendingCount = feed?.entries.filter((entry) => !installedIds.has(entry.id)).length ?? 0;
  const latestEntry = feed?.entries[0];
  const latestCapsule = latestEntry ? capsules.get(latestEntry.id) : undefined;

  const persist = useCallback((next: LocalArchive) => {
    setArchive(next);
    saveArchive(next);
  }, []);

  const refresh = useCallback(async () => {
    setStatus("checking");
    try {
      const nextFeed = await fetchFeed();
      setFeed(nextFeed);
      const pending = await findPendingCapsules(nextFeed, archive);
      const latest = nextFeed.entries[0];
      const visibleCapsules = [...pending];
      if (latest && !visibleCapsules.some((capsule) => capsule.id === latest.id)) {
        visibleCapsules.push(await fetchCapsule(latest.path));
      }
      setCapsules((current) => new Map([...current, ...visibleCapsules.map((capsule) => [capsule.id, capsule] as const)]));
      setNotice(pending.length ? `发现 ${pending.length} 个还没进入你世界的更新。` : "你已经拥有目前全部版本变化。");
      if (pending.length) await notifyUpdate("Updated Again 又更了", pending[0].reason.headline);
      if (archive.autoInstall && pending.length) {
        setStatus("installing");
        let nextArchive = archive;
        for (const capsule of pending) nextArchive = await installVerifiedCapsule(nextArchive, capsule);
        persist(nextArchive);
        setBurstKey((key) => key + 1);
        setNotice(`自动安装了 ${pending.length} 个真实更新。`);
      }
      setStatus("idle");
      try {
        setCoreVersion(await fetchCoreVersion());
      } catch {
        // The ledger is authoritative for capsules; the core version is cosmetic.
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, persist]);

  useEffect(() => {
    void refresh();
    // Refresh is intentionally run once at launch; manual checks use the same verified path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void listenForTrayCheckUpdate(() => void checkForCoreUpdate()).then((handler) => {
      unsubscribe = handler;
    });
    return () => unsubscribe?.();
  }, []);

  const installOne = useCallback(
    async (id: string) => {
      setStatus("installing");
      try {
        const entry = feed?.entries.find((candidate) => candidate.id === id);
        if (!entry) throw new Error("更新账本里找不到这个版本。");
        const capsule = capsules.get(id) ?? (await fetchCapsule(entry.path));
        const next = await installVerifiedCapsule(archive, capsule);
        setCapsules((current) => new Map(current).set(id, capsule));
        persist(next);
        setBurstKey((key) => key + 1);
        setNotice(`已安装：${capsule.reason.headline}`);
        setStatus("idle");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : String(error));
        setStatus("error");
      }
    },
    [archive, capsules, feed, persist],
  );

  const installAll = useCallback(async () => {
    if (!feed) return;
    setStatus("installing");
    try {
      const pending = await findPendingCapsules(feed, archive);
      let next = archive;
      for (const capsule of pending) next = await installVerifiedCapsule(next, capsule);
      persist(next);
      setBurstKey((key) => key + 1);
      setNotice(pending.length ? `这次一口气安装了 ${pending.length} 更。` : "没有漏掉的更新。");
      setStatus("idle");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [archive, feed, persist]);

  const worldStyle = {
    "--world-bg": archive.state.palette.background,
    "--world-surface": archive.state.palette.surface,
    "--world-accent": archive.state.palette.accent,
    "--world-glow": archive.state.palette.glow,
  } as CSSProperties;

  return (
    <main className="app-shell" style={worldStyle}>
      <Constellation stars={archive.state.stars} />
      <header className="topbar">
        <button className="brand" onClick={() => setTab("today")}>
          <span className="brand__mark">↻</span>
          <span>Updated Again</span>
          <small>又更了</small>
        </button>
        <nav aria-label="主导航">
          <button aria-pressed={tab === "today"} className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>今天</button>
          <button aria-pressed={tab === "museum"} className={tab === "museum" ? "active" : ""} onClick={() => setTab("museum")}>博物馆</button>
          <button aria-pressed={tab === "lab"} className={tab === "lab" ? "active" : ""} onClick={() => setTab("lab")}>实验室</button>
        </nav>
        <span className="platform-pill">{isDesktopApp() ? "Desktop" : "Web / PWA"}</span>
      </header>

      {tab === "today" && (
        <div className="page-grid">
          <section className="hero panel">
            <p className="eyebrow">第 {feed?.total ?? "…"} 次变化 · Core v{coreVersion}</p>
            <h1>{latestCapsule?.reason.headline ?? latestEntry?.headline ?? "今天也会发生一点变化"}</h1>
            <p className="hero__detail">
              {latestCapsule?.reason.detail ?? "每次更新理由可以荒唐，但它必须真的改变些什么。"}
            </p>
            <div className="reason-row">
              <span>心情：{latestCapsule?.reason.mood ?? latestEntry?.mood ?? "等待中"}</span>
              <span>荒诞度：{latestCapsule?.reason.absurdity ?? latestEntry?.absurdity ?? "?"}/100</span>
              <span>待安装：{pendingCount}</span>
            </div>
            {burstKey > 0 && <ParticleBurst key={burstKey} />}
            <button
              className={`primary-button temperament-${archive.state.button.temperament}${status === "checking" || status === "installing" ? " is-busy" : ""}`}
              disabled={status === "checking" || status === "installing"}
              onClick={pendingCount ? installAll : refresh}
            >
              {status === "checking"
                ? "正在问今天有没有理由……"
                : status === "installing"
                  ? "正在让世界发生变化……"
                  : status === "error"
                    ? "刚才没听清，再试一次"
                    : pendingCount
                      ? archive.state.button.label
                      : "再检查一次，也许刚刚心情变了"}
            </button>
            <p className={`notice notice--${status}`} role="status" aria-live="polite">{notice}</p>
            <span className="hero__orbit" aria-hidden="true">↻</span>
          </section>

          <aside className="companion panel">
            <Companion
              name={archive.state.companion.name}
              mood={archive.state.companion.mood}
              phrase={archive.state.companion.phrase}
              glyph={archive.state.companion.glyph}
            />
          </aside>

          <section className="world-note panel">
            <p className="eyebrow">当前世界宣言</p>
            <blockquote>{archive.state.banner}</blockquote>
            <div className="world-stats">
              <span><strong>{archive.state.stats.updatesInstalled}</strong> 已安装更新</span>
              <span><strong>{archive.state.collectibles.length}</strong> 件藏品</span>
              <span><strong>{archive.state.stars.length}</strong> 颗版本星</span>
            </div>
          </section>

          <section className="heartbeat panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">更新心跳</p>
                <h2>每一次真实变化都留下脉搏</h2>
              </div>
            </div>
            <StreakCalendar entries={feed?.entries ?? []} />
          </section>

          <section className="latest-list panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">最近版本</p>
                <h2>今天以前也发生过一些事</h2>
              </div>
              <button className="text-button" onClick={() => setTab("museum")}>查看全部</button>
            </div>
            <div className="cards-grid">
              {feed?.entries.slice(0, 3).map((entry) => (
                <UpdateCard
                  key={entry.id}
                  entry={entry}
                  installed={installedIds.has(entry.id)}
                  onInstall={() => void installOne(entry.id)}
                  busy={status === "installing"}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "museum" && (
        <section className="museum-page panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Append-only Update Ledger</p>
              <h1>版本博物馆</h1>
              <p>所有荒唐理由、真实改动、随机种子和安装记录都留在这里。</p>
            </div>
            <button
              className="secondary-button"
              disabled={!archive.history.length}
              onClick={() => {
                persist(rollbackLatest(archive));
                setNotice("已回滚最后一个胶囊；它仍留在公共博物馆里。");
              }}
            >
              回滚我安装的最后一更
            </button>
          </div>
          <div className="museum-layout">
            <div className="timeline">
              {feed?.entries.map((entry) => (
                <UpdateCard
                  key={entry.id}
                  entry={entry}
                  installed={installedIds.has(entry.id)}
                  onInstall={() => void installOne(entry.id)}
                  busy={status === "installing"}
                />
              ))}
            </div>
            <aside className="cabinet">
              <h2>我的版本藏柜</h2>
              {archive.state.collectibles.length ? (
                archive.state.collectibles.map((item) => (
                  <article key={item.id} className="relic">
                    <span>{item.glyph}</span>
                    <div><strong>{item.name}</strong><p>{item.note}</p></div>
                  </article>
                ))
              ) : (
                <p className="muted">还没有收藏品。总会有一次更新决定塞给你点什么。</p>
              )}
            </aside>
          </div>
        </section>
      )}

      {tab === "lab" && (
        <section className="lab-page panel">
          <p className="eyebrow">Capability Registry</p>
          <h1>更新类型实验室</h1>
          <p className="lead">配方可以每天自动增加；全新能力必须经过核心程序更新和审查。</p>
          <div className="capability-grid">
            {CAPABILITY_LIST.map((capability) => (
              <article key={capability.kind}>
                <span>{capability.kind}</span>
                <h2>{capability.label}</h2>
                <p>{capability.description}</p>
              </article>
            ))}
          </div>
          <div className="lab-controls">
            <label>
              <input
                type="checkbox"
                checked={archive.autoInstall}
                onChange={(event) => persist({ ...archive, autoInstall: event.target.checked })}
              />
              启动时自动安装所有通过签名验证的日更胶囊
            </label>
            {isDesktopApp() && (
              <button className="secondary-button" onClick={() => void checkForCoreUpdate()}>
                检查核心程序更新
              </button>
            )}
            <button
              className="secondary-button"
              onClick={async () => {
                const enabled = await enableNotifications();
                setNotice(enabled ? "更新通知已获准。" : "没有获得通知权限；应用仍会在打开时检查更新。");
              }}
            >
              开启更新通知
            </button>
          </div>
        </section>
      )}

      <footer>
        <span>每天至少一更。理由不必正经，改动必须真实。</span>
        <a href="https://github.com/WSL043/updated-again" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </main>
  );
}

export default App;
