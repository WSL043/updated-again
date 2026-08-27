import { Companion } from "../components/Companion";
import { ReleaseFilm } from "../components/ReleaseFilm";
import { StreakCalendar } from "../components/StreakCalendar";
import { UpdateCard } from "../components/UpdateCard";
import { VersionGhost } from "../components/VersionGhost";
import type { UpdateStation } from "../hooks/useUpdateStation";
import { dateTimeLabel, shortDateLabel } from "../ui/format";

export function TodayPage({ station }: { station: UpdateStation }) {
  const { archive, coreVersion, feed, installedIds, isBusy, latestCapsule, latestEntry, notice, pendingCount, status } = station;
  const headline = latestCapsule?.reason.headline ?? latestEntry?.headline ?? "今天还没有更新";
  const detail = latestCapsule?.reason.detail ?? "等下一份通过验签的更新。";
  const mood = latestCapsule?.reason.mood ?? latestEntry?.mood ?? "等待中";
  const absurdity = latestCapsule?.reason.absurdity ?? latestEntry?.absurdity ?? 0;
  const sequence = latestEntry?.sequence ?? feed?.total ?? 0;
  const ghostContext = `Core v${coreVersion}；公开账本 ${feed?.total ?? 0} 更；待安装 ${pendingCount} 更；最新理由：${headline}`;

  return (
    <>
      <section className="today-hero">
        <article className="release-summary">
          <div className="eyebrow"><span>今日版本 / #{String(sequence).padStart(4, "0")}</span><time>{dateTimeLabel(latestEntry?.publishedAt)}</time></div>
          <h1>{headline}</h1>
          <p className="release-summary__detail">{detail}</p>
          <div className="release-summary__facts">
            <span><small>心情</small><strong>{mood}</strong></span>
            <span><small>荒诞度</small><strong>{absurdity}<i>/100</i></strong></span>
            <span><small>等待安装</small><strong>{pendingCount}<i> 更</i></strong></span>
          </div>
          <div className="release-action">
            <button type="button" className="primary-action" disabled={isBusy} onClick={() => void (pendingCount ? station.installAll() : station.refresh())}>
              <span aria-hidden="true">{pendingCount ? "↓" : "↻"}</span>
              <span><small>{isBusy ? "正在处理" : pendingCount ? "签名验证后安装" : "再次核对账本"}</small><strong>{status === "checking" ? "正在检查" : status === "installing" ? "正在安装" : pendingCount ? `安装 ${pendingCount} 个变化` : "检查新变化"}</strong></span>
            </button>
            <p className={`release-notice release-notice--${status}`} role="status" aria-live="polite">{notice}</p>
          </div>
        </article>

        <ReleaseFilm
          absurdity={absurdity}
          date={shortDateLabel(latestEntry?.publishedAt)}
          detail={detail}
          headline={headline}
          mood={mood}
          pending={pendingCount}
          sequence={sequence}
          total={feed?.total ?? 0}
        />
      </section>

      <section className="proof-strip" aria-label="项目当前状态">
        <div><small>PUBLIC LEDGER</small><strong>{feed?.total ?? "—"}</strong><span>个签名变化</span></div>
        <div><small>CORE</small><strong>v{coreVersion}</strong><span>跨平台核心</span></div>
        <div><small>LOCAL WORLD</small><strong>{archive.state.stats.updatesInstalled}</strong><span>已安装</span></div>
        <div><small>RECOVERY</small><strong>{archive.history.length ? "READY" : "EMPTY"}</strong><span>本地快照</span></div>
      </section>

      <section className="world-section">
        <div className="section-intro">
          <p>你的本地状态</p>
          <h2>安装过的内容都在这里。</h2>
          <span>配色、按钮、消息、藏品和小玩法都会留在本地。安装前自动保存快照。</span>
        </div>
        <div className="world-state">
          <blockquote>“{archive.state.banner}”</blockquote>
          <Companion name={archive.state.companion.name} mood={archive.state.companion.mood} phrase={archive.state.companion.phrase} glyph={archive.state.companion.glyph} />
          <dl>
            <div><dt>藏品</dt><dd>{archive.state.collectibles.length}</dd></div>
            <div><dt>仪式</dt><dd>{archive.state.rituals.length}</dd></div>
            <div><dt>版本星</dt><dd>{archive.state.stars.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="heartbeat-section">
        <header><div><p>最近 14 周</p><h2>哪天更过，一眼就能看见。</h2></div><a href="#archive">查看全部版本 →</a></header>
        <StreakCalendar entries={feed?.entries ?? []} />
      </section>

      <section className="conversation-section">
        <div className="section-intro section-intro--dark">
          <p>聊天</p>
          <h2>先用本地规则回答。</h2>
          <span>不联网，不下载模型。需要生成式回答时再连接 Puter。</span>
        </div>
        <VersionGhost context={ghostContext} />
      </section>

      <section className="recent-section">
        <header><div><p>最近更新</p><h2>刚刚改了这些。</h2></div><a href="#archive">查看完整记录 →</a></header>
        <div className="recent-grid">
          {feed?.entries.slice(0, 3).map((entry) => (
            <UpdateCard key={entry.id} entry={entry} installed={installedIds.has(entry.id)} onInstall={() => void station.installOne(entry.id)} busy={isBusy} />
          ))}
        </div>
      </section>
    </>
  );
}
