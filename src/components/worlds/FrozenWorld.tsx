"use client";

/**
 * FrozenWorld — an ancient frozen civilization buried under endless winter.
 *
 * A Skyrim / God of War inspired tundra: ringed by colossal mountains, split by
 * a frozen river, scattered with the ruins of a vanished people — toppled temple
 * pillars, crumbled walls, giant ice-locked statues — and crowned by one massive
 * Ancient Ice Temple glowing on the horizon.
 *
 * Derived from the Normie:
 *   - Crystal formations are placed from the pixel bitmap; sparse Normies give
 *     a bare tundra, dense ones a crystal forest (pixel density → packing).
 *   - Crystal height/scale scales with each block's fill weight.
 *   - The aurora + ice tint come from the cold, Expression-shifted palette.
 *   - Ruins / statues / caves are scattered deterministically from the seed.
 *
 * Physics: a solid ice ground plane. Everything else is a visual landmark.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { WorldConfig } from "@/systems/world/worldTypes";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { GroundCollider, HiddenCache } from "./WorldPrimitives";

const SNOW_COUNT = 1200;
const BLIZZARD_COUNT = 3000;

function Snow({ extent, color }: { extent: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(SNOW_COUNT * 3);
    const rng = mulberry32(909);
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * extent * 2.4;
      arr[i * 3 + 1] = rng() * 70;
      arr[i * 3 + 2] = (rng() - 0.5) * extent * 2.4;
    }
    return arr;
  }, [extent]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3 + 1] -= 0.18;
      arr[i * 3] += Math.sin(t + i) * 0.01; // drift
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 70;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.6} transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

/**
 * Blizzard — 3000 wind-driven snow particles. Each falls while drifting
 * sideways with its own per-particle horizontal velocity, wrapping around the
 * world bounds so the storm never thins out.
 */
