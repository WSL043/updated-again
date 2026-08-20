import { useState } from "react";
import type { WorldState } from "../core/types";

const LINK_DISTANCE = 26;
const MAX_LINKS_PER_STAR = 3;

interface StarLink {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function Constellation({ stars }: { stars: WorldState["stars"] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const links: StarLink[] = [];
  const linkCount = new Map<string, number>();
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      const a = stars[i];
      const b = stars[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (Math.hypot(dx, dy) <= LINK_DISTANCE) {
        const countA = linkCount.get(a.id) ?? 0;
        const countB = linkCount.get(b.id) ?? 0;
        if (countA < MAX_LINKS_PER_STAR && countB < MAX_LINKS_PER_STAR) {
          links.push({ key: `${a.id}-${b.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
          linkCount.set(a.id, countA + 1);
          linkCount.set(b.id, countB + 1);
        }
      }
    }
  }

  const selected = stars.find((star) => star.id === selectedId) ?? null;

  return (
    <svg
      className="constellation"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-label={`版本星图，共 ${stars.length} 颗星`}
    >
      <g className="constellation__links">
        {links.map((link) => (
          <line key={link.key} x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2} />
        ))}
      </g>
      {stars.map((star, index) => (
        <g
          key={star.id}
          className={`constellation__star${index === stars.length - 1 ? " constellation__star--new" : ""}`}
          transform={`translate(${star.x} ${star.y})`}
          role="button"
          tabIndex={0}
          aria-label={star.label}
          onClick={() => setSelectedId(star.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelectedId(star.id);
            }
          }}
        >
          <circle
            r={star.size / 2}
            className="constellation__halo"
            style={{ animationDelay: index === stars.length - 1 ? "0s" : `${(index % 6) * 0.5}s` }}
          />
          <circle r={Math.max(star.size / 7, 0.35)} className="constellation__core" />
        </g>
      ))}
      {selected && (
        <g
          className="constellation__tag"
          transform={`translate(${Math.min(Math.max(selected.x + 5, 14), 72)} ${Math.max(selected.y - 5, 8)})`}
        >
          <text>{selected.label}</text>
        </g>
      )}
    </svg>
  );
}
