import { Player } from "@remotion/player";
import { UpdateBroadcast, type UpdateBroadcastProps } from "../remotion/UpdateBroadcast";

export default function ReleaseFilmPlayer(props: UpdateBroadcastProps) {
  return (
    <Player
      component={UpdateBroadcast}
      inputProps={props}
      durationInFrames={260}
      compositionWidth={1600}
      compositionHeight={900}
      fps={30}
      controls
      autoPlay
      loop
      clickToPlay
      acknowledgeRemotionLicense
      style={{ width: "100%", aspectRatio: "16 / 9", display: "block" }}
    />
  );
}
