"use client";

/**
 * NexusBackground — everything in the void around the station:
 *   - 6000-star field
 *   - 3 layered, drifting atmospheric particle fields
 *   - 14 distant megastructure towers fading into fog
 *   - 3 large distant portals (orange, cyan, green) pulsing
 *   - 14 ships flying orbital paths with engine trails
 *   - floating debris + cinematic lighting
 *
 * All scale/behaviour mirrors normiesverse-landing.html. None of this has
 * physics colliders — it's distant set dressing.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NEXUS_COLORS, mulberry32 } from "./nexusConstants";

const TWO_PI = Math.PI * 2;

// ---------------------------------------------------------------------------
// Starfield (6000)
// ---------------------------------------------------------------------------

function Starfield() {
  const positions = useMemo(() => {
    const count = 3000;
    const arr = new Float32Array(count * 3);
    const rnd = mulberry32(1337);
    for (let i = 0; i < count; i++) {
      const r = 1200 + rnd() * 1800;
      const th = rnd() * TWO_PI;
      const ph = Math.acos(2 * rnd() - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = r * Math.cos(ph);
      arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={NEXUS_COLORS.star}
        size={1.6}
        sizeAttenuation={false}
        transparent
        opacity={0.7}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Atmospheric dust (3 drifting layers)
// ---------------------------------------------------------------------------

interface DustConfig {
  count: number;
  spread: number;
  size: number;
  color: number;
  opacity: number;
  speed: number;
  seed: number;
}

function DustLayer({ count, spread, size, color, opacity, speed, seed }: DustConfig) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const rnd = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd() - 0.5) * spread;
      arr[i * 3 + 1] = (rnd() - 0.5) * spread * 0.5 + 80;
      arr[i * 3 + 2] = (rnd() - 0.5) * spread;
    }
    return arr;
  }, [count, spread, seed]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += speed;
      if (arr[i * 3] > 900) arr[i * 3] = -900;
    }
    attr.needsUpdate = true;
    pts.rotation.y = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function AtmosphericDust() {
  return (
    <>
      <DustLayer count={450} spread={1400} size={2.2} color={NEXUS_COLORS.cyan} opacity={0.35} speed={0.03} seed={11} />
      <DustLayer count={350} spread={1000} size={3.5} color={0x2a4a7a} opacity={0.25} speed={0.045} seed={22} />
      <DustLayer count={250} spread={1800} size={1.4} color={NEXUS_COLORS.gold} opacity={0.18} speed={0.05} seed={33} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Distant towers (14) — three silhouette types: ring-habitat modules,
// solar-array stations, and derelict hull clusters with distress beacons.
// ---------------------------------------------------------------------------

function DistantTowers() {
  const beaconRefs = useRef<(THREE.PointLight | null)[]>([]);

  const towers = useMemo(() => {
    const rnd = mulberry32(7);
    return Array.from({ length: 8 }, (_, i) => {
      const a = rnd() * TWO_PI;
      const dist = 380 + rnd() * 520;
      const h = 80 + rnd() * 340;
      const w = 12 + rnd() * 40;
      const x = Math.cos(a) * dist;
      const z = Math.sin(a) * dist;
      const y = h / 2 - 60;
      return { x, y, z, w, h, dark: rnd() > 0.5, stripCyan: rnd() > 0.5, type: i % 3, jitter: rnd() };
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < beaconRefs.current.length; i++) {
      const l = beaconRefs.current[i];
      if (l) l.intensity = Math.max(0, Math.sin(t * 2 + i * 1.7)) * 2.5;
    }
  });

  return (
    <>
      {towers.map((t, i) => {
        const baseMat = {
          color: t.dark ? 0x0c1224 : 0x141d38,
          metalness: 0.88,
          roughness: 0.4,
          emissive: t.dark ? 0x05080f : 0x070c1a,
        };
        return (
          <group key={`tower-${i}`}>
            {/* main hull */}
            <mesh position={[t.x, t.y, t.z]}>
              <boxGeometry args={[t.w, t.h, t.w]} />
              <meshStandardMaterial {...baseMat} />
            </mesh>

            {t.type === 0 && (
              // Ring-habitat module — a station ring wrapped around the hull
              <mesh position={[t.x, t.y + t.h * 0.18, t.z]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[t.w * 0.95, t.w * 0.08, 8, 24]} />
                <meshBasicMaterial
                  color={t.stripCyan ? NEXUS_COLORS.cyan : NEXUS_COLORS.gold}
                  transparent
                  opacity={0.55}
                />
              </mesh>
            )}

            {t.type === 1 && (
              // Solar-array station — flat panels extending from the hull
              <>
                <mesh position={[t.x + t.w * 1.3, t.y, t.z]}>
                  <boxGeometry args={[t.w * 2.2, 0.4, t.w * 0.9]} />
                  <meshStandardMaterial
                    color={0x0a1228}
                    metalness={0.6}
                    roughness={0.5}
                    emissive={NEXUS_COLORS.cyan2}
                    emissiveIntensity={0.06}
                  />
                </mesh>
                <mesh position={[t.x - t.w * 1.3, t.y, t.z]}>
                  <boxGeometry args={[t.w * 2.2, 0.4, t.w * 0.9]} />
                  <meshStandardMaterial
                    color={0x0a1228}
                    metalness={0.6}
                    roughness={0.5}
                    emissive={NEXUS_COLORS.cyan2}
                    emissiveIntensity={0.06}
                  />
                </mesh>
              </>
            )}

            {t.type === 2 && (
              // Derelict hull cluster — a broken attachment + distress beacon
              <>
                <mesh
                  position={[t.x + t.w * 0.7, t.y - t.h * 0.2, t.z + t.w * 0.4]}
                  rotation={[0.3, t.jitter * TWO_PI, 0.15]}
                >
                  <boxGeometry args={[t.w * 0.6, t.h * 0.3, t.w * 0.6]} />
                  <meshStandardMaterial {...baseMat} />
                </mesh>
                <pointLight
                  position={[t.x, t.y + t.h / 2 + 4, t.z]}
                  color={0xff3344}
                  intensity={0}
                  distance={120}
                  ref={(l) => {
                    beaconRefs.current[i] = l;
                  }}
                />
              </>
            )}

            {/* vertical accent strip (intact towers only — derelicts stay dark) */}
            {t.type !== 2 && (
              <mesh position={[t.x, t.y, t.z + t.w / 2 + 0.3]}>
                <boxGeometry args={[t.w * 0.15, t.h * 0.7, 0.5]} />
                <meshBasicMaterial color={t.stripCyan ? NEXUS_COLORS.cyan : NEXUS_COLORS.gold} transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Distant portals (orange, cyan, green) — pulsing
// ---------------------------------------------------------------------------

interface PortalCfg {
  pos: [number, number, number];
  color: number;
  ring: number;
  scale: number;
}

const PORTAL_CFGS: PortalCfg[] = [
  { pos: [-560, 120, -300], color: 0xff6633, ring: 0xff9955, scale: 1.0 },
  { pos: [540, 200, -450], color: 0x4fc3f7, ring: 0x88ddff, scale: 1.3 },
  { pos: [120, -40, -650], color: 0x00ff9d, ring: 0x66ffcc, scale: 0.9 },
];

function BackgroundPortal({ cfg, index }: { cfg: PortalCfg; index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const fillMat = useRef<THREE.MeshBasicMaterial>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const s = cfg.scale * 70;

  // Orient the portal to face the station heart, once.
  const quat = useMemo(() => {
    const dummy = new THREE.Object3D();
    dummy.position.set(...cfg.pos);
    dummy.lookAt(0, 90, 0);
    return dummy.quaternion.clone();
  }, [cfg.pos]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pp = 0.6 + 0.4 * Math.sin(t * 1.4 + index * 2);
    if (ringMat.current) ringMat.current.opacity = 0.5 + pp * 0.4;
    if (fillMat.current) fillMat.current.opacity = 0.05 + pp * 0.08;
    if (haloMat.current) haloMat.current.opacity = 0.2 + pp * 0.2;
    if (groupRef.current) groupRef.current.rotation.z = t * (0.2 + index * 0.08);
  });

  return (
    <>
      <group ref={groupRef} position={cfg.pos} quaternion={quat}>
        <mesh>
          <torusGeometry args={[s, s * 0.06, 16, 64]} />
          <meshBasicMaterial ref={ringMat} color={cfg.ring} transparent opacity={0.85} />
        </mesh>
        <mesh>
          <circleGeometry args={[s * 0.93, 48]} />
          <meshBasicMaterial ref={fillMat} color={cfg.color} transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <torusGeometry args={[s * 1.12, s * 0.02, 8, 64]} />
          <meshBasicMaterial ref={haloMat} color={cfg.ring} transparent opacity={0.3} />
        </mesh>
      </group>
      <pointLight position={cfg.pos} color={cfg.color} intensity={2} distance={500} />
    </>
  );
}

function BackgroundPortals() {
  return (
    <>
      {PORTAL_CFGS.map((cfg, i) => (
        <BackgroundPortal key={`bg-portal-${i}`} cfg={cfg} index={i} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ship fleet (14, orbital paths + engine trails)
// ---------------------------------------------------------------------------

interface ShipData {
  angle: number;
  r: number;
  y: number;
  speed: number;
  wob: number;
  scale: number;
}

function ShipFleet() {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const trailMat = useRef<THREE.MeshBasicMaterial>(null);

  const ships: ShipData[] = useMemo(() => {
    const rnd = mulberry32(99);
    return Array.from({ length: 8 }, () => {
      const dir = rnd() > 0.5 ? 1 : -1;
      return {
        angle: rnd() * TWO_PI,
        r: 150 + rnd() * 260,
        y: 40 + rnd() * 180,
        speed: (0.0015 + rnd() * 0.0025) * dir,
        wob: rnd() * Math.PI,
        scale: 0.8 + rnd() * 1.6,
      };
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < ships.length; i++) {
      const s = ships[i];
      const g = groupRefs.current[i];
      if (!g) continue;
      s.angle += s.speed;
      const x = Math.cos(s.angle) * s.r;
      const z = Math.sin(s.angle) * s.r;
      const y = s.y + Math.sin(t * 0.8 + s.wob) * 20;
      g.position.set(x, y, z);
      g.rotation.y = -s.angle + (s.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    if (trailMat.current) trailMat.current.opacity = 0.3 + 0.2 * Math.sin(t * 6);
  });

  return (
    <>
      {ships.map((s, i) => (
        <group
          key={`ship-${i}`}
          scale={s.scale}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
        >
          {/* fuselage */}
          <mesh>
            <boxGeometry args={[3, 1.8, 13]} />
            <meshStandardMaterial color={0x1a2540} metalness={0.9} roughness={0.2} emissive={0x0a1424} />
          </mesh>
          {/* nose cone */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 9]}>
            <coneGeometry args={[1.6, 6, 6]} />
            <meshStandardMaterial color={0x1a2540} metalness={0.9} roughness={0.2} emissive={0x0a1424} />
          </mesh>
          {/* swept wings */}
          <mesh position={[5.5, -0.1, -1]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[9, 0.3, 4.5]} />
            <meshStandardMaterial color={0x141d38} metalness={0.85} roughness={0.3} emissive={0x070c1a} />
          </mesh>
          <mesh position={[-5.5, -0.1, -1]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[9, 0.3, 4.5]} />
            <meshStandardMaterial color={0x141d38} metalness={0.85} roughness={0.3} emissive={0x070c1a} />
          </mesh>
          {/* twin engine glow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, 0, -8]}>
            <coneGeometry args={[0.8, 9, 6]} />
            {i === 0 ? (
              <meshBasicMaterial ref={trailMat} color={NEXUS_COLORS.cyan} transparent opacity={0.4} />
            ) : (
              <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.4} />
            )}
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1, 0, -8]}>
            <coneGeometry args={[0.8, 9, 6]} />
            <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Floating debris
// ---------------------------------------------------------------------------

function Debris() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(() => {
    const rnd = mulberry32(555);
    return Array.from({ length: 20 }, () => {
      const sz = 1 + rnd() * 5;
      return {
        pos: [(rnd() - 0.5) * 700, (rnd() - 0.5) * 300 + 60, (rnd() - 0.5) * 700] as [number, number, number],
        rot: [rnd() * 6, rnd() * 6, rnd() * 6] as [number, number, number],
        size: [sz, sz * 0.7, sz * 0.5] as [number, number, number],
        rx: (rnd() - 0.5) * 0.004,
        ry: (rnd() - 0.5) * 0.006,
      };
    });
  }, []);

  useFrame(() => {
    for (let i = 0; i < items.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      m.rotation.x += items[i].rx;
      m.rotation.y += items[i].ry;
    }
  });

  return (
    <>
      {items.map((d, i) => (
        <mesh
          key={`debris-${i}`}
          position={d.pos}
          rotation={d.rot}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <boxGeometry args={d.size} />
          <meshStandardMaterial color={0x0a1020} metalness={0.7} roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lighting (cinematic)
// ---------------------------------------------------------------------------

function NexusLighting() {
  return (
    <>
      <ambientLight color={0x0a1228} intensity={1.4} />
      <directionalLight color={0x6fa8ff} intensity={2.2} position={[300, 400, 200]} />
      <directionalLight color={NEXUS_COLORS.cyan2} intensity={1.4} position={[-300, -100, 300]} />
      <directionalLight color={NEXUS_COLORS.gold} intensity={0.6} position={[-200, 300, -300]} />
    </>
  );
}

// ---------------------------------------------------------------------------

export default function NexusBackground() {
  return (
    <group name="nexus-background">
      <NexusLighting />
      <Starfield />
      <AtmosphericDust />
      <DistantTowers />
      <BackgroundPortals />
      <ShipFleet />
      <Debris />
    </group>
  );
}
