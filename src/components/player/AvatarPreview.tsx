"use client";

/**
 * AvatarPreview — a self-contained R3F stage that renders the voxel avatar with
 * lighting, a procedural reflective environment, a grid floor, orbit controls,
 * and buttons to switch animation states. Used to verify Phase 4 output; the
 * full Nexus world arrives in Phase 6.
 *
 * Must be dynamically imported with ssr:false (Three.js is client-only).
 */
import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { AvatarAnimationState, AvatarBuild } from "@/systems/normie/avatar.types";
import NormieAvatar from "./NormieAvatar";
import { createGradientEquirect } from "./avatarTextures";

const STATES: AvatarAnimationState[] = ["idle", "walk", "run", "jump"];

/** Builds a procedural PMREM environment so metallic materials reflect. */
function ProceduralEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const equirect = createGradientEquirect();
    const rt = pmrem.fromEquirectangular(equirect);
    scene.environment = rt.texture;
    equirect.dispose();
    return () => {
      rt.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);

  return null;
}

function Stage({ build, animation }: { build: AvatarBuild; animation: AvatarAnimationState }) {
  return (
    <>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 6, 16]} />

      <ProceduralEnvironment />

      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#4fc3f7", "#0a1230", 0.45]} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />

      {/* Avatar */}
      <NormieAvatar build={build} animation={animation} />

      {/* Ground */}
      <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={6} blur={2.4} far={3} color="#000000" />
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={0.25}
        cellThickness={0.6}
        cellColor="#16335f"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#4fc3f7"
        fadeDistance={12}
        fadeStrength={1.5}
        infiniteGrid
        followCamera={false}
      />

      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={1.2}
        maxDistance={5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.05}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </>
  );
}

export default function AvatarPreview({ build }: { build: AvatarBuild }) {
  const [animation, setAnimation] = useState<AvatarAnimationState>("idle");

  return (
    <div className="relative w-full h-full">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0.2, 1.25, 2.6], fov: 42 }}>
        <Stage build={build} animation={animation} />
      </Canvas>

      {/* Animation-state controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-xl bg-black/50 backdrop-blur border border-white/10">
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setAnimation(s)}
            className={[
              "px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-hud transition-colors",
              animation === s ? "bg-[#4fc3f7] text-[#03040a]" : "text-white/55 hover:text-white",
            ].join(" ")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Hint */}
      <div className="absolute top-3 right-4 text-[10px] text-white/30 font-hud uppercase tracking-widest">
        drag to orbit · scroll to zoom
      </div>
    </div>
  );
}
