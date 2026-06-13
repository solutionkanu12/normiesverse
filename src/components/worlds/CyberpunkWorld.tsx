"use client";

/**
 * CyberpunkWorld — a Blade Runner / Cyberpunk 2077 megacity.
 *
 * All of it still derives from the Normie:
 *   - The city seed (block layout, heights, lit windows) is `config.seed`,
 *     a hash of the Normie's pixel bitmap.
 *   - Skyline packing + tower heights scale with the Normie's pixel `density`.
 *   - Neon accents are the Expression-derived palette accent/secondary.
 *   - The Accessory-driven architecture theme tweaks tower silhouettes.
 *
 * Physics: a single ground-plane collider (the streets). Towers are visual
 * obstacles you weave between, not colliders — keeps the city walkable.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { WorldConfig } from "@/systems/world/worldTypes";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { GroundCollider, HiddenCache } from "./WorldPrimitives";

const RAIN_COUNT = 2000;

/** A neon palette for storefronts / window glow — classic cyberpunk hues. */
const NEON = ["#ff2d95", "#04d9ff", "#fde047", "#a855f7", "#39ff14", "#ff5a00"];

/* ------------------------------------------------------------------ *
 *  Canvas-generated emissive window texture
 * ------------------------------------------------------------------ */

/**
 * Builds a small canvas of a building facade: a dark wall with a grid of
 * windows, some lit (in `litColor`), most dark. Returned as a tiling
 * CanvasTexture used as both `map` and `emissiveMap` so lit windows glow.
 */
function makeWindowTexture(litColor: string, seed: number): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const cols = 6;
  const rows = 12;
  const cell = 16;
  const pad = 4;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#05060d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rng = mulberry32(seed);
  const lit = new THREE.Color(litColor);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell + pad / 2;
      const y = r * cell + pad / 2;
      const w = cell - pad;
      const h = cell - pad;
      const roll = rng();
      if (roll > 0.62) {
        // lit window — vary brightness a touch
        const b = 0.55 + rng() * 0.45;
        ctx.fillStyle = `rgb(${Math.round(lit.r * 255 * b)},${Math.round(
          lit.g * 255 * b
        )},${Math.round(lit.b * 255 * b)})`;
      } else if (roll > 0.5) {
        ctx.fillStyle = "#14202e"; // dim, occupied
      } else {
        ctx.fillStyle = "#090b14"; // dark
      }
      ctx.fillRect(x, y, w, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ *
 *  Rain
 * ------------------------------------------------------------------ */

function Rain({ extent, color }: { extent: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 3);
    const rng = mulberry32(4242);
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * extent * 2.8;
      arr[i * 3 + 1] = rng() * 320;
      arr[i * 3 + 2] = (rng() - 0.5) * extent * 2.8;
    }
    return arr;
  }, [extent]);

  useFrame(() => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3 + 1] -= 2.4;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 320;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.55} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 *  Near white/grey volumetric haze via scene.fog
 * ------------------------------------------------------------------ */

function CityFog({ near, far }: { near: number; far: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prev = scene.fog;
    scene.fog = new THREE.Fog(new THREE.Color("#9aa4b2"), near, far);
    return () => {
      scene.fog = prev;
    };
  }, [scene, near, far]);
  return null;
}

/* ------------------------------------------------------------------ *
 *  City layout
 * ------------------------------------------------------------------ */

interface Tower {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  texIndex: number;
  emissive: string;
}

/**
 * Sky beam — a tall, thin emissive cylinder shooting straight up from the
 * megatower roof. Additive + pulsing so it reads as a column of light against
 * the night sky: the first thing the player sees at spawn and a natural "walk
 * toward me" beacon pointing to the landmark.
 */
