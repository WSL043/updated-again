import { t, useLanguage } from "../i18n";
import { Companion } from "../components/Companion";
import { ReleaseFilm } from "../components/ReleaseFilm";
import { StreakCalendar } from "../components/StreakCalendar";
import { UpdateCard } from "../components/UpdateCard";
import { VersionGhost } from "../components/VersionGhost";
import type { UpdateStation } from "../hooks/useUpdateStation";
import type { StyleGenome } from "../core/style-genome";
import { dateTimeLabel, shortDateLabel } from "../ui/format";
export function TodayPage({ station, genome }: {
    station: UpdateStation;
    genome: StyleGenome;
}) {
    useLanguage();
    const { archive, coreVersion, feed, installedIds, isBusy, latestCapsule, latestEntry, notice, pendingCount, status } = station;
    const headline = latestCapsule?.reason.headline ?? latestEntry?.headline ?? t("今天还没有更新");
    const detail = latestCapsule?.reason.detail ?? t("等下一份通过验签的更新。");
    const mood = latestCapsule?.reason.mood ?? latestEntry?.mood ?? t("等待中");
    const absurdity = latestCapsule?.reason.absurdity ?? latestEntry?.absurdity ?? 0;
    const sequence = latestEntry?.sequence ?? feed?.total ?? 0;
    const ghostContext = t("Core v{0}；公开账本 {1} 更；待安装 {2} 更；最新理由：{3}", [coreVersion, feed?.total ?? 0, pendingCount, headline]);
    return (<>
      <p className="original-content-note">{t("Original release content")}</p>
      <section className="today-hero" id="edition">
        <div className="edition-mark" aria-hidden="true">
          <span>ISSUE</span>
          <strong>{String(sequence).padStart(4, "0")}</strong>
        </div>
        <article className="release-summary">
          <div className="eyebrow"><span>{t("今天为什么又更了")}</span><time>{dateTimeLabel(latestEntry?.publishedAt)}</time></div>
          <h1>{headline}</h1>
          <p className="release-summary__detail">{detail}</p>
          <div className="release-summary__facts">
            <span><small>{t("心情")}</small><strong>{mood}</strong></span>
            <span><small>{t("荒诞度")}</small><strong>{absurdity}<i>/100</i></strong></span>
            <span><small>{t("等待安装")}</small><strong>{pendingCount}<i>{t("更")}</i></strong></span>
          </div>
          <div className="release-action">
            <button type="button" className="primary-action" disabled={isBusy} onClick={() => void (pendingCount ? station.installAll() : station.refresh())}>
              <span aria-hidden="true">{pendingCount ? "↓" : "↻"}</span>
              <span><small>{isBusy ? t("正在处理") : pendingCount ? t("签名验证后安装") : t("再次核对账本")}</small><strong>{status === "checking" ? t("正在检查") : status === "installing" ? t("正在安装") : pendingCount ? t("安装 {0} 个变化", [pendingCount]) : t("检查新变化")}</strong></span>
            </button>
            <p className={`release-notice release-notice--${status}`} role="status" aria-live="polite">{t(notice)}</p>
          </div>
        </article>

        <div className="release-broadcast">
          <ReleaseFilm absurdity={absurdity} date={shortDateLabel(latestEntry?.publishedAt)} detail={detail} headline={headline} mood={mood} pending={pendingCount} sequence={sequence} total={feed?.total ?? 0}/>
        </div>

        <aside className="edition-colophon" aria-label={t("项目当前状态")}>
          <p>{t("这一期确实存在")}</p>
          <dl>
            <div><dt>{t("公开变化")}</dt><dd>{feed?.total ?? "—"}</dd></div>
            <div><dt>{t("核心")}</dt><dd>v{coreVersion}</dd></div>
            <div><dt>{t("装进本机")}</dt><dd>{archive.state.stats.updatesInstalled}</dd></div>
            <div><dt>{t("回滚快照")}</dt><dd>{archive.history.length ? t("有") : t("无")}</dd></div>
            <div><dt>{t("今日样式")}</dt><dd title={t("视觉基因 {0}", [genome.id])}>{t(genome.label)}</dd></div>
          </dl>
        </aside>
      </section>

      <aside className="edition-play-link"><strong>{t("更新看完了，来玩一局。")}</strong><a href="#play">{t("去接线室 →")}</a><a href="#mix">{t("去混合台 →")}</a></aside>

      <section className="world-section">
        <header className="section-intro">
          <span className="section-number">02</span>
          <div><p>{t("你的这一份")}</p><h2>{t("装过什么，")}<br />{t("它都记得。")}</h2></div>
          <small>{t("配色、按钮、消息、藏品和小玩法留在本机；动手前先存快照。")}</small>
        </header>
        <div className="world-state">
          <blockquote>“{archive.state.banner}”</blockquote>
          <Companion name={t(archive.state.companion.name)} mood={archive.state.companion.mood} phrase={archive.state.companion.phrase} glyph={archive.state.companion.glyph}/>
          <dl>
            <div><dt>{t("藏品")}</dt><dd>{archive.state.collectibles.length}</dd></div>
            <div><dt>{t("仪式")}</dt><dd>{archive.state.rituals.length}</dd></div>
            <div><dt>{t("版本星")}</dt><dd>{archive.state.stars.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="heartbeat-section">
        <header><span className="section-number">03</span><div><p>{t("最近 14 周")}</p><h2>{t("更新的足迹。")}</h2></div><a href="#archive">{t("翻完整账本")}</a></header>
        <StreakCalendar entries={feed?.entries ?? []}/>
      </section>

      <section className="conversation-section">
        <header className="section-intro section-intro--dark">
          <span className="section-number">04</span>
          <div><p>{t("更新热线")}</p><h2>{t("找幽灵")}<br />{t("说句话。")}</h2></div>
          <small>{t("本地先答；想聊开一点，再借社区节点。")}</small>
        </header>
        <VersionGhost context={ghostContext}/>
      </section>

      <section className="recent-section">
        <header><span className="section-number">05</span><div><p>{t("前几次")}</p><h2>{t("不是今天才这样。")}</h2></div><a href="#archive">{t("继续往前翻")}</a></header>
        <div className="recent-grid">
          {feed?.entries.slice(0, 3).map((entry) => (<UpdateCard key={entry.id} entry={entry} installed={installedIds.has(entry.id)} onInstall={() => void station.installOne(entry.id)} busy={isBusy}/>))}
        </div>
      </section>
    </>);
}