function Blizzard({ extent }: { extent: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, drift } = useMemo(() => {
    const positions = new Float32Array(BLIZZARD_COUNT * 3);
    const drift = new Float32Array(BLIZZARD_COUNT);
    const rng = mulberry32(0xb112a4d);
    const span = extent * 2.8;
    for (let i = 0; i < BLIZZARD_COUNT; i++) {
      positions[i * 3] = (rng() - 0.5) * span;
      positions[i * 3 + 1] = rng() * 90;
      positions[i * 3 + 2] = (rng() - 0.5) * span;
      drift[i] = 0.15 + rng() * 0.35; // sideways wind speed
    }
    return { positions, drift };
  }, [extent]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const limit = extent * 1.4;
    const gust = 1 + 0.6 * Math.sin(t * 0.4);
    for (let i = 0; i < BLIZZARD_COUNT; i++) {
      arr[i * 3 + 1] -= 0.32;
      arr[i * 3] += drift[i] * gust;
      arr[i * 3 + 2] += Math.sin(t * 0.5 + i) * 0.03;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 90;
      if (arr[i * 3] > limit) arr[i * 3] = -limit;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#f4fbff" size={0.45} transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

/** Light blue / white atmospheric fog hugging the frozen plain. */
function FrostFog({ near, far }: { near: number; far: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const prev = scene.fog;
    scene.fog = new THREE.Fog(new THREE.Color("#cfe6f5"), near, far);
    return () => {
      scene.fog = prev;
    };
  }, [scene, near, far]);
  return null;
}

/** Aurora — drifting emissive ribbons high in the deep-navy sky. */
function Aurora({ color, extent }: { color: string; extent: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const ribbons = useMemo(
    () => Array.from({ length: 4 }, (_, i) => ({ y: 70 + i * 14, z: -extent - i * 30, phase: i * 1.4 })),
    [extent],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + 0.1 * Math.sin(t * 0.6 + ribbons[i].phase);
      m.position.x = Math.sin(t * 0.2 + ribbons[i].phase) * 30;
    });
  });
  return (
    <group name="aurora">
      {ribbons.map((r, i) => (
        <mesh
          key={i}
          position={[0, r.y, r.z]}
          rotation={[0, 0, Math.PI / 2]}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <planeGeometry args={[120, extent * 2.5, 1, 1]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** A ring of colossal snow-capped mountains at the world's horizon. */
function MountainRange({ extent, color }: { extent: number; color: string }) {
  const peaks = useMemo(() => {
    const rng = mulberry32(0x701a17);
    const n = 5 + Math.floor(rng() * 4); // 5–8 ranges
    return Array.from({ length: n }, () => {
      const ang = rng() * Math.PI * 2;
      const dist = extent * (1.25 + rng() * 0.25);
      const h = 80 + rng() * 70; // 80–150
      const r = h * (0.55 + rng() * 0.25);
      return {
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        h,
        r,
        rot: rng() * Math.PI,
      };
    });
  }, [extent]);

  return (
    <group name="mountains">
      {peaks.map((m, i) => (
        <group key={i} position={[m.x, 0, m.z]} rotation={[0, m.rot, 0]}>
          {/* mountain body */}
          <mesh position={[0, m.h / 2, 0]}>
            <coneGeometry args={[m.r, m.h, 7]} />
            <meshStandardMaterial color={color} roughness={0.95} metalness={0} flatShading />
          </mesh>
          {/* snow cap */}
          <mesh position={[0, m.h * 0.78, 0]}>
            <coneGeometry args={[m.r * 0.45, m.h * 0.45, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A wide, flat frozen river with bridges spanning it. */
function FrozenRiver({ extent, accent }: { extent: number; accent: string }) {
  const bridges = useMemo(() => {
    const rng = mulberry32(0x21fe3);
    return Array.from({ length: 3 }, () => (rng() - 0.5) * extent * 1.6);
  }, [extent]);

  return (
    <group name="frozen-river">
      {/* the river surface — flat, icy-blue, transparent */}
      <mesh position={[0, 0.2, extent * 0.45]} rotation={[0, 0, 0]}>
        <boxGeometry args={[extent * 2.6, 0.4, 22]} />
        <meshStandardMaterial
          color="#9fd6f0"
          transparent
          opacity={0.55}
          metalness={0.3}
          roughness={0.05}
          emissive={accent}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* frozen bridges spanning across the river */}
      {bridges.map((x, i) => (
        <group key={i} position={[x, 0, extent * 0.45]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <boxGeometry args={[7, 0.8, 30]} />
            <meshStandardMaterial color="#dbe9f2" roughness={0.4} metalness={0.15} />
          </mesh>
          {/* bridge rails */}
          {[-3, 3].map((rx) => (
            <mesh key={rx} position={[rx, 2.4, 0]}>
              <boxGeometry args={[0.4, 1.4, 30]} />
              <meshStandardMaterial color="#c2d6e3" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Ice caves — horizontal cylinders half-buried in snow mounds, dark within. */
function IceCaves({ extent }: { extent: number }) {
  const caves = useMemo(() => {
    const rng = mulberry32(0xcafe11);
    const n = 3 + Math.floor(rng() * 2); // 3–4 caves
    return Array.from({ length: n }, () => {
      const ang = rng() * Math.PI * 2;
      const dist = extent * (0.6 + rng() * 0.35);
      return {
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        r: 6 + rng() * 4,
        len: 14 + rng() * 10,
        rot: rng() * Math.PI * 2,
      };
    });
  }, [extent]);

  return (
    <group name="ice-caves">
      {caves.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.rot, 0]}>
          {/* snow mound shell */}
          <mesh position={[0, c.r * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[c.r, c.r, c.len, 14, 1, false]} />
            <meshStandardMaterial color="#e6f1f7" roughness={0.85} metalness={0.05} />
          </mesh>
          {/* dark inner cavity (smaller cylinder, open-ended) */}
          <mesh position={[0, c.r * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[c.r * 0.6, c.r * 0.6, c.len + 1, 14, 1, true]} />
            <meshStandardMaterial color="#0a1622" side={THREE.BackSide} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Ancient temple ruins: clustered toppled pillars + crumbled wall segments. */
function TempleRuins({ extent, accent }: { extent: number; accent: string }) {
  const sites = useMemo(() => {
    const rng = mulberry32(0x12e3a7);
    return Array.from({ length: 4 }, () => {
      const ang = rng() * Math.PI * 2;
      const dist = extent * (0.35 + rng() * 0.4);
      const cx = Math.cos(ang) * dist;
      const cz = Math.sin(ang) * dist;
      const pillars = Array.from({ length: 4 + Math.floor(rng() * 4) }, () => ({
        dx: (rng() - 0.5) * 18,
        dz: (rng() - 0.5) * 18,
        h: 6 + rng() * 12,
        r: 1 + rng() * 0.8,
        broken: rng() > 0.5,
      }));
      const walls = Array.from({ length: 3 + Math.floor(rng() * 3) }, () => ({
        dx: (rng() - 0.5) * 22,
        dz: (rng() - 0.5) * 22,
        w: 5 + rng() * 8,
        h: 2 + rng() * 5,
        rot: rng() * Math.PI,
      }));
      return { cx, cz, pillars, walls };
    });
  }, [extent]);

  return (
    <group name="temple-ruins">
      {sites.map((s, i) => (
        <group key={i} position={[s.cx, 0, s.cz]}>
          {s.pillars.map((p, j) => (
            <mesh key={`p${j}`} position={[p.dx, p.h / 2, p.dz]} castShadow>
              <cylinderGeometry args={[p.r, p.r * 1.15, p.h, 10]} />
              <meshStandardMaterial color="#b9c4cc" roughness={0.8} metalness={0.05} />
            </mesh>
          ))}
          {s.walls.map((w, j) => (
            <mesh
              key={`w${j}`}
              position={[w.dx, w.h / 2, w.dz]}
              rotation={[0, w.rot, 0]}
              castShadow
            >
              <boxGeometry args={[w.w, w.h, 1.4]} />
              <meshStandardMaterial
                color="#a8b4bd"
                roughness={0.85}
                emissive={accent}
                emissiveIntensity={0.04}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Giant frozen statues — stacked boxes suggesting ice-locked humanoid guardians. */
function FrozenStatues({ extent, accent }: { extent: number; accent: string }) {
  const statues = useMemo(() => {
    const rng = mulberry32(0x57a7e5);
    const n = 2 + Math.floor(rng() * 2); // 2–3 statues
    return Array.from({ length: n }, () => {
      const ang = rng() * Math.PI * 2;
      const dist = extent * (0.5 + rng() * 0.3);
      return {
        x: Math.cos(ang) * dist,
        z: Math.sin(ang) * dist,
        s: 2.4 + rng() * 1.2,
        rot: rng() * Math.PI * 2,
      };
    });
  }, [extent]);

  const mat = (
    <meshStandardMaterial
      color="#cfe2ee"
      roughness={0.25}
      metalness={0.2}
      transparent
      opacity={0.92}
      emissive={accent}
      emissiveIntensity={0.06}
    />
  );

  return (
    <group name="frozen-statues">
      {statues.map((st, i) => (
        <group key={i} position={[st.x, 0, st.z]} rotation={[0, st.rot, 0]} scale={st.s}>
          {/* pedestal */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[8, 2, 8]} />
            <meshStandardMaterial color="#9fb0bb" roughness={0.85} />
          </mesh>
          {/* legs */}
          <mesh position={[-1.5, 5, 0]}>
            <boxGeometry args={[2, 8, 2.4]} />
            {mat}
          </mesh>
          <mesh position={[1.5, 5, 0]}>
            <boxGeometry args={[2, 8, 2.4]} />
            {mat}
          </mesh>
          {/* torso */}
          <mesh position={[0, 11.5, 0]}>
            <boxGeometry args={[6, 7, 3]} />
            {mat}
          </mesh>
          {/* arms */}
          <mesh position={[-4.2, 11.5, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.8, 7, 1.8]} />
            {mat}
          </mesh>
          <mesh position={[4.2, 11.5, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[1.8, 7, 1.8]} />
            {mat}
          </mesh>
          {/* head */}
          <mesh position={[0, 16.5, 0]}>
            <boxGeometry args={[3, 3, 3]} />
            {mat}
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The Ancient Ice Temple — one massive landmark at center-back, always visible.
 * A stepped glacial ziggurat with a hollow, blue-glowing inner sanctum.
 */
function AncientIceTemple({ extent, accent }: { extent: number; accent: string }) {
  const glowRef = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    if (glowRef.current) glowRef.current.intensity = 5 + Math.sin(s.clock.elapsedTime * 1.2) * 1.5;
  });

  const z = -extent * 1.05;
  const tiers = [
    { w: 70, h: 16, y: 8 },
    { w: 52, h: 16, y: 24 },
    { w: 36, h: 16, y: 40 },
    { w: 22, h: 18, y: 57 },
  ];

  return (
    <group name="ancient-ice-temple" position={[0, 0, z]}>
      {tiers.map((t, i) => (
        <mesh key={i} position={[0, t.y, 0]} castShadow>
          <boxGeometry args={[t.w, t.h, t.w]} />
          <meshStandardMaterial
            color="#bcdcec"
            metalness={0.3}
            roughness={0.1}
            transparent
            opacity={0.88}
            emissive={accent}
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}

      {/* glowing inner sanctum — a bright emissive core block */}
      <mesh position={[0, 30, 0]}>
        <boxGeometry args={[14, 60, 14]} />
        <meshBasicMaterial color={accent} transparent opacity={0.9} />
      </mesh>

      {/* crowning spire */}
      <mesh position={[0, 80, 0]}>
        <coneGeometry args={[10, 30, 6]} />
        <meshStandardMaterial
          color="#d7eefb"
          metalness={0.4}
          roughness={0.05}
          emissive={accent}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* blue light emanating from inside */}
      <pointLight ref={glowRef} position={[0, 36, 0]} color={accent} intensity={5} distance={extent * 1.6} />
      <pointLight position={[0, 80, 0]} color="#4fc3f7" intensity={3} distance={120} />
    </group>
  );
}

/**
 * Temple aurora — 4 flat transparent curtains hovering directly above the
 * Ancient Ice Temple, their emissive color drifting between aurora green and
 * ice blue. Tall and bright against the deep-navy sky, it crowns the landmark
 * so the temple is the first thing a player sees and is drawn toward at spawn.
 */
const AURORA_GREEN = new THREE.Color("#00ff9d");
const AURORA_BLUE = new THREE.Color("#4fc3f7");

function TempleAurora({ extent }: { extent: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const ribbons = useMemo(
    () => Array.from({ length: 4 }, (_, i) => ({ y: 120 + i * 18, w: 110 - i * 12, phase: i * 1.1 })),
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      const k = 0.5 + 0.5 * Math.sin(t * 0.5 + ribbons[i].phase);
      mat.color.copy(AURORA_GREEN).lerp(AURORA_BLUE, k);
      mat.opacity = 0.22 + 0.18 * Math.sin(t * 0.8 + ribbons[i].phase);
      m.position.x = Math.sin(t * 0.3 + ribbons[i].phase) * 26;
    });
  });
  return (
    <group name="temple-aurora" position={[0, 0, -extent * 1.05]}>
      {ribbons.map((r, i) => (
        <mesh
          key={i}
          position={[0, r.y, 0]}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <planeGeometry args={[r.w, 50, 1, 1]} />
          <meshBasicMaterial
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function FrozenWorld({ config }: { config: WorldConfig }) {
  const { palette, placements, extent, density } = config;

  // Crystal formations from the bitmap. Each block → thin tall emissive shards.
  const crystals = useMemo(() => {
    const rng = mulberry32(config.seed ^ 0x1ce1ce);
    const heightScale = 0.8 + density * 1.2;
    return placements.map((p) => {
      const h = 4 + p.weight * 22 * heightScale + rng() * 4;
      const r = 1 + p.weight * 2.5;
      const tilt = (rng() - 0.5) * 0.4;
      const shards = 2 + Math.floor(rng() * 3);
      return { p, h, r, tilt, shards, rot: rng() * Math.PI };
    });
  }, [placements, config.seed, density]);

  return (
    <group name="frozen-world">
      {/* Cold lighting */}
      <ambientLight color={palette.ambient} intensity={1.3} />
      <directionalLight color={palette.key} intensity={1.8} position={[40, 100, -60]} castShadow />
      <hemisphereLight args={[palette.particle, palette.secondary, 0.6]} />

      {/* Light blue / white atmospheric fog */}
      <FrostFog near={30} far={extent * 2.6} />

      {/* Snowy ice ground: visible plane + solid collider */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[extent * 3, extent * 3]} />
        <meshStandardMaterial color="#e8f3fb" metalness={0.15} roughness={0.35} envMapIntensity={0.4} />
      </mesh>
      <GroundCollider extent={extent} />

      {/* Ancient frozen civilization */}
      <MountainRange extent={extent} color={palette.secondary} />
      <FrozenRiver extent={extent} accent={palette.accent} />
      <IceCaves extent={extent} />
      <TempleRuins extent={extent} accent={palette.accent} />
      <FrozenStatues extent={extent} accent={palette.accent} />
      <AncientIceTemple extent={extent} accent={palette.accent} />
      <TempleAurora extent={extent} />

      {/* Crystal formations (thin tall emissive shards from the bitmap) */}
      {crystals.map((c, i) => (
        <group key={i} position={[c.p.x, 0, c.p.z]} rotation={[c.tilt, c.rot, c.tilt]}>
          {Array.from({ length: c.shards }).map((_, s) => {
            const off = (s - (c.shards - 1) / 2) * c.r * 0.9;
            const sh = c.h * (0.6 + (s % 2) * 0.4);
            return (
              <mesh key={s} position={[off, sh / 2, off * 0.4]} castShadow>
                <boxGeometry args={[c.r * 0.6, sh, c.r * 0.6]} />
                <meshStandardMaterial
                  color={palette.primary}
                  metalness={0.1}
                  roughness={0.05}
                  transparent
                  opacity={0.8}
                  emissive={palette.accent}
                  emissiveIntensity={0.45}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Sky + weather */}
      <Aurora color={palette.accent} extent={extent} />
      <Snow extent={extent} color={palette.particle} />
      <Blizzard extent={extent} />

      {/* Drifting ice glints */}
      <AmbientMotes
        radius={extent * 0.9}
        height={28}
        color={palette.accent}
        count={200}
        size={0.3}
        opacity={0.6}
        rise={0.5}
        seed={config.seed ^ 0x1ce91}
      />

      {/* Hidden cache (Canvas Level unlock) */}
      {config.hiddenAreaUnlocked && <HiddenCache position={config.hiddenAreaPosition} color={palette.accent} />}
    </group>
  );
}