function SkyBeam({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(s.clock.elapsedTime * 2) * 0.15;
  });
  return (
    <mesh ref={ref} position={[0, 560, 0]} frustumCulled={false}>
      <cylinderGeometry args={[2.5, 4.5, 520, 12, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Architecture theme → silhouette hints. */
function themeShape(architecture: string): { taper: number; cap: boolean } {
  switch (architecture) {
    case "Crowned Spires":
      return { taper: 0.5, cap: true };
    case "Mirror Glass":
      return { taper: 1, cap: false };
    case "Stacked Capsules":
      return { taper: 0.85, cap: true };
    case "Pagoda Decks":
      return { taper: 0.7, cap: true };
    case "Smokestacks":
      return { taper: 0.35, cap: false };
    default:
      return { taper: 0.9, cap: false };
  }
}

export default function CyberpunkWorld({ config }: { config: WorldConfig }) {
  const { palette, extent, density, seed } = config;
  const { taper, cap } = themeShape(config.architecture);

  // Four cached emissive window textures (lit in palette + neon hues).
  const windowTextures = useMemo(() => {
    const litColors = [palette.accent, palette.secondary, NEON[1], NEON[2]];
    return litColors.map((c, i) => makeWindowTexture(c, (seed ^ 0xa11ce) + i * 97));
  }, [palette.accent, palette.secondary, seed]);

  // City blocks: a grid of lots with streets between them. Heights 50–200,
  // packed denser for denser Normies. The center-back lot is reserved for the
  // corporate megatower (built separately).
  const towers = useMemo<Tower[]>(() => {
    const rng = mulberry32(seed ^ 0xc17e5);
    const cols = 7;
    const rows = 7;
    const lot = extent * 0.42; // block spacing
    const heightBias = 0.7 + density * 0.6; // denser Normie → taller skyline
    const out: Tower[] = [];

    for (let gz = 0; gz < rows; gz++) {
      for (let gx = 0; gx < cols; gx++) {
        // Skip the center-back lot (reserved for the megatower).
        if (gx === 3 && gz === 0) continue;
        // Punch a few empty lots for plazas / variety, but keep 20+ towers.
        if (rng() < 0.12) continue;

        const x = (gx - (cols - 1) / 2) * lot + (rng() - 0.5) * lot * 0.25;
        const z = (gz - (rows - 1) / 2) * lot + (rng() - 0.5) * lot * 0.25;
        const w = 14 + rng() * 14;
        const d = 14 + rng() * 14;
        const h = (50 + rng() * 150) * heightBias; // 50–200 (×bias)
        out.push({
          x,
          z,
          w,
          d,
          h: Math.min(h, 230),
          texIndex: Math.floor(rng() * windowTextures.length),
          emissive: NEON[Math.floor(rng() * NEON.length)],
        });
      }
    }
    return out;
  }, [seed, extent, density, windowTextures.length]);

  // Storefront neon signs at street level (colored point lights + glow boxes).
  const storefronts = useMemo(() => {
    const rng = mulberry32(seed ^ 0x5704e);
    return towers.slice(0, 26).map((t, i) => ({
      x: t.x + (rng() - 0.5) * t.w,
      z: t.z + t.d / 2 + 1.2,
      color: NEON[(i + Math.floor(rng() * NEON.length)) % NEON.length],
      h: 3 + rng() * 5,
    }));
  }, [towers, seed]);

  // Elevated highways: thick flat decks crossing the city at varied heights,
  // each carried by a row of support pylons down to the street so they read as
  // real infrastructure rather than slabs floating in mid-air.
  const highways = useMemo(() => {
    const rng = mulberry32(seed ^ 0x81687a);
    const out: {
      pos: [number, number, number];
      size: [number, number, number];
      horizontal: boolean;
      y: number;
      pylons: number[];
    }[] = [];
    const span = extent * 2.6;
    for (let i = 0; i < 5; i++) {
      const horizontal = i % 2 === 0;
      const offset = (rng() - 0.5) * extent * 1.4;
      const y = 28 + rng() * 60;
      const count = 5;
      // pylon offsets along the deck's long axis
      const pylons = Array.from({ length: count }, (_, k) => (k / (count - 1) - 0.5) * span * 0.9);
      out.push({
        pos: horizontal ? [0, y, offset] : [offset, y, 0],
        size: horizontal ? [span, 1.5, 9] : [9, 1.5, span],
        horizontal,
        y,
        pylons,
      });
    }
    return out;
  }, [seed, extent]);

  const megaWindowTex = windowTextures[0];

  return (
    <group name="cyberpunk-world">
      {/* Near white/grey haze */}
      <CityFog near={40} far={extent * 2.1} />

      {/* Lighting — moody, neon-lit night */}
      <ambientLight color={palette.ambient} intensity={0.6} />
      <directionalLight color={palette.key} intensity={0.9} position={[80, 200, -120]} castShadow />
      <hemisphereLight args={[palette.secondary, "#05060d", 0.5]} />

      {/* Dark asphalt street ground (wet city look) + solid collider */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[extent * 3.2, extent * 3.2]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} envMapIntensity={0.5} />
      </mesh>
      <GroundCollider extent={extent} />

      {/* ── Solid colliders: player + camera can't pass through structures ── */}
      <RigidBody type="fixed" colliders={false}>
        {/* Skyscrapers (skip any tower overlapping the spawn so the player isn't trapped) */}
        {towers.map((t, i) =>
          Math.abs(config.spawn[0] - t.x) < t.w / 2 + 2 && Math.abs(config.spawn[2] - t.z) < t.d / 2 + 2 ? null : (
            <CuboidCollider key={`tc-${i}`} args={[t.w / 2, t.h / 2, t.d / 2]} position={[t.x, t.h / 2, t.z]} />
          ),
        )}
        {/* Corporate megatower */}
        <CuboidCollider args={[22, 150, 22]} position={[0, 150, -extent * 1.25]} />
        {/* Elevated highway decks + their support pylons */}
        {highways.map((hw, i) => (
          <group key={`hwc-${i}`}>
            <CuboidCollider args={[hw.size[0] / 2, hw.size[1] / 2, hw.size[2] / 2]} position={hw.pos} />
            {hw.pylons.map((d, k) => (
              <CuboidCollider
                key={k}
                args={[1.25, hw.y / 2, 1.25]}
                position={hw.horizontal ? [d, hw.y / 2, hw.pos[2]] : [hw.pos[0], hw.y / 2, d]}
              />
            ))}
          </group>
        ))}
        {/* Storefront signs */}
        {storefronts.map((s, i) => (
          <CuboidCollider key={`sfc-${i}`} args={[2, 0.7, 0.15]} position={[s.x, s.h, s.z]} />
        ))}
      </RigidBody>

      {/* Skyscrapers (city blocks) */}
      {towers.map((t, i) => {
        const tex = windowTextures[t.texIndex] ?? null;
        if (tex) {
          tex.repeat.set(Math.max(1, Math.round(t.w / 8)), Math.max(2, Math.round(t.h / 14)));
        }
        return (
          <group key={i} position={[t.x, 0, t.z]}>
            <mesh position={[0, t.h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[t.w, t.h, t.d]} />
              <meshStandardMaterial
                color="#0c1018"
                metalness={0.75}
                roughness={0.4}
                map={tex ?? undefined}
                emissiveMap={tex ?? undefined}
                emissive={"#ffffff"}
                emissiveIntensity={0.9}
              />
            </mesh>
            {/* Neon edge strip up one corner */}
            <mesh position={[t.w / 2, t.h / 2, t.d / 2 + 0.05]}>
              <boxGeometry args={[0.4, t.h * 0.85, 0.4]} />
              <meshBasicMaterial color={t.emissive} />
            </mesh>
            {/* Rooftop cap / antenna for themed silhouettes */}
            {cap && (
              <mesh position={[0, t.h + 3, 0]}>
                <boxGeometry args={[t.w * taper, 6, t.d * taper]} />
                <meshStandardMaterial color={palette.secondary} metalness={0.85} roughness={0.3} emissive={palette.secondary} emissiveIntensity={0.25} />
              </mesh>
            )}
            {/* Aircraft warning light on tall towers */}
            {t.h > 150 && (
              <mesh position={[0, t.h + 1, 0]}>
                <sphereGeometry args={[0.8, 8, 8]} />
                <meshBasicMaterial color="#ff2d2d" />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Corporate megatower — the always-visible landmark (center-back) */}
      <group position={[0, 0, -extent * 1.25]}>
        <mesh position={[0, 150, 0]} castShadow>
          <boxGeometry args={[44, 300, 44]} />
          <meshStandardMaterial
            color="#0a0e18"
            metalness={0.85}
            roughness={0.3}
            map={(() => {
              if (megaWindowTex) megaWindowTex.repeat.set(5, 22);
              return megaWindowTex ?? undefined;
            })()}
            emissiveMap={megaWindowTex ?? undefined}
            emissive={"#ffffff"}
            emissiveIntensity={1.0}
          />
        </mesh>
        {/* Tapered crown */}
        <mesh position={[0, 312, 0]}>
          <boxGeometry args={[20, 24, 20]} />
          <meshStandardMaterial color={palette.accent} metalness={0.9} roughness={0.2} emissive={palette.accent} emissiveIntensity={0.6} />
        </mesh>
        {/* Beacon spire */}
        <mesh position={[0, 336, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 24, 8]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
        <pointLight position={[0, 348, 0]} color={palette.accent} intensity={6} distance={400} />
        {/* Vertical light beam shooting up from the roof — visible from spawn */}
        <SkyBeam color={palette.accent} />
        {/* Giant corporate hologram band */}
        <mesh position={[0, 220, 22.3]}>
          <planeGeometry args={[40, 80]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Elevated highways crossing between buildings, on support pylons */}
      {highways.map((hw, i) => (
        <group key={`hw-${i}`} position={hw.pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={hw.size} />
            <meshStandardMaterial color="#0e1320" metalness={0.7} roughness={0.5} emissive={palette.secondary} emissiveIntensity={0.06} />
          </mesh>
          {/* Glowing lane line running the length of the deck */}
          <mesh position={[0, hw.size[1] / 2 + 0.05, 0]}>
            <boxGeometry args={hw.horizontal ? [hw.size[0] * 0.98, 0.05, 0.5] : [0.5, 0.05, hw.size[2] * 0.98]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>
          {/* Support pylons down to the street */}
          {hw.pylons.map((d, k) => (
            <mesh key={k} position={hw.horizontal ? [d, -hw.y / 2, 0] : [0, -hw.y / 2, d]} castShadow>
              <boxGeometry args={[2.5, hw.y, 2.5]} />
              <meshStandardMaterial color="#0c1018" metalness={0.6} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Neon storefronts at street level */}
      {storefronts.map((s, i) => (
        <group key={`sf-${i}`} position={[s.x, 0, s.z]}>
          <mesh position={[0, s.h, 0]}>
            <boxGeometry args={[4, 1.4, 0.3]} />
            <meshBasicMaterial color={s.color} />
          </mesh>
          <pointLight position={[0, s.h, 1.5]} color={s.color} intensity={3.5} distance={26} decay={2} />
        </group>
      ))}

      {/* Rain */}
      <Rain extent={extent} color={palette.particle} />

      {/* Rising neon embers / smog motes */}
      <AmbientMotes
        radius={extent * 0.95}
        height={60}
        color={palette.accent}
        count={260}
        size={0.45}
        opacity={0.5}
        rise={1.4}
        seed={seed ^ 0x3eed1}
      />

      {/* Hidden cache (Canvas Level unlock) */}
      {config.hiddenAreaUnlocked && <HiddenCache position={config.hiddenAreaPosition} color={palette.accent} />}
    </group>
  );
}
