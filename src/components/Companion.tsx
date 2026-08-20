import { useEffect, useRef, useState } from "react";

type MoodTrait = "sleepy" | "happy" | "curious" | "neutral";

function moodTrait(mood: string): MoodTrait {
  if (/睡|困|累|懒|冬眠|疲惫/.test(mood)) return "sleepy";
  if (/开心|高兴|兴奋|快乐|欢|哈|喜|骄傲|得意/.test(mood)) return "happy";
  if (/奇|问|探|研究|疑惑|观察/.test(mood)) return "curious";
  return "neutral";
}

interface CompanionProps {
  name: string;
  mood: string;
  phrase: string;
  glyph: string;
}

const EXTRA_BUBBLES = [
  "今天的更新理由，我可以作证是真的。",
  "别急，再等等，宇宙还在打包。",
  "我负责在这里等下一更。",
];

export function Companion({ name, mood, phrase, glyph }: CompanionProps) {
  const trait = moodTrait(mood);
  const [saying, setSaying] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const speak = () => {
    const pool = [phrase, ...EXTRA_BUBBLES];
    const next = pool[Math.floor(Math.random() * pool.length)];
    setSaying(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaying(null), 3200);
  };

  return (
    <div className="companion__stage">
      <button
        type="button"
        className={`creature creature--${trait}`}
        onClick={speak}
        aria-label={`${name}：${phrase}`}
      >
        <span className="creature__body" aria-hidden="true">
          <span className="creature__eye creature__eye--left" />
          <span className="creature__eye creature__eye--right" />
          <span className="creature__mouth" />
          <span className="creature__blush creature__blush--left" />
          <span className="creature__blush creature__blush--right" />
        </span>
        <span className="creature__glyph" aria-hidden="true">{glyph}</span>
      </button>
      {saying && <p className="creature__bubble" role="status">{saying}</p>}
      <h2>{name}</h2>
      <p className="creature__mood">{mood}</p>
    </div>
  );
}
