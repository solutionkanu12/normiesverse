"use client";

/**
 * PortalChamber — the great hall enclosing the plaza's portal ring.
 *
 * A colonnaded ring of hull panels at the portal radius is broken by three
 * monumental gate frames (one per portal, themed in that portal's color).
 * An outer colonnade of structural columns carries a trussed roof with a
 * central oculus open to the spire above. Together these turn the open
 * plaza disc into a real enclosed transit hall — the "giant portal chamber"
 * the player walks into and out of.
 *
 * Purely visual; the colonnade's colliders live alongside the plaza's other
 * colliders in NexusPlaza (see {@link chamberColumnPositions}).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { isPortalUnlocked } from "@/systems/quest/portalGate";
import {
  CHAMBER,
  HULL,
  NEXUS_COLORS,
  PORTALS,
  PORTAL_ANGLES_DEG,
  chamberColumnAngles,
  cssColor,
} from "./nexusConstants";

const DEG = Math.PI / 180;
const WALL_STEP_DEG = 15;
const WALL_PANEL_WIDTH = 22;
const LOCKED_COLOR = 0x4a505c;

/** Shortest angular distance (deg) between two angles given in degrees. */
function angleDiffDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

// ---------------------------------------------------------------------------
// Wall panels — every 15° around the portal ring, skipping the panels that
// would sit inside a gate opening.
// ---------------------------------------------------------------------------

