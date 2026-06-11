"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// Three.js is client-only — load the Nexus background without SSR.
const LandingScene = dynamic(() => import("@/components/landing/LandingScene"), {
  ssr: false,
});

const PRIMARY_BTN_CLIP =
  "polygon(12px 0%,100% 0%,100% calc(100% - 12px),calc(100% - 12px) 100%,0% 100%,0% 12px)";

export default function HomePage() {
  return (
    <div className="relative">
      {/* ── Fixed 3D Nexus background ────────────────────────────────── */}
      <div className="fixed inset-0 -z-10">
        <LandingScene />
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-6 sm:px-16 py-6 bg-gradient-to-b from-[#03040a]/90 to-transparent">
        {/* <span className="font-display text-lg tracking-wide text-white">
          <img src="/logo.png" alt="NormiesVerse" className="h-8 w-8 mr-2" /><span>NORMIES<span className="text-[#4fc3f7]">VERSE</span></span>
        </span> */}
        <div className="flex items-center gap-6 sm:gap-10">
          <a
            href="#universe"
            className="hidden sm:inline font-sans text-xs font-medium tracking-[0.08em] uppercase text-[#8090b0] hover:text-white transition-colors"
          >
            Universe
          </a>
          <a
            href="#realities"
            className="hidden sm:inline font-sans text-xs font-medium tracking-[0.08em] uppercase text-[#8090b0] hover:text-white transition-colors"
          >
            Realities
          </a>
          <a
            href="#mission"
            className="hidden sm:inline font-sans text-xs font-medium tracking-[0.08em] uppercase text-[#8090b0] hover:text-white transition-colors"
          >
            Mission
          </a>
          <ConnectButton />
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative h-screen flex flex-col justify-center px-6 sm:px-16">
        <div className="absolute top-28 left-6 sm:left-16 hidden sm:block font-hud text-[0.6rem] tracking-[0.2em] text-[#4fc3f7]/30 leading-loose">
          NEXUS STATION — SECTOR 0
          <br />
          STATUS: ONLINE
          <br />
          REALITIES: 10,000 ACTIVE
        </div>

        <p className="font-hud text-xs tracking-[0.3em] text-[#4fc3f7] mb-6">
          NORMIES HACKATHON — SEASON I
        </p>
        <h1 className="font-display leading-[0.95] mb-6">
          <span className="block text-white text-[clamp(3rem,7vw,6.5rem)]">NORMIES</span>
          <span
            className="block text-transparent text-[clamp(3.5rem,8vw,7.5rem)]"
            style={{ WebkitTextStroke: "1px #4fc3f7" }}
          >
            VERSE
          </span>
        </h1>
        <p className="text-[#8090b0] text-base sm:text-lg leading-relaxed max-w-md mb-12 font-light">
          <strong className="text-white font-medium">10,000 Realities. One Connected Universe.</strong>
          <br />
          Explore worlds generated from real Normies NFTs. Travel through portals,
          uncover lost realities, and become a Reality Walker.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Link
            href="/select"
            className="font-display text-xs tracking-[0.12em] uppercase px-10 py-4 bg-[#4fc3f7] text-[#03040a] hover:bg-[#00e5ff] transition-colors"
            style={{ clipPath: PRIMARY_BTN_CLIP }}
          >
            Enter the Nexus
          </Link>
        </div>

        <div className="absolute bottom-10 right-6 sm:right-16 hidden sm:block font-hud text-[0.65rem] tracking-[0.15em] text-[#4fc3f7]/40 text-right leading-loose">
          CHAIN: ETHEREUM MAINNET
          <br />
          COLLECTION: 10,000 NORMIES
          <br />
          ENGINE: NORMIES API V4
          <br />
          BUILD: 0.1.0-MVP
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-12 bg-gradient-to-b from-[#4fc3f7] to-transparent animate-pulse" />
          <span className="font-hud text-[0.6rem] tracking-[0.3em] text-[#8090b0]">
            SCROLL TO EXPLORE
          </span>
        </div>
      </section>

      {/* ── Universe ─────────────────────────────────────────────────── */}
      <section id="universe" className="relative min-h-screen flex flex-col justify-center px-6 sm:px-16 py-24">
        <div className="max-w-2xl bg-[#03040a]/50 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none p-6 sm:p-0 -ml-6 sm:ml-0">
          <p className="font-hud text-xs tracking-[0.3em] text-[#4fc3f7] uppercase mb-5">
            Every NFT Is A Doorway
          </p>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-white mb-6">
            Every Normie Is
            <br />
            A Universe
          </h2>
          <p className="text-[#8090b0] text-base leading-relaxed max-w-xl">
            Each of the <strong className="text-white font-medium">10,000 Normies</strong> generates its own
            reality — unique environments, lore, quests, and enemies derived entirely from on-chain trait data
            and pixel bitmaps. No two adventures are the same.
          </p>
        </div>
      </section>

      {/* ── Realities ────────────────────────────────────────────────── */}
      <section id="realities" className="relative min-h-screen flex flex-col justify-center px-6 sm:px-16 py-24">
        <div className="max-w-2xl bg-[#03040a]/50 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none p-6 sm:p-0 -ml-6 sm:ml-0 mb-10">
          <p className="font-hud text-xs tracking-[0.3em] text-[#4fc3f7] uppercase mb-5">
            Three Known Realities
          </p>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-white mb-6">
            Choose Your Portal
          </h2>
          <p className="text-[#8090b0] text-base leading-relaxed max-w-xl">
            Every portal leads to a reality shaped by your Normie&apos;s DNA. The same portal, a different
            Normie — an entirely different world.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl">
          <WorldCard
            badge="DANGER"
            badgeColor="#ff6b35"
            type="PORTAL 01"
            name="Cyberpunk Megacity"
            desc="Neon-soaked streets. Faction wars. Human Normies rule here."
          />
          <WorldCard
            badge="HOSTILE"
            badgeColor="#4fc3f7"
            type="PORTAL 02"
            name="Frozen Planet"
            desc="Crystal tundra. Ancient silence. Cat Normies thrive in the cold."
          />
          <WorldCard
            badge="UNKNOWN"
            badgeColor="#00ff9d"
            type="PORTAL 03"
            name="Digital Void"
            desc="No ground. No sky. Alien Normies were born for this nothingness."
          />
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section id="mission" className="relative min-h-screen flex flex-col justify-center px-6 sm:px-16 py-24">
        <div className="max-w-2xl bg-[#03040a]/50 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none p-6 sm:p-0 -ml-6 sm:ml-0">
          <p className="font-hud text-xs tracking-[0.3em] text-[#4fc3f7] uppercase mb-5">
            Mission Briefing
          </p>
          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-white mb-10">
            Enter the
            <br />
            NormiesVerse
          </h2>
          <div className="flex flex-col gap-6">
            <MissionStep
              num="01"
              title="Connect Wallet"
              desc="Link your Phantom or WalletConnect. We detect your Normies automatically. Read-only. No signing."
            />
            <MissionStep
              num="02"
              title="Choose Your Normie"
              desc="Select from your collection — or explore any of the 10,000. Your Normie is your identity."
            />
            <MissionStep
              num="03"
              title="Enter the Nexus"
              desc="Your pixel data becomes a 3D avatar. The Nexus generates your universe from on-chain traits."
            />
            <MissionStep
              num="04"
              title="Save Reality"
              desc="Recover Reality Cores. Defeat the Null Normie. Your on-chain history becomes game lore."
            />
          </div>
          <div className="mt-10">
            <Link
              href="/select"
              className="inline-block font-display text-xs tracking-[0.12em] uppercase px-10 py-4 bg-[#4fc3f7] text-[#03040a] hover:bg-[#00e5ff] transition-colors"
              style={{ clipPath: PRIMARY_BTN_CLIP }}
            >
              Enter the Nexus →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorldCard({
  badge,
  badgeColor,
  type,
  name,
  desc,
}: {
  badge: string;
  badgeColor: string;
  type: string;
  name: string;
  desc: string;
}) {
  return (
    <div
      className="relative bg-[#080d1a]/80 border border-[#1a2040] p-5 backdrop-blur-sm"
      style={{
        clipPath:
          "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))",
      }}
    >
      <div
        className="absolute top-4 right-4 font-hud text-[0.6rem] tracking-[0.15em] px-3 py-1 border"
        style={{ color: badgeColor, borderColor: badgeColor }}
      >
        {badge}
      </div>
      <div className="font-hud text-[0.6rem] tracking-[0.3em] text-[#4fc3f7] mb-2">{type}</div>
      <div className="font-display text-lg text-white mb-2">{name}</div>
      <div className="text-sm text-[#8090b0] leading-relaxed">{desc}</div>
    </div>
  );
}

function MissionStep({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5 items-start">
      <div
        className="w-10 h-10 shrink-0 border border-[#4fc3f7] bg-[#03040a] flex items-center justify-center font-display text-sm text-[#4fc3f7]"
        style={{
          clipPath: "polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)",
        }}
      >
        {num}
      </div>
      <div>
        <div className="font-display text-base text-white mb-1 tracking-wide">{title}</div>
        <div className="text-sm text-[#8090b0] leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
