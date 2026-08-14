import type { WorldState } from "../core/types";

export function Constellation({ stars }: { stars: WorldState["stars"] }) {
  return (
    <div className="constellation" aria-label={`版本星图，共 ${stars.length} 颗星`}>
      {stars.map((star) => (
        <span
          className="version-star"
          key={star.id}
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
          title={star.label}
        />
      ))}
    </div>
  );
}
