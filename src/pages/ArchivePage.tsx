import { useMemo, useState } from "react";
import { ReleaseFilm } from "../components/ReleaseFilm";
import { UpdateCard } from "../components/UpdateCard";
import type { UpdateStation } from "../hooks/useUpdateStation";
import { shortDateLabel } from "../ui/format";

export function ArchivePage({ station }: { station: UpdateStation }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const entries = station.feed?.entries ?? [];
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return entries;
    return entries.filter((entry) => [entry.headline, entry.mood, entry.kind, entry.channel, entry.plannedFor].some((field) => field.toLowerCase().includes(value)));
  }, [entries, query]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <section className="archive-page">
      <header className="page-heading">
        <div><p>共 {entries.length} 个版本</p><h1>更新记录</h1><span>公开版本都留在这里。回滚只动你这台机器，不会删账。</span></div>
        <button type="button" disabled={!station.archive.history.length} onClick={station.rollback}>↶ 回滚最后一更</button>
      </header>

      {selected && (
        <div className="archive-projector">
          <div>
            <label htmlFor="edition-select">版本放映机</label>
            <select id="edition-select" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {entries.map((entry) => <option key={entry.id} value={entry.id}>#{entry.sequence} · {entry.headline}</option>)}
            </select>
            <p>用所选版本的数据生成短片。</p>
          </div>
          <ReleaseFilm
            absurdity={selected.absurdity}
            date={shortDateLabel(selected.publishedAt)}
            detail={`${selected.kind} · ${selected.mood} · ${selected.channel}`}
            headline={selected.headline}
            mood={selected.mood}
            pending={station.installedIds.has(selected.id) ? 0 : 1}
            sequence={selected.sequence}
            total={entries.length}
          />
        </div>
      )}

      <div className="archive-toolbar">
        <label htmlFor="archive-search">搜索版本</label>
        <input id="archive-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="标题、日期、心情、类型……" />
        <span aria-live="polite">{filtered.length} / {entries.length}</span>
      </div>

      <div className="archive-layout">
        <div className="archive-list">
          {filtered.map((entry) => <UpdateCard key={entry.id} entry={entry} installed={station.installedIds.has(entry.id)} onInstall={() => void station.installOne(entry.id)} busy={station.isBusy} />)}
          {!filtered.length && <p className="empty-state">没有找到。换个关键词试试。</p>}
        </div>
        <aside className="relic-cabinet">
          <p>留在这台机器上</p><h2>我的版本藏柜</h2>
          {station.archive.state.collectibles.length ? station.archive.state.collectibles.map((item) => (
            <article key={item.id}><span>{item.glyph}</span><div><strong>{item.name}</strong><p>{item.note}</p></div></article>
          )) : <p className="muted">还没有藏品。安装包含藏品的更新后会显示在这里。</p>}
        </aside>
      </div>
    </section>
  );
}
