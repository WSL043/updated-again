import { t, useLanguage } from "../i18n";
import { useMemo, useState } from "react";
import { ReleaseFilm } from "../components/ReleaseFilm";
import { UpdateCard } from "../components/UpdateCard";
import { paginate } from "../core/pagination";
import type { UpdateStation } from "../hooks/useUpdateStation";
import { shortDateLabel } from "../ui/format";
export function ArchivePage({ station }: {
    station: UpdateStation;
}) {
    useLanguage();
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState<string | undefined>();
    const entries = station.feed?.entries ?? [];
    const filtered = useMemo(() => {
        const value = query.trim().toLowerCase();
        if (!value)
            return entries;
        return entries.filter((entry) => [entry.headline, entry.mood, entry.kind, entry.channel, entry.plannedFor].some((field) => field.toLowerCase().includes(value)));
    }, [entries, query]);
    const window = paginate(filtered, page);
    const selected = window.items.find((entry) => entry.id === selectedId) ?? window.items[0];
    return (<section className="archive-page">
      <header className="page-heading">
        <div><p>{t("共")}{entries.length}{t("个版本")}</p><h1>{t("更新记录")}</h1><span>{t("公开版本都留在这里。回滚只动你这台机器，不会删账。")}</span></div>
        <button type="button" disabled={station.isBusy || !station.archive.history.length} onClick={station.rollback}>{t("↶ 回滚最后一更")}</button>
      </header>

      <div className="archive-toolbar">
        <label htmlFor="archive-search">{t("搜索版本")}</label>
        <input id="archive-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={t("标题、日期、心情、类型……")}/>
        <span aria-live="polite">{filtered.length} / {entries.length}</span>
      </div>

      {selected && (<div className="archive-projector">
          <div>
            <label htmlFor="edition-select">{t("版本放映机")}</label>
            <select id="edition-select" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {window.items.map((entry) => <option key={entry.id} value={entry.id}>#{entry.sequence} · {entry.headline}</option>)}
            </select>
            <p>{t("用当前搜索结果这一页的版本生成短片。")}</p>
          </div>
          <ReleaseFilm absurdity={selected.absurdity} date={shortDateLabel(selected.publishedAt)} detail={`${selected.kind} · ${selected.mood} · ${selected.channel}`} headline={selected.headline} mood={selected.mood} pending={station.installedIds.has(selected.id) ? 0 : 1} sequence={selected.sequence} total={entries.length}/>
        </div>)}

      <nav className="archive-pagination" aria-label={t("更新记录分页")}>
        <button type="button" disabled={window.page === 1} onClick={() => setPage(window.page - 1)} aria-controls="archive-results">{t("← 上一页")}</button>
        <span role="status">{t("第")}{window.page} / {window.pages}{t("页 ·")}{window.start}–{window.end} / {window.total}{t("更")}</span>
        <button type="button" disabled={window.page === window.pages} onClick={() => setPage(window.page + 1)} aria-controls="archive-results">{t("下一页 →")}</button>
      </nav>
      <div className="archive-layout">
        <div className="archive-list" id="archive-results">
          {window.items.map((entry) => <UpdateCard key={entry.id} entry={entry} installed={station.installedIds.has(entry.id)} onInstall={() => void station.installOne(entry.id)} busy={station.isBusy}/>)}
          {!filtered.length && <p className="empty-state">{t("没有找到。换个关键词试试。")}</p>}
        </div>
        <aside className="relic-cabinet">
          <p>{t("留在这台机器上")}</p><h2>{t("我的版本藏柜")}</h2>
          {station.archive.state.collectibles.length ? station.archive.state.collectibles.map((item) => (<article key={item.id}><span>{item.glyph}</span><div><strong>{t(item.name)}</strong><p>{t(item.note)}</p></div></article>)) : <p className="muted">{t("还没有藏品。安装包含藏品的更新后会显示在这里。")}</p>}
        </aside>
      </div>
    </section>);
}