function WallPanels() {
  const panels = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number }[] = [];
    for (let deg = 0; deg < 360; deg += WALL_STEP_DEG) {
      const nearGate = PORTAL_ANGLES_DEG.some(
        (g) => angleDiffDeg(deg, g) <= CHAMBER.gateHalfAngleDeg + WALL_STEP_DEG / 2,
      );
      if (nearGate) continue;
      const a = deg * DEG;
      out.push({
        pos: [Math.sin(a) * CHAMBER.wallRadius, CHAMBER.wallHeight / 2, Math.cos(a) * CHAMBER.wallRadius],
        rot: a,
      });
    }
    return out;
  }, []);

  return (
    <>
      {panels.map((p, i) => (
        <group key={`wall-panel-${i}`} position={p.pos} rotation={[0, p.rot, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[WALL_PANEL_WIDTH, CHAMBER.wallHeight, 2]} />
            <meshStandardMaterial {...HULL.panel} />
          </mesh>
          {/* Seam lights on both faces */}
          <mesh position={[0, 0, 1.05]}>
            <boxGeometry args={[0.5, CHAMBER.wallHeight * 0.85, 0.1]} />
            <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.35} />
          </mesh>
          <mesh position={[0, 0, -1.05]}>
            <boxGeometry args={[0.5, CHAMBER.wallHeight * 0.85, 0.1]} />
            <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.25} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Gate frames — one monumental archway per portal, set into the wall ring.
// ---------------------------------------------------------------------------

interface GateGeom {
  rot: number;
  pylon1: [number, number, number];
  pylon2: [number, number, number];
  lintelLen: number;
  lintelPos: [number, number, number];
  lightPos: [number, number, number];
  thresholdPos: [number, number, number];
}

function GateFrames() {
  const realityCores = usePlayerStore((s) => s.realityCores);

  const gates = useMemo<GateGeom[]>(() => {
    const r = CHAMBER.wallRadius;
    const delta = CHAMBER.gateHalfAngleDeg * DEG;
    return PORTAL_ANGLES_DEG.map((deg) => {
      const a = deg * DEG;
      const cosD = Math.cos(delta);
      return {
        rot: a,
        pylon1: [Math.sin(a - delta) * r, CHAMBER.gateHeight / 2, Math.cos(a - delta) * r],
        pylon2: [Math.sin(a + delta) * r, CHAMBER.gateHeight / 2, Math.cos(a + delta) * r],
        lintelLen: 2 * r * Math.sin(delta),
        lintelPos: [Math.sin(a) * r * cosD, CHAMBER.gateHeight, Math.cos(a) * r * cosD],
        lightPos: [Math.sin(a) * r * cosD, CHAMBER.gateHeight * 0.55, Math.cos(a) * r * cosD],
        thresholdPos: [Math.sin(a) * r * cosD, 0.05, Math.cos(a) * r * cosD],
      };
    });
  }, []);

  return (
    <>
      {gates.map((g, i) => {
        const def = PORTALS[i];
        const locked = !isPortalUnlocked(def.id, realityCores);
        const accent = cssColor(locked ? LOCKED_COLOR : def.color);

        return (
          <group key={`gate-${def.id}`} name={`gate-frame-${def.id}`}>
            {/* Pylons */}
            {[g.pylon1, g.pylon2].map((pos, j) => (
              <group key={j} position={pos} rotation={[0, g.rot, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[5, CHAMBER.gateHeight, 5]} />
                  <meshStandardMaterial {...HULL.mid} />
                </mesh>
                <mesh position={[1.7, 0, 0]}>
                  <boxGeometry args={[0.6, CHAMBER.gateHeight * 0.88, 0.3]} />
                  <meshBasicMaterial color={accent} transparent opacity={locked ? 0.4 : 0.85} />
                </mesh>
                <mesh position={[-1.7, 0, 0]}>
                  <boxGeometry args={[0.6, CHAMBER.gateHeight * 0.88, 0.3]} />
                  <meshBasicMaterial color={accent} transparent opacity={locked ? 0.4 : 0.85} />
                </mesh>
              </group>
            ))}

            {/* Lintel */}
            <mesh position={g.lintelPos} rotation={[0, g.rot, 0]} castShadow receiveShadow>
              <boxGeometry args={[g.lintelLen, 4, 5]} />
              <meshStandardMaterial {...HULL.mid} emissive={accent} emissiveIntensity={locked ? 0.08 : 0.2} />
            </mesh>

            {/* Floor threshold glow */}
            <mesh position={g.thresholdPos} rotation={[-Math.PI / 2, 0, g.rot]}>
              <planeGeometry args={[g.lintelLen * 0.85, 6]} />
              <meshBasicMaterial
                color={accent}
                transparent
                opacity={locked ? 0.08 : 0.18}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            <pointLight position={g.lightPos} color={accent} intensity={locked ? 0.6 : 2} distance={70} />
          </group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Roof trusses — 12 radial beams spanning the oculus to the colonnade.
// ---------------------------------------------------------------------------

function RoofTrusses() {
  const trusses = useMemo(() => {
    const mid = (CHAMBER.roofInnerRadius + CHAMBER.roofOuterRadius) / 2;
    const len = CHAMBER.roofOuterRadius - CHAMBER.roofInnerRadius;
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return {
        pos: [Math.sin(a) * mid, CHAMBER.roofY - 1, Math.cos(a) * mid] as [number, number, number],
        rot: a,
        len,
      };
    });
  }, []);

  return (
    <>
      {trusses.map((t, i) => (
        <mesh key={`truss-${i}`} position={t.pos} rotation={[0, t.rot, 0]}>
          <boxGeometry args={[2, 2, t.len]} />
          <meshStandardMaterial {...HULL.dark} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Roof — a paneled annulus with a central oculus open to the spire, plus
// glowing concentric seam rings.
// ---------------------------------------------------------------------------

function Roof() {
  return (
    <group name="chamber-roof">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, CHAMBER.roofY, 0]} receiveShadow>
        <ringGeometry args={[CHAMBER.roofInnerRadius, CHAMBER.roofOuterRadius, 64]} />
        <meshStandardMaterial {...HULL.mid} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, CHAMBER.roofY + 0.08, 0]}>
        <ringGeometry args={[74, 75.6, 64]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, CHAMBER.roofY + 0.08, 0]}>
        <ringGeometry args={[94, 95.6, 64]} />
        <meshBasicMaterial color={NEXUS_COLORS.gold} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Colonnade — 12 structural columns ringing the chamber, each capped with a
// pulsing beacon.
// ---------------------------------------------------------------------------

function Columns() {
  const angles = useMemo(() => chamberColumnAngles(), []);
  const beaconLights = useRef<(THREE.PointLight | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < beaconLights.current.length; i++) {
      const l = beaconLights.current[i];
      if (l) l.intensity = 1.1 + 0.6 * Math.sin(t * 1.8 + i * 0.7);
    }
  });

  const stripR = CHAMBER.columnRadius - CHAMBER.columnRadiusXZ - 0.6;

  return (
    <>
      {angles.map((a, i) => {
        const x = Math.sin(a) * CHAMBER.columnRadius;
        const z = Math.cos(a) * CHAMBER.columnRadius;
        return (
          <group key={`column-${i}`}>
            <mesh position={[x, CHAMBER.columnHeight / 2, z]} castShadow receiveShadow>
              <cylinderGeometry
                args={[CHAMBER.columnRadiusXZ, CHAMBER.columnRadiusXZ * 1.25, CHAMBER.columnHeight, 8]}
              />
              <meshStandardMaterial {...HULL.panel} />
            </mesh>
            {/* Inward-facing accent strip */}
            <mesh position={[Math.sin(a) * stripR, CHAMBER.columnHeight * 0.5, Math.cos(a) * stripR]}>
              <boxGeometry args={[0.5, CHAMBER.columnHeight * 0.8, 0.4]} />
              <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.35} />
            </mesh>
            {/* Beacon cap */}
            <mesh position={[x, CHAMBER.columnHeight + 1, z]}>
              <boxGeometry args={[1.4, 1.4, 1.4]} />
              <meshBasicMaterial color={NEXUS_COLORS.gold} />
            </mesh>
            <pointLight
              position={[x, CHAMBER.columnHeight + 1, z]}
              color={NEXUS_COLORS.gold}
              intensity={1.4}
              distance={50}
              ref={(l) => {
                beaconLights.current[i] = l;
              }}
            />
          </group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------

export default function PortalChamber() {
  return (
    <group name="portal-chamber">
      <WallPanels />
      <GateFrames />
      <RoofTrusses />
      <Roof />
      <Columns />
    </group>
  );
}
