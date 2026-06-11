"use client";

/**
 * GlobalOverlays — app-wide, always-mounted overlays. Loaded client-only
 * (see GlobalOverlaysLoader) since AudioController touches Howler/Audio.
 */
import AudioController from "@/components/audio/AudioController";
import AchievementWatcher from "@/components/achievements/AchievementWatcher";
import MuteButton from "./MuteButton";
import AchievementToast from "./AchievementToast";
import PauseMenu from "./PauseMenu";

export default function GlobalOverlays() {
  return (
    <>
      <AudioController />
      <AchievementWatcher />
      <MuteButton />
      <AchievementToast />
      <PauseMenu />
    </>
  );
}
