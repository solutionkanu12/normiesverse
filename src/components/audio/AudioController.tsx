"use client";

/**
 * AudioController — headless (renders nothing) global audio brain.
 *
 * Mounted once in the root layout (via GlobalOverlays). Picks the ambient
 * bed from the current route + active world, keeps Howler's volume/mute in
 * sync with useAudioStore, and fires one-shot SFX off state transitions
 * (Reality Core pickup, quest dialogue, boss hits/alerts/victory, portal
 * entry). Achievement SFX is fired by AchievementToast itself (Phase 11.4).
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useGameStore, type GamePhase } from "@/store/useGameStore";
import { useWorldStore, type WorldKind } from "@/store/useWorldStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useQuestStore } from "@/store/useQuestStore";
import { useAudioStore } from "@/store/useAudioStore";
import { AudioManager } from "@/systems/audio/AudioManager";
import type { AmbientTrackId } from "@/systems/audio/audioAssets";

/** Pick the ambient bed for the current route/world/boss-phase. */
function resolveAmbientTrack(pathname: string, phase: GamePhase, worldKind: WorldKind | null): AmbientTrackId {
  if (pathname.startsWith("/game/boss")) {
    return phase === "victory" ? "nexus" : "boss";
  }
  if (pathname.startsWith("/game/world")) {
    return worldKind ?? "nexus";
  }
  return "nexus";
}

export default function AudioController() {
  const pathname = usePathname();
  const phase = useGameStore((s) => s.phase);
  const worldKind = useWorldStore((s) => s.kind);
  const muted = useAudioStore((s) => s.muted);
  const volume = useAudioStore((s) => s.volume);
  const setTrack = useAudioStore((s) => s.setTrack);

  const realityCores = usePlayerStore((s) => s.realityCores);
  const dialogue = useQuestStore((s) => s.dialogue);
  const bossHp = useGameStore((s) => s.boss.hp);
  const bossActive = useGameStore((s) => s.boss.active);
  const bossDefeated = useGameStore((s) => s.boss.defeated);
  const xorFlash = useGameStore((s) => s.boss.xorFlash);

  // Ambient bed — switches (with crossfade) on route/world/boss-phase change.
  useEffect(() => {
    const track = resolveAmbientTrack(pathname, phase, worldKind);
    AudioManager.playAmbient(track);
    setTrack(track);
  }, [pathname, phase, worldKind, setTrack]);

  // Volume/mute sync.
  useEffect(() => {
    AudioManager.setSettings(volume, muted);
  }, [volume, muted]);

  // Portal / Null Rift entry whoosh.
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    if (prev !== pathname) {
      const enteringRealm = pathname.startsWith("/game/world") || pathname.startsWith("/game/boss");
      if (enteringRealm && prev.startsWith("/game")) {
        AudioManager.playSfx("portal");
      }
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Reality Core pickup chime.
  const coreCountRef = useRef(realityCores.length);
  useEffect(() => {
    if (realityCores.length > coreCountRef.current) AudioManager.playSfx("core");
    coreCountRef.current = realityCores.length;
  }, [realityCores.length]);

  // Quest dialogue ping.
  const dialogueIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = dialogue?.questId ?? null;
    if (id && id !== dialogueIdRef.current) AudioManager.playSfx("quest");
    dialogueIdRef.current = id;
  }, [dialogue]);

  // Boss strike impact.
  const bossHpRef = useRef(bossHp);
  useEffect(() => {
    if (bossActive && bossHp < bossHpRef.current) AudioManager.playSfx("hit");
    bossHpRef.current = bossHp;
  }, [bossHp, bossActive]);

  // XOR attack alert.
  useEffect(() => {
    if (xorFlash) AudioManager.playSfx("alert");
  }, [xorFlash]);

  // Victory fanfare.
  const defeatedRef = useRef(false);
  useEffect(() => {
    if (bossDefeated && !defeatedRef.current) AudioManager.playSfx("victory");
    defeatedRef.current = bossDefeated;
  }, [bossDefeated]);

  return null;
}
