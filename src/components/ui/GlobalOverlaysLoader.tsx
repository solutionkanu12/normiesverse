"use client";

/**
 * Client-only loader for GlobalOverlays. `next/dynamic` with `ssr: false`
 * can't be called from a Server Component (app/layout.tsx), so this thin
 * client wrapper does it instead.
 */
import dynamic from "next/dynamic";

const GlobalOverlays = dynamic(() => import("./GlobalOverlays"), { ssr: false });

export default GlobalOverlays;
