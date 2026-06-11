import Link from "next/link";

const SOCIAL_CLIP =
  "polygon(5px 0%,100% 0%,100% calc(100% - 5px),calc(100% - 5px) 100%,0% 100%,0% 5px)";

const SOCIAL_LINK_CLASS =
  "flex items-center justify-center w-9 h-9 border border-[#4fc3f7]/20 text-[#8090b0] hover:border-[#4fc3f7] hover:text-[#4fc3f7] hover:bg-[#4fc3f7]/[0.06] transition-colors";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#4fc3f7]/[0.08] px-6 sm:px-16 py-10 flex flex-wrap items-center justify-between gap-6">
      <span className="font-display text-base tracking-wide text-[#8090b0]">
        NORMIES<span className="text-[#4fc3f7]">VERSE</span>
      </span>

      <p className="font-hud text-[0.65rem] tracking-[0.15em] text-[#8090b0]/40 order-3 sm:order-none w-full sm:w-auto text-center sm:text-left">
        © 2026 NORMIESVERSE — BUILT ON NORMIES API
      </p>

      <div className="flex items-center gap-4">
        <Link
          href="/privacy"
          className="font-sans text-xs font-medium tracking-[0.08em] uppercase text-[#8090b0] hover:text-[#4fc3f7] transition-colors"
        >
          Privacy Policy
        </Link>
        <a
          href="https://github.com/solutionkanu12/normiesverse"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className={SOCIAL_LINK_CLASS}
          style={{ clipPath: SOCIAL_CLIP }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.61-.01 2.9-.01 3.3 0 .32.21.69.83.57A12.02 12.02 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
          </svg>
        </a>
        <a
          href="https://x.com/Normieverse_"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X"
          className={SOCIAL_LINK_CLASS}
          style={{ clipPath: SOCIAL_CLIP }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}
