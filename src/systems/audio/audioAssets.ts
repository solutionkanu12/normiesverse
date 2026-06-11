/**
 * Audio asset registry — maps every ambient loop and SFX to its file under
 * public/audio/ (generated via `npm run gen:audio`, see scripts/generate-audio.mts).
 */

/** Looping ambient beds, one per Nexus/world/boss context. */
export const AMBIENT_TRACKS = {
  nexus: "/audio/ambient-nexus.wav",
  cyberpunk: "/audio/ambient-cyberpunk.wav",
  frozen: "/audio/ambient-frozen.wav",
  void: "/audio/ambient-void.wav",
  boss: "/audio/ambient-boss.wav",
} as const;

export type AmbientTrackId = keyof typeof AMBIENT_TRACKS;

/** One-shot sound effects. */
export const SFX_TRACKS = {
  ui: "/audio/sfx-ui.wav",
  portal: "/audio/sfx-portal.wav",
  core: "/audio/sfx-core.wav",
  quest: "/audio/sfx-quest.wav",
  achievement: "/audio/sfx-achievement.wav",
  hit: "/audio/sfx-hit.wav",
  alert: "/audio/sfx-alert.wav",
  victory: "/audio/sfx-victory.wav",
} as const;

export type SfxId = keyof typeof SFX_TRACKS;
