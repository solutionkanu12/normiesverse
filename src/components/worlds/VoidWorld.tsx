"use client";

/**
 * VoidWorld — a corrupted, broken reality (Control / Tron / Interstellar).
 *
 * No ground. The player traverses floating island platforms suspended in a
 * near-black, purple-tinted void while the world itself comes apart: the
 * shattered remains of a great ring that once encircled the central tower
 * drift in a broken annulus, reality tears bleed light, gravity anomalies drag
 * wreckage into slow orbits, and two impossible Möbius monuments fold through
 * themselves beside the tower. A colossal Reality Fracture Tower spears the
 * dark at the center, visible from anywhere.
 *
 * Derived from the Normie (the core rule still holds):
 *   - Each playable platform's XZ position comes from an "on" block of the
 *     bitmap, so the archipelago is literally the Normie's silhouette.
 *   - Platform float heights are seeded deterministically from the pixel seed.
 *   - A guaranteed central spawn platform anchors the player at the origin.
 *   - All decorative chaos (ring fragments, tears, anomalies, monuments) is
 *     seeded from `config.seed`, so the same Normie shatters reality the same way.
 *
 * Physics: every PLAYABLE platform is a solid cuboid collider. Everything else
 * (fragments, tower, tears, anomalies, storm) is purely visual and
 * non-colliding. Gaps = the void; falling respawns the player.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { WorldConfig } from "@/systems/world/worldTypes";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { HiddenCache } from "./WorldPrimitives";
import { VOID_PLATFORM } from "./worldConstants";

const STORM_COUNT = 2000;
const PURPLE = "#a855f7";
const CYAN = "#22d3ee";
const WHITE = "#eef0ff";

// All playable platforms share one box + edges geometry (identical dimensions).
const PLATFORM_BOX = new THREE.BoxGeometry(
  VOID_PLATFORM.halfX * 2,
  VOID_PLATFORM.halfY * 2,
  VOID_PLATFORM.halfZ * 2,
);
const PLATFORM_EDGES = new THREE.EdgesGeometry(PLATFORM_BOX);

/**
 * Custom Möbius-strip geometry — a single-sided twisted ribbon used for the
 * "impossible geometry" structures that fold through themselves.
 */
