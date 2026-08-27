import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface UpdateBroadcastProps {
  absurdity: number;
  date: string;
  detail: string;
  headline: string;
  mood: string;
  pending: number;
  sequence: number;
  total: number;
}

const palette = {
  ink: "#f7f7f2",
  quiet: "#9b9b92",
  signal: "#d9ff43",
  violet: "#8a72ff",
  black: "#0d0d0d",
};

function enter(frame: number, fps: number, delay = 0) {
  return spring({ fps, frame: frame - delay, config: { damping: 18, stiffness: 120, mass: 0.8 } });
}

function BroadcastHeader({ sequence, date }: Pick<UpdateBroadcastProps, "sequence" | "date">) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: "52px 58px auto", display: "flex", justifyContent: "space-between", color: palette.quiet, font: "700 22px/1.2 ui-monospace, monospace", letterSpacing: "0.08em", opacity }}>
      <span>UPDATED AGAIN / #{String(sequence).padStart(4, "0")}</span>
      <span>{date}</span>
      <span style={{ color: palette.signal, transform: `scale(${enter(frame, fps, 4)})`, transformOrigin: "right center" }}>● LIVE EDITION</span>
    </div>
  );
}

function HeadlineScene({ headline, mood }: Pick<UpdateBroadcastProps, "headline" | "mood">) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = enter(frame, fps, 5);
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "110px 58px 70px" }}>
      <div style={{ color: palette.signal, font: "800 24px/1 ui-monospace, monospace", letterSpacing: "0.14em", marginBottom: 30, opacity: progress }}>TODAY CHANGED BECAUSE / {mood}</div>
      <div style={{ color: palette.ink, font: "900 clamp(64px, 7vw, 112px)/0.94 Arial, 'Microsoft YaHei', sans-serif", maxWidth: 1500, letterSpacing: "-0.055em", transform: `translateY(${(1 - progress) * 50}px)`, opacity: progress }}>{headline}</div>
    </AbsoluteFill>
  );
}

function DetailScene({ absurdity, detail, pending, total }: Pick<UpdateBroadcastProps, "absurdity" | "detail" | "pending" | "total">) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const detailIn = enter(frame, fps, 0);
  const count = Math.round(interpolate(frame, [10, 58], [0, total], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ padding: "110px 58px 68px", justifyContent: "space-between" }}>
      <p style={{ margin: 0, color: palette.ink, font: "700 48px/1.25 Arial, 'Microsoft YaHei', sans-serif", maxWidth: 1350, transform: `translateX(${(1 - detailIn) * 70}px)`, opacity: detailIn }}>{detail}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", borderTop: `2px solid ${palette.quiet}`, color: palette.ink }}>
        {[
          [String(count), "PUBLIC CHANGES"],
          [String(absurdity).padStart(2, "0"), "ABSURDITY / 100"],
          [String(pending).padStart(2, "0"), "WAITING FOR YOU"],
        ].map(([value, label], index) => (
          <div key={label} style={{ padding: "34px 28px 0 0", borderRight: index < 2 ? `1px solid ${palette.quiet}` : undefined, marginRight: index < 2 ? 28 : 0 }}>
            <strong style={{ display: "block", color: index === 0 ? palette.signal : index === 1 ? palette.violet : palette.ink, font: "900 86px/0.9 Arial, sans-serif" }}>{value}</strong>
            <span style={{ display: "block", marginTop: 18, color: palette.quiet, font: "700 20px/1 ui-monospace, monospace", letterSpacing: "0.08em" }}>{label}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function SignOff() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = spring({ fps, frame, config: { damping: 9, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ width: 128, height: 128, borderRadius: "50%", background: palette.signal, transform: `scale(${pulse})`, marginBottom: 46 }} />
      <strong style={{ color: palette.ink, font: "900 92px/0.9 Arial, sans-serif", letterSpacing: "-0.055em" }}>UPDATE<br />RECORDED.</strong>
      <span style={{ color: palette.quiet, font: "700 22px/1 ui-monospace, monospace", letterSpacing: "0.14em", marginTop: 42 }}>已记录 · 可安装 · 可回滚</span>
    </AbsoluteFill>
  );
}

export function UpdateBroadcast(props: UpdateBroadcastProps) {
  return (
    <AbsoluteFill style={{ background: palette.black, overflow: "hidden", fontFamily: "Arial, 'Microsoft YaHei', sans-serif" }}>
      <AbsoluteFill style={{ opacity: 0.16, backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      <BroadcastHeader sequence={props.sequence} date={props.date} />
      <Sequence from={0} durationInFrames={95}><HeadlineScene headline={props.headline} mood={props.mood} /></Sequence>
      <Sequence from={95} durationInFrames={95}><DetailScene absurdity={props.absurdity} detail={props.detail} pending={props.pending} total={props.total} /></Sequence>
      <Sequence from={190} durationInFrames={70}><SignOff /></Sequence>
    </AbsoluteFill>
  );
}
