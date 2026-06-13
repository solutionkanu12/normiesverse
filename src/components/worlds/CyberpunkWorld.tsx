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

/** Warm/cool office-window glow colors — small lit windows, not loud neon panels. */
const WINDOW_LIT = ["#ffd9a0", "#ffe3b3", "#bfe2ff", "#cfeaff", "#fff0cf"];

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
      if (roll > 0.72) {
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
  /** Window glow color for this building's lit windows. */
  litColor: string;
  /** Per-building texture seed (each tower owns its own window texture). */
  texSeed: number;
}

/* ------------------------------------------------------------------ *
 *  One skyscraper — a solid dark box with small emissive windows.
 *  Each building owns its own window texture (with the tiling baked in)
 *  so windows read as small ~2u squares, never giant shared panels.
 * ------------------------------------------------------------------ */

function BuildingTower({ t }: { t: Tower }) {
  const tex = useMemo(() => {
    const tx = makeWindowTexture(t.litColor, t.texSeed);
    // ~2–2.5 units per window (texture is a 6×12 window tile).
    if (tx) tx.repeat.set(Math.max(1, Math.round(t.w / 12)), Math.max(2, Math.round(t.h / 30)));
    return tx;
  }, [t.litColor, t.texSeed, t.w, t.h]);
  useEffect(() => () => tex?.dispose(), [tex]);

  return (
    <group position={[t.x, 0, t.z]}>
      {/* Solid dark facade with small lit windows */}
      <mesh position={[0, t.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t.w, t.h, t.d]} />
        <meshStandardMaterial
          color="#101015"
          metalness={0.3}
          roughness={0.78}
          map={tex ?? undefined}
          emissiveMap={tex ?? undefined}
          emissive="#ffffff"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Dark rooftop housing */}
      <mesh position={[0, t.h + 1.5, 0]}>
        <boxGeometry args={[t.w * 0.6, 3, t.d * 0.6]} />
        <meshStandardMaterial color="#0a0a0e" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Aircraft warning light on tall towers */}
      {t.h > 150 && (
        <mesh position={[0, t.h + 3.4, 0]}>
          <sphereGeometry args={[0.7, 8, 8]} />
          <meshBasicMaterial color="#ff2d2d" />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 *  Street lamps — tall posts with warm point lights so the player can
 *  see the road. Placed on a sparse grid, skipping building footprints.
 * ------------------------------------------------------------------ */

function StreetLamps({ extent, towers }: { extent: number; towers: Tower[] }) {
  const lamps = useMemo(() => {
    const out: [number, number][] = [];
    const n = 5;
    const reach = extent * 1.0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Offset into the streets between building lots.
        const x = (i / (n - 1) - 0.5) * 2 * reach + extent * 0.21;
        const z = (j / (n - 1) - 0.5) * 2 * reach + extent * 0.21;
        const insideTower = towers.some(
          (t) => Math.abs(x - t.x) < t.w / 2 + 2.5 && Math.abs(z - t.z) < t.d / 2 + 2.5,
        );
        if (!insideTower) out.push([x, z]);
      }
    }
    return out;
  }, [extent, towers]);

  return (
    <group name="street-lamps">
      {lamps.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* pole */}
          <mesh position={[0, 4.5, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 9, 8]} />
            <meshStandardMaterial color="#15161c" metalness={0.6} roughness={0.5} />
          </mesh>
          {/* lamp head (glows so the source is visible) */}
          <mesh position={[0, 9, 0]}>
            <boxGeometry args={[1.3, 0.5, 1.3]} />
            <meshStandardMaterial color="#0e0e12" emissive="#ffd9a0" emissiveIntensity={1.8} />
          </mesh>
          <pointLight position={[0, 8.6, 0]} color="#ffdca8" intensity={6} distance={55} decay={2} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 *  Road markings — yellow center lines + white lane edges down the
 *  streets between building rows, so the ground reads as real roads.
 * ------------------------------------------------------------------ */

function RoadMarkings({ extent }: { extent: number }) {
  const lot = extent * 0.42;
  const span = extent * 2.4;
  const centers = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5].map((k) => k * lot);

  const strip = (key: string, x: number, z: number, w: number, l: number, color: string) => (
    <mesh key={key} position={[x, 0, z]}>
      <planeGeometry args={[w, l]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );

  return (
    <group name="road-markings" position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {centers.flatMap((c, i) => [
        // Roads running along world Z (lines offset in local X)
        strip(`vc-${i}`, c, 0, 0.5, span, "#e3c04a"),
        strip(`vl-${i}`, c - 4, 0, 0.25, span, "#dcdcdc"),
        strip(`vr-${i}`, c + 4, 0, 0.25, span, "#dcdcdc"),
        // Roads running along world X (lines offset in local Y → world Z)
        strip(`hc-${i}`, 0, c, span, 0.5, "#e3c04a"),
        strip(`hl-${i}`, 0, c - 4, span, 0.25, "#dcdcdc"),
        strip(`hr-${i}`, 0, c + 4, span, 0.25, "#dcdcdc"),
      ])}
    </group>
  );
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

export default function CyberpunkWorld({ config }: { config: WorldConfig }) {
  const { palette, extent, density, seed } = config;

  // City blocks: a grid of lots with streets between them. Heights 50–200,
  // packed denser for denser Normies. The center-back lot is reserved for the
  // corporate megatower (built separately). Each tower gets a window color +
  // its own texture seed so its facade renders independently.
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
          litColor: WINDOW_LIT[Math.floor(rng() * WINDOW_LIT.length)],
          texSeed: Math.floor(rng() * 1e9),
        });
      }
    }
    return out;
  }, [seed, extent, density]);

  // Megatower window texture (its own instance, tiling baked in).
  const megaTex = useMemo(() => {
    const tx = makeWindowTexture("#cfe2ff", seed ^ 0x6a17e);
    if (tx) tx.repeat.set(4, 10);
    return tx;
  }, [seed]);
  useEffect(() => () => megaTex?.dispose(), [megaTex]);

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

  return (
    <group name="cyberpunk-world">
      {/* Near white/grey haze */}
      <CityFog near={40} far={extent * 2.1} />

      {/* Lighting — moody night, but bright enough to read the streets */}
      <ambientLight color={palette.ambient} intensity={0.9} />
      <directionalLight color={palette.key} intensity={1.0} position={[80, 200, -120]} castShadow />
      <hemisphereLight args={[palette.secondary, "#0a0a0e", 0.7]} />

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
      </RigidBody>

      {/* Road markings + street lamps so the ground reads + is lit */}
      <RoadMarkings extent={extent} />
      <StreetLamps extent={extent} towers={towers} />

      {/* Skyscrapers (solid dark boxes with small lit windows) */}
      {towers.map((t, i) => (
        <BuildingTower key={i} t={t} />
      ))}

      {/* Corporate megatower — the always-visible landmark (center-back) */}
      <group position={[0, 0, -extent * 1.25]}>
        <mesh position={[0, 150, 0]} castShadow>
          <boxGeometry args={[44, 300, 44]} />
          <meshStandardMaterial
            color="#0a0a0e"
            metalness={0.4}
            roughness={0.6}
            map={megaTex ?? undefined}
            emissiveMap={megaTex ?? undefined}
            emissive={"#ffffff"}
            emissiveIntensity={0.55}
          />
        </mesh>
        {/* Dark crown */}
        <mesh position={[0, 312, 0]}>
          <boxGeometry args={[20, 24, 20]} />
          <meshStandardMaterial color="#101018" metalness={0.7} roughness={0.35} emissive={palette.accent} emissiveIntensity={0.4} />
        </mesh>
        {/* Beacon spire */}
        <mesh position={[0, 336, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 24, 8]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
        <pointLight position={[0, 348, 0]} color={palette.accent} intensity={6} distance={400} />
        {/* Vertical light beam shooting up from the roof — visible from spawn */}
        <SkyBeam color={palette.accent} />
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