function makeMobius(radius: number, width: number, seg = 140, wseg = 10): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const verts: number[] = [];
  const indices: number[] = [];
  const cols = wseg + 1;
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * Math.PI * 2;
    for (let j = 0; j <= wseg; j++) {
      const v = (j / wseg - 0.5) * width;
      const c = Math.cos(u / 2);
      const r = radius + v * c;
      verts.push(r * Math.cos(u), v * Math.sin(u / 2), r * Math.sin(u));
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < wseg; j++) {
      const a = i * cols + j;
      const b = a + cols;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geo.setIndex(indices);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Near-black, purple-tinted void enclosure + atmospheric haze sphere. */
function VoidBackground({ extent }: { extent: number }) {
  return (
    <>
      <mesh>
        <sphereGeometry args={[extent * 3, 24, 18]} />
        <meshBasicMaterial color="#070310" side={THREE.BackSide} />
      </mesh>
      {/* faint inner wireframe shell for depth */}
      <mesh>
        <sphereGeometry args={[extent * 2.3, 18, 12]} />
        <meshBasicMaterial color={PURPLE} wireframe transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

/** One playable floating platform: solid collider + wireframe-edged slab. */
function Platform({
  position,
  color,
  edge,
}: {
  position: [number, number, number];
  color: string;
  edge: string;
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh receiveShadow geometry={PLATFORM_BOX}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} emissive={edge} emissiveIntensity={0.12} />
      </mesh>
      <lineSegments geometry={PLATFORM_EDGES}>
        <lineBasicMaterial color={edge} transparent opacity={0.9} />
      </lineSegments>
    </RigidBody>
  );
}

/**
 * The Reality Fracture Tower — one colossal thin landmark spearing the void at
 * the center, 200 units tall, stacked from shrinking glowing blocks and capped
 * with an emissive shard. Always visible from anywhere in the world.
 */
function FractureTower() {
  const coreRef = useRef<THREE.PointLight>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  // Stack blocks from y≈10 up to ≈200 so the spawn platform below stays clear.
  const blocks = useMemo(() => {
    const rng = mulberry32(0xfac701);
    const out: { y: number; w: number; h: number; rot: number }[] = [];
    let y = 10;
    while (y < 200) {
      const h = 6 + rng() * 8;
      const w = 5.5 - (y / 200) * 3.5 + rng() * 1.2; // tapers toward the top
      out.push({ y: y + h / 2, w, h, rot: rng() * Math.PI });
      y += h + rng() * 1.5;
    }
    return out;
  }, []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (coreRef.current) coreRef.current.intensity = 6 + Math.sin(t * 2) * 2.5;
    if (beaconRef.current) {
      beaconRef.current.rotation.y = t * 0.4;
      (beaconRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t * 3) * 0.25;
    }
  });

  return (
    <group name="fracture-tower">
      {/* glowing inner spine running the full height */}
      <mesh position={[0, 105, 0]}>
        <boxGeometry args={[1.4, 200, 1.4]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.95} />
      </mesh>
      {/* stacked fractured blocks */}
      {blocks.map((b, i) => (
        <mesh key={i} position={[0, b.y, 0]} rotation={[0, b.rot, 0]} frustumCulled={false}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial
            color="#1a1230"
            metalness={0.4}
            roughness={0.3}
            emissive={i % 2 ? PURPLE : CYAN}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      {/* crowning shard */}
      <mesh ref={beaconRef} position={[0, 212, 0]} frustumCulled={false}>
        <octahedronGeometry args={[7, 0]} />
        <meshBasicMaterial color={PURPLE} transparent opacity={0.85} wireframe />
      </mesh>
      <pointLight ref={coreRef} position={[0, 120, 0]} color={PURPLE} intensity={6} distance={400} />
      <pointLight position={[0, 212, 0]} color={CYAN} intensity={4} distance={160} />
    </group>
  );
}

/**
 * Corruption waves — flat TorusGeometry rings that emanate from the Reality
 * Fracture Tower base, expanding outward and fading as they go. Staggered so a
 * wave is always pulsing at the world's center, drawing the eye (and the
 * player) toward the landmark from anywhere at spawn.
 */
function CorruptionWaves() {
  const N = 5;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.22 + i / N) % 1;
      const scale = 2 + phase * 70;
      m.scale.set(scale, scale, scale);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.6;
    });
  });
  return (
    <group name="corruption-waves" position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: N }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <torusGeometry args={[1, 0.05, 8, 64]} />
          <meshBasicMaterial
            color={i % 2 ? CYAN : PURPLE}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Broken architecture — the shattered remains of one great ring that once
 * encircled the Fracture Tower. Fragments sit in a broken annulus (with whole
 * arcs missing) at a consistent height band, each piece flung slightly in/out
 * and tilted radially, so the void reads as the wreckage of a single former
 * structure rather than a uniform scatter. Pieces drift-rotate slowly.
 */
