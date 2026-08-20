import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

const PARTICLE_COUNT = 26;

interface Particle {
  style: CSSProperties;
  key: number;
}

export function ParticleBurst() {
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setAlive(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 70 + Math.random() * 130;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 40;
        const size = 4 + Math.random() * 7;
        const delay = Math.random() * 0.12;
        return {
          key: index,
          style: {
            "--dx": `${dx}px`,
            "--dy": `${dy}px`,
            "--rot": `${Math.random() * 360}deg`,
            "--psize": `${size}px`,
            "--pdelay": `${delay}s`,
          } as CSSProperties,
        };
      }),
    [],
  );

  if (!alive) return null;

  return (
    <div className="burst" aria-hidden="true">
      <span className="burst__ring" />
      {particles.map((particle) => (
        <span className="burst__particle" key={particle.key} style={particle.style} />
      ))}
    </div>
  );
}
