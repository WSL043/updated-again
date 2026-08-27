import { lazy, Suspense, useEffect, useState } from "react";
import type { UpdateBroadcastProps } from "../remotion/UpdateBroadcast";

const LazyPlayer = lazy(() => import("./ReleaseFilmPlayer.lazy"));

export function ReleaseFilm(props: UpdateBroadcastProps) {
  const [opened, setOpened] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (opened && !reducedMotion) {
    return (
      <div className="release-film release-film--playing">
        <Suspense fallback={<div className="release-film__loading" role="status">正在加载短片……</div>}>
          <LazyPlayer {...props} />
        </Suspense>
        <button className="release-film__close" type="button" onClick={() => setOpened(false)}>关闭短片</button>
      </div>
    );
  }

  return (
    <figure className="release-film">
      <div className="release-film__poster">
        <div className="release-film__topline"><span>REMOTION EDITION FILM</span><span>#{String(props.sequence).padStart(4, "0")}</span></div>
        <div className="release-film__signal" aria-hidden="true" />
        <blockquote>{props.headline}</blockquote>
        <div className="release-film__footer"><span>{props.date}</span><span>{props.total} CHANGES / {props.absurdity}% ABSURD</span></div>
      </div>
      <figcaption>
        <div><strong>今日版本短片</strong><span>时长 8.7 秒，内容来自这次更新的数据。</span></div>
        <button type="button" onClick={() => setOpened(true)} disabled={reducedMotion}>{reducedMotion ? "动态效果已关闭" : "播放"}</button>
      </figcaption>
    </figure>
  );
}