function BrokenArchitecture({ seed, extent }: { seed: number; extent: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const fragments = useMemo(() => {
    const rng = mulberry32(seed ^ 0xb20be7);
    const SLOTS = 30;
    const ringR = extent * 0.5;
    const out: {
      x: number;
      y: number;
      z: number;
      size: [number, number, number];
      rot: [number, number, number];
      spin: number;
    }[] = [];
    for (let i = 0; i < SLOTS; i++) {
      if (rng() > 0.78) continue; // ~1 in 5 slots missing → a broken ring, not a clean one
      const a = (i / SLOTS) * Math.PI * 2 + (rng() - 0.5) * 0.15;
      const r = ringR + (rng() - 0.5) * extent * 0.18; // flung in/out from the ring line
      const wall = rng() > 0.5;
      out.push({
        x: Math.cos(a) * r,
        y: 6 + Math.sin(a * 3 + i) * 5 + rng() * 8, // low band, gently undulating
        z: Math.sin(a) * r,
        size: wall
          ? ([3 + rng() * 4, 8 + rng() * 14, 1 + rng() * 1.2] as [number, number, number]) // standing wall section
          : ([7 + rng() * 8, 1 + rng() * 1.2, 5 + rng() * 6] as [number, number, number]), // floor slab
        rot: [(rng() - 0.5) * 0.8, a + Math.PI / 2, (rng() - 0.5) * 0.9] as [number, number, number], // tilt radial to the ring
        spin: (rng() - 0.5) * 0.035,
      });
    }
    return out;
  }, [seed, extent]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.rotation.y += fragments[i].spin * dt * 8;
    });
  });

  return (
    <group ref={groupRef} name="broken-architecture">
      {fragments.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} rotation={f.rot}>
          <boxGeometry args={f.size} />
          <meshStandardMaterial
            color="#15102a"
            metalness={0.5}
            roughness={0.4}
            emissive={i % 3 === 0 ? CYAN : PURPLE}
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Reality tears — flat planes with bright emissive purple/white faces, scattered
 * and slowly flickering, as if the void itself is splitting open.
 */
function RealityTears({ seed, extent }: { seed: number; extent: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const tears = useMemo(() => {
    const rng = mulberry32(seed ^ 0x7ea12);
    return Array.from({ length: 7 }, () => {
      const ang = rng() * Math.PI * 2;
      const dist = extent * (0.4 + rng() * 1.1);
      return {
        x: Math.cos(ang) * dist,
        y: 5 + rng() * 55,
        z: Math.sin(ang) * dist,
        w: 4 + rng() * 10,
        h: 18 + rng() * 30,
        rot: [(rng() - 0.5) * 2, rng() * Math.PI * 2, (rng() - 0.5) * 1] as [number, number, number],
        phase: rng() * Math.PI * 2,
        cyan: rng() > 0.5,
      };
    });
  }, [seed, extent]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 2 + tears[i].phase) * 0.4;
    });
  });

  return (
    <group name="reality-tears">
      {tears.map((tear, i) => (
        <mesh
          key={i}
          position={[tear.x, tear.y, tear.z]}
          rotation={tear.rot}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <planeGeometry args={[tear.w, tear.h]} />
          <meshBasicMaterial
            color={tear.cyan ? CYAN : WHITE}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Data storm — 2000 purple/cyan particles swirling around the world axis. */
function DataStorm({ extent }: { extent: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(STORM_COUNT * 3);
    const rng = mulberry32(0x570217);
    for (let i = 0; i < STORM_COUNT; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = rng() * extent * 1.8;
      arr[i * 3] = Math.cos(ang) * rad;
      arr[i * 3 + 1] = (rng() - 0.5) * 130;
      arr[i * 3 + 2] = Math.sin(ang) * rad;
    }
    return arr;
  }, [extent]);

  useFrame((s, dt) => {
    const pts = ref.current;
    if (!pts) return;
    pts.rotation.y += dt * 0.08;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = s.clock.elapsedTime;
    for (let i = 0; i < STORM_COUNT; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.05;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={PURPLE}
        size={0.6}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/** Gravity anomaly zones — torus rings that spin and drag debris into orbit. */
function GravityAnomalies({ seed, extent }: { seed: number; extent: number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const zones = useMemo(() => {
    const rng = mulberry32(seed ^ 0x9a071c);
    return Array.from({ length: 3 }, () => {
      const ang = rng() * Math.PI * 2;
      const dist = extent * (0.5 + rng() * 0.7);
      const r = 8 + rng() * 8;
      const orbiters = Array.from({ length: 6 + Math.floor(rng() * 6) }, () => ({
        a: rng() * Math.PI * 2,
        rad: r * (0.6 + rng() * 0.5),
        s: 0.3 + rng() * 0.8,
        speed: 0.4 + rng() * 1.2,
      }));
      return {
        x: Math.cos(ang) * dist,
        y: 10 + rng() * 45,
        z: Math.sin(ang) * dist,
        r,
        rot: [(rng() - 0.5) * 1.5, rng() * Math.PI, (rng() - 0.5) * 1.5] as [number, number, number],
        spin: 0.2 + rng() * 0.4,
        orbiters,
        cyan: rng() > 0.5,
      };
    });
  }, [seed, extent]);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z += zones[i].spin * dt;
      // pull orbiters around the ring center
      g.children.forEach((c, j) => {
        const orb = zones[i].orbiters[j - 1]; // child 0 is the torus mesh
        if (!orb) return;
        const a = orb.a + t * orb.speed;
        c.position.set(Math.cos(a) * orb.rad, 0, Math.sin(a) * orb.rad);
      });
    });
  });

  return (
    <group name="gravity-anomalies">
      {zones.map((z, i) => (
        <group
          key={i}
          position={[z.x, z.y, z.z]}
          rotation={z.rot}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <mesh>
            <torusGeometry args={[z.r, 0.6, 12, 60]} />
            <meshStandardMaterial
              color="#0d0820"
              metalness={0.6}
              roughness={0.3}
              emissive={z.cyan ? CYAN : PURPLE}
              emissiveIntensity={0.7}
            />
          </mesh>
          {z.orbiters.map((o, j) => (
            <mesh key={j} scale={o.s}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={z.cyan ? CYAN : PURPLE} emissive={z.cyan ? CYAN : PURPLE} emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Impossible geometry — two large Möbius monuments (custom single-sided ribbon
 * geometry) folding through themselves, set deliberately at mid-height flanking
 * the Fracture Tower like sentinels rather than scattered to the horizon. They
 * tumble slowly; glitch flashes are driven on these from above.
 */
function ImpossibleStructures({
  seed,
  extent,
  flashRefs,
}: {
  seed: number;
  extent: number;
  flashRefs: React.MutableRefObject<(THREE.MeshStandardMaterial | null)[]>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const geos = useMemo(() => [makeMobius(9, 4, 160, 12), makeMobius(6, 3)], []);
  const structs = useMemo(() => {
    const rng = mulberry32(seed ^ 0x303b18);
    return Array.from({ length: 2 }, (_, i) => {
      const ang = (i / 2) * Math.PI * 2 + rng() * 0.6; // roughly opposite, flanking the tower
      const dist = extent * 0.32;
      return {
        x: Math.cos(ang) * dist,
        y: 34 + i * 24 + rng() * 8,
        z: Math.sin(ang) * dist,
        scale: 1.7 + rng() * 0.7,
        spin: [(rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3] as [number, number, number],
        geo: geos[i],
        cyan: i % 2 === 0,
      };
    });
  }, [seed, extent, geos]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.rotation.x += structs[i].spin[0] * dt;
      c.rotation.y += structs[i].spin[1] * dt;
      c.rotation.z += structs[i].spin[2] * dt;
    });
  });

  return (
    <group ref={groupRef} name="impossible-geometry">
      {structs.map((st, i) => (
        <mesh key={i} position={[st.x, st.y, st.z]} scale={st.scale} geometry={st.geo}>
          <meshStandardMaterial
            ref={(m) => {
              flashRefs.current[i] = m;
            }}
            color="#0e0820"
            side={THREE.DoubleSide}
            metalness={0.7}
            roughness={0.2}
            emissive={st.cyan ? CYAN : PURPLE}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Glitch driver — every so often slams the emissive intensity of a random
 * tracked material to a hot flash, then lets it relax, simulating reality
 * stuttering. Renders nothing itself.
 */
function GlitchDriver({ flashRefs }: { flashRefs: React.MutableRefObject<(THREE.MeshStandardMaterial | null)[]> }) {
  const next = useRef(0);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const mats = flashRefs.current;
    // relax everything toward its calm baseline
    for (const m of mats) {
      if (m) m.emissiveIntensity += (0.4 - m.emissiveIntensity) * 0.08;
    }
    if (t > next.current) {
      next.current = t + 0.15 + Math.random() * 0.9;
      const m = mats[Math.floor(Math.random() * mats.length)];
      if (m) m.emissiveIntensity = 2.5 + Math.random() * 2;
    }
  });
  return null;
}

export default function VoidWorld({ config }: { config: WorldConfig }) {
  const { palette, placements, extent, seed } = config;

  // Materials whose emissive intensity the glitch driver flashes.
  const flashRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  return (
    <group name="void-world">
      {/* Eerie minimal lighting — the structures self-illuminate */}
      <ambientLight color={palette.ambient} intensity={0.5} />
      <directionalLight color={palette.key} intensity={0.6} position={[20, 60, 20]} />
      <pointLight color={PURPLE} intensity={2.5} distance={80} position={[0, 25, 0]} />
      <pointLight color={CYAN} intensity={1.5} distance={60} position={[0, 5, 0]} />

      {/* Near-black, purple-tinted void */}
      <VoidBackground extent={extent} />

      {/* Central landmark — always visible */}
      <FractureTower />
      <CorruptionWaves />

      {/* Guaranteed central spawn platform */}
      <Platform position={[0, 0, 0]} color={palette.primary} edge={palette.accent} />

      {/* Bitmap-seeded playable floating platforms (the Normie's silhouette) */}
      {placements.map((p, i) => (
        <Platform key={i} position={[p.x, p.y, p.z]} color={palette.primary} edge={palette.accent} />
      ))}

      {/* Corrupted reality decor */}
      <BrokenArchitecture seed={seed} extent={extent} />
      <RealityTears seed={seed} extent={extent} />
      <GravityAnomalies seed={seed} extent={extent} />
      <ImpossibleStructures seed={seed} extent={extent} flashRefs={flashRefs} />
      <GlitchDriver flashRefs={flashRefs} />

      {/* Swirling data storm */}
      <DataStorm extent={extent} />

      {/* Drifting glitch sparks */}
      <AmbientMotes
        radius={extent * 0.85}
        height={50}
        color={palette.accent}
        count={260}
        size={0.35}
        opacity={0.5}
        rise={0.9}
        seed={seed ^ 0x20202}
      />

      {/* Hidden cache (Canvas Level unlock) — its own platform */}
      {config.hiddenAreaUnlocked && (
        <>
          <Platform position={config.hiddenAreaPosition} color={palette.primary} edge={palette.accent} />
          <HiddenCache
            position={[config.hiddenAreaPosition[0], config.hiddenAreaPosition[1] + 3, config.hiddenAreaPosition[2]]}
            color={palette.accent}
          />
        </>
      )}
    </group>
  );
}
