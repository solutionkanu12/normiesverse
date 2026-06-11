/**
 * AudioManager — thin Howler wrapper handling ambient crossfades + one-shot
 * SFX. A single module-level instance is shared by AudioController and any
 * UI that wants to fire a click/feedback sound (MuteButton, PauseMenu, the
 * achievement toast, etc).
 *
 * Client-only: Howler touches `window`/`Audio` at construction time, so this
 * must never be imported from a server component.
 */
import { Howl, Howler } from "howler";
import { AMBIENT_TRACKS, SFX_TRACKS, type AmbientTrackId, type SfxId } from "./audioAssets";

const CROSSFADE_MS = 1400;
const AMBIENT_BASE_VOLUME = 0.35;
const SFX_BASE_VOLUME = 0.6;

class AudioManagerImpl {
  private ambientHowls = new Map<AmbientTrackId, Howl>();
  private sfxHowls = new Map<SfxId, Howl>();
  private currentAmbient: AmbientTrackId | null = null;
  private currentSoundId: number | null = null;
  private masterVolume = 0.7;

  private getAmbient(id: AmbientTrackId): Howl {
    let howl = this.ambientHowls.get(id);
    if (!howl) {
      howl = new Howl({ src: [AMBIENT_TRACKS[id]], loop: true, volume: 0 });
      this.ambientHowls.set(id, howl);
    }
    return howl;
  }

  private getSfx(id: SfxId): Howl {
    let howl = this.sfxHowls.get(id);
    if (!howl) {
      howl = new Howl({ src: [SFX_TRACKS[id]] });
      this.sfxHowls.set(id, howl);
    }
    return howl;
  }

  /** Apply master volume + mute to Howler globally and the live ambient bed. */
  setSettings(volume: number, muted: boolean) {
    this.masterVolume = volume;
    Howler.mute(muted);
    if (this.currentAmbient && this.currentSoundId != null) {
      this.getAmbient(this.currentAmbient).volume(AMBIENT_BASE_VOLUME * this.masterVolume, this.currentSoundId);
    }
  }

  /** Crossfade to a new ambient loop. Pass `null` to fade out to silence. No-op if unchanged. */
  playAmbient(id: AmbientTrackId | null) {
    if (id === this.currentAmbient) return;

    const prevId = this.currentAmbient;
    const prevSoundId = this.currentSoundId;
    if (prevId && prevSoundId != null) {
      const prevHowl = this.getAmbient(prevId);
      const from = prevHowl.volume(prevSoundId) as number;
      prevHowl.fade(from, 0, CROSSFADE_MS, prevSoundId);
      window.setTimeout(() => prevHowl.stop(prevSoundId), CROSSFADE_MS + 50);
    }

    if (id) {
      const howl = this.getAmbient(id);
      const soundId = howl.play();
      howl.volume(0, soundId);
      howl.fade(0, AMBIENT_BASE_VOLUME * this.masterVolume, CROSSFADE_MS, soundId);
      this.currentSoundId = soundId;
    } else {
      this.currentSoundId = null;
    }
    this.currentAmbient = id;
  }

  /** Fire a one-shot sound effect. `gain` is an extra multiplier (0..1+) for emphasis. */
  playSfx(id: SfxId, gain = 1) {
    const howl = this.getSfx(id);
    const soundId = howl.play();
    howl.volume(SFX_BASE_VOLUME * this.masterVolume * gain, soundId);
  }
}

export const AudioManager = new AudioManagerImpl();
