"use client";

/**
 * QuestMarker — pulsing wireframe beacons at remaining (unconsumed) objective
 * targets for active side/secret quests. Side-quest beacons use the world's
 * accent color; the secret "Canvas Echo" quest uses a distinct violet so it
 * reads as something hidden.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useQuestStore } from "@/store/useQuestStore";
import type { WorldKind } from "@/store/useWorldStore";
import type { Vec3 } from "@/systems/world/worldTypes";

interface QuestMarkerProps {
  worldKind: WorldKind;
  accent: string;
}

const SECRET_COLOR = "#b86bff";
const MAIN_OBJECTIVE_ID = "recover-core";

function Beacon({ position, color }: { position: Vec3; color: string }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = t * 1.4;
    g.position.y = position[1] + Math.sin(t * 2.4) * 0.3;
    g.scale.setScalar(0.85 + Math.sin(t * 3) * 0.15);
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <octahedronGeometry args={[0.6, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.85} />
      </mesh>
      <pointLight color={color} intensity={1.5} distance={14} />
    </group>
  );
}

export default function QuestMarker({ worldKind, accent }: QuestMarkerProps) {
  const quests = useQuestStore((s) => s.quests);

  return (
    <group name="quest-markers">
      {quests
        .filter((q) => q.worldKind === worldKind && q.status === "active")
        .flatMap((q) => {
          const color = q.kind === "secret" ? SECRET_COLOR : accent;
          return q.objectives.flatMap((o) => {
            if (o.id === MAIN_OBJECTIVE_ID || o.done) return [];
            return o.targets
              .map((target, i) => (o.consumedTargets.includes(i) ? null : { target, key: `${q.id}-${o.id}-${i}` }))
              .filter((v): v is { target: Vec3; key: string } => v !== null)
              .map(({ target, key }) => <Beacon key={key} position={target} color={color} />);
          });
        })}
    </group>
  );
}
