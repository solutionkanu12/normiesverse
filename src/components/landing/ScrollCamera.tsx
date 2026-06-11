"use client";

/**
 * ScrollCamera — cinematic camera path driven by page scroll position.
 *
 * Keyframes (position + lookAt target) mirror the camPath array in
 * normiesverse-landing.html exactly: a wide establishing shot drifts toward
 * the habitation ring, rises past the docking arms, climbs the spire, then
 * turns toward the distant portals as the page is scrolled.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface Keyframe {
  p: [number, number, number];
  l: [number, number, number];
}

const CAM_PATH: Keyframe[] = [
  { p: [0, 40, 240], l: [0, 90, 0] }, // wide establishing — feel small
  { p: [-90, 70, 150], l: [0, 100, 0] }, // drift toward ring
  { p: [60, 120, 90], l: [0, 120, -40] }, // rise past docking arms
  { p: [20, 160, 30], l: [0, 200, -80] }, // climb the spire
  { p: [-40, 220, -40], l: [120, 180, -300] }, // turn toward distant portals
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function samplePath(prog: number): Keyframe {
  const seg = prog * (CAM_PATH.length - 1);
  const i = Math.min(Math.floor(seg), CAM_PATH.length - 2);
  const f = seg - i;
  const a = CAM_PATH[i];
  const b = CAM_PATH[i + 1];
  return {
    p: [lerp(a.p[0], b.p[0], f), lerp(a.p[1], b.p[1], f), lerp(a.p[2], b.p[2], f)],
    l: [lerp(a.l[0], b.l[0], f), lerp(a.l[1], b.l[1], f), lerp(a.l[2], b.l[2], f)],
  };
}

export default function ScrollCamera() {
  const { camera } = useThree();
  const scrollY = useRef(0);
  const target = useRef(new THREE.Vector3(0, 90, 0));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const prog = Math.min(1, scrollY.current / maxScroll);
    const kf = samplePath(prog);

    // Smooth approach to keyframe + gentle idle drift.
    const driftX = Math.sin(t * 0.3) * 4;
    const driftY = Math.cos(t * 0.22) * 3;

    desiredPos.current.set(kf.p[0] + driftX, kf.p[1] + driftY, kf.p[2]);
    camera.position.lerp(desiredPos.current, 0.04);

    desiredTarget.current.set(kf.l[0], kf.l[1], kf.l[2]);
    target.current.lerp(desiredTarget.current, 0.04);

    camera.lookAt(target.current);
  });

  return null;
}
