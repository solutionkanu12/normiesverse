import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — NormiesVerse",
  description: "How NormiesVerse collects, uses, and protects information.",
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen px-6 sm:px-16 py-24">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="font-hud text-xs tracking-[0.2em] text-[#4fc3f7] hover:text-white transition-colors"
        >
          ← Back to NormiesVerse
        </Link>

        <h1 className="font-display text-4xl text-white mt-6 mb-2">Privacy Policy</h1>
        <p className="font-hud text-xs tracking-[0.2em] text-[#8090b0] mb-12">
          LAST UPDATED: JUNE 11, 2026
        </p>

        <div className="flex flex-col gap-8 text-[#8090b0] text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-lg text-white mb-3">1. Overview</h2>
            <p>
              NormiesVerse (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the game&rdquo;) is a browser-based 3D
              experience built on top of the Normies NFT collection (Ethereum) and the $NORMIE token. This
              policy explains what information NormiesVerse interacts with when you connect a wallet and play,
              and how that information is used. NormiesVerse is designed to collect as little personal
              information as possible — most of what powers the game is public, on-chain data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">2. Information We Collect</h2>
            <ul className="list-disc list-outside pl-5 flex flex-col gap-2">
              <li>
                <strong className="text-white font-medium">Wallet address.</strong> When you connect a wallet,
                we read your public wallet address to check which Normies you hold and to identify your
                in-game progress on this device. We never request, see, or store private keys, seed phrases,
                or signed transactions.
              </li>
              <li>
                <strong className="text-white font-medium">On-chain Normie data.</strong> Trait data, pixel
                bitmaps, Canvas level/version history, and ownership records are fetched from the public
                Normies API (api.normies.art) and the Ethereum blockchain. This data is already public and is
                used to generate your avatar, world, quests, and lore.
              </li>
              <li>
                <strong className="text-white font-medium">Local game data.</strong> Progress, achievements,
                settings, and selected Normie are stored locally in your browser (e.g. local storage). This
                data stays on your device and is not transmitted to us.
              </li>
              <li>
                <strong className="text-white font-medium">Standard technical data.</strong> Like most
                websites, our hosting provider may log basic technical information (such as IP address,
                browser type, and request timestamps) for security and reliability purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">3. How We Use Information</h2>
            <ul className="list-disc list-outside pl-5 flex flex-col gap-2">
              <li>To show which Normies you own and let you choose one as your avatar.</li>
              <li>
                To generate your avatar, universe, quests, lore, and final boss from your Normie&apos;s
                on-chain traits, pixels, and Canvas history.
              </li>
              <li>To save your in-game progress on your device between sessions.</li>
              <li>To maintain, secure, and improve NormiesVerse.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">4. The $NORMIE Token</h2>
            <p>
              NormiesVerse may reference or integrate the $NORMIE token as part of the in-game economy.
              $NORMIE token balances and transactions occur entirely on-chain and are publicly visible on the
              Ethereum blockchain — we do not custody tokens, and any transfer of $NORMIE happens through your
              own wallet, under your own control. NormiesVerse never requests transaction signing on your
              behalf.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">5. Wallet Connections &amp; Security</h2>
            <p>
              Wallet access in NormiesVerse is read-only. We use it solely to identify your public address and
              query public on-chain data. We will never ask for your private keys or seed phrase, and we will
              never ask you to sign a transaction to play the game.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">6. Third-Party Services</h2>
            <ul className="list-disc list-outside pl-5 flex flex-col gap-2">
              <li>
                <strong className="text-white font-medium">Normies API</strong> (api.normies.art) — supplies
                public NFT trait, pixel, ownership, and history data used to build the game world.
              </li>
              <li>
                <strong className="text-white font-medium">Wallet providers</strong> (e.g. Phantom, MetaMask,
                WalletConnect, Coinbase Wallet) — handle the connection between your wallet and NormiesVerse.
                Their own privacy policies govern how they handle your data.
              </li>
              <li>
                <strong className="text-white font-medium">Hosting infrastructure</strong> — serves the game
                and may log standard technical request data as described above.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">7. Data Storage &amp; Retention</h2>
            <p>
              We do not operate a server-side database of personal information. Wallet addresses are used
              transiently, in your browser, to query public on-chain data. Game progress and settings are
              stored locally on your device using your browser&apos;s local storage and persist until you clear
              your browser data or disconnect/reset within the game.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">8. Cookies &amp; Local Storage</h2>
            <p>
              NormiesVerse uses local storage (not tracking cookies) to remember your selected Normie, game
              progress, and preferences such as audio settings. This data is stored only on your device.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">9. Children&apos;s Privacy</h2>
            <p>
              NormiesVerse is not directed at children under 13, and we do not knowingly collect personal
              information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy as NormiesVerse evolves. Material changes will be reflected by
              updating the &ldquo;Last updated&rdquo; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-white mb-3">11. Contact</h2>
            <p>
              Questions about this policy can be raised via{" "}
              <a
                href="https://github.com/solutionkanu12/normiesverse"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4fc3f7] hover:text-white transition-colors"
              >
                GitHub
              </a>{" "}
              or{" "}
              <a
                href="https://x.com/Normieverse_"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4fc3f7] hover:text-white transition-colors"
              >
                X (@Normieverse_)
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
