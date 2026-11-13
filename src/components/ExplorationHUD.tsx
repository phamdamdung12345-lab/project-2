import React from 'react';
import { ZoneId, ZONES } from '../world/terrainMath';
import { RealmId } from '../world/engine';

export interface ExplorationHUDProps {
  gameState: 'title' | 'playing';
  realm: RealmId;
  activeBannerZone: ZoneId | null;
  bannerVisible: boolean;
  nearBonfire: boolean;
  nearGate: boolean;
  nearAstralPortal: boolean;
  portalLabel: string;
  portalFadeOpacity: number;
  gateOpening: boolean;
  gateOpened: boolean;
  isResting: boolean;
  freeCam: boolean;
  hudHidden: boolean;
  isDead: boolean;
  checkpointNotice: string | null;
  currentZone: ZoneId;
  onStart: () => void;
  onToggleHud: () => void;
  onToggleFreeCam: () => void;
}

export const ExplorationHUD: React.FC<ExplorationHUDProps> = ({
  gameState,
  realm,
  activeBannerZone,
  bannerVisible,
  nearBonfire,
  nearGate,
  nearAstralPortal,
  portalLabel,
  portalFadeOpacity,
  gateOpening,
  gateOpened,
  isResting,
  freeCam,
  hudHidden,
  isDead,
  checkpointNotice,
  currentZone,
  onStart,
  onToggleHud,
  onToggleFreeCam,
}) => {
  const bannerInfo = activeBannerZone ? ZONES[activeBannerZone] : null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between">
      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <div className="fixed inset-0 flex flex-col items-center justify-between py-14 px-6 pointer-events-auto bg-[radial-gradient(circle_at_center,rgba(14,11,9,0.12)_0%,rgba(12,10,8,0.72)_100%)]">
          <div className="flex flex-col items-center text-center mt-4">
            <svg
              viewBox="0 0 120 32"
              className="w-24 h-7 mb-4 text-[#d4af6a]"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 16H48M72 16H110M60 4L66 16L60 28L54 16L60 4Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="60" cy="16" r="2.2" fill="currentColor" />
            </svg>
            <h1
              className="font-display text-4xl sm:text-6xl font-semibold tracking-[0.22em] text-[#f2e8d5] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]"
              style={{ textWrap: 'balance' }}
            >
              ASHEN SANCTUARY
            </h1>
            <div
              className="w-64 sm:w-96 h-px my-4"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(212,175,106,0.85), rgba(226,222,213,0.9), rgba(212,175,106,0.85), transparent)',
              }}
            />
            <p className="font-serif-body italic text-lg sm:text-xl tracking-wider text-[#d5c7b2] drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
              Zone I · Pilgrimage to the Citadel of Fallen Gold
            </p>
          </div>

          <div className="flex flex-col items-center gap-5 mb-2">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="font-display px-9 py-3.5 text-sm sm:text-base tracking-[0.24em] uppercase text-[#f5ebd6] bg-[#1b1510]/90 border border-[#c8a25a]/60 hover:border-[#e6c47e] hover:bg-[#2a2016]/95 transition-colors duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.65)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e6c47e]"
            >
              Enter Sanctuary
            </button>
            <p className="font-serif-body text-sm tracking-[0.1em] text-[#bfb29d] text-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              WASD Move · Shift Sprint · Space Jump · Ctrl Dodge-Roll · Drag Orbit · C Photo Cam
            </p>
          </div>
        </div>
      )}

      {/* 0.8s Celestial Portal Fade Curtain (0.4s out -> swap -> 0.4s in, no backdrop-filter) */}
      <div
        data-testid="portal-fade-overlay"
        aria-hidden={portalFadeOpacity === 0}
        style={{ opacity: portalFadeOpacity }}
        className="fixed inset-0 z-40 pointer-events-none transition-opacity duration-[400ms] ease-in-out bg-[radial-gradient(circle_at_center,#221c48_0%,#110e26_55%,#060511_100%)]"
      />

      {/* Classic Dark Souls "YOU DIED" Vignette & Crimson Serif Overlay */}
      <div
        data-testid="you-died-overlay"
        aria-hidden={!isDead}
        className={`fixed inset-0 z-30 flex items-center justify-center transition-opacity duration-500 ${
          isDead ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } bg-[radial-gradient(ellipse_at_center,rgba(12,4,4,0.58)_0%,rgba(4,2,2,0.94)_100%)]`}
      >
        <div className="w-full py-9 flex items-center justify-center bg-[linear-gradient(to_bottom,transparent,rgba(8,3,3,0.86)_24%,rgba(8,3,3,0.86)_76%,transparent)]">
          <p className="font-display text-4xl sm:text-6xl font-medium tracking-[0.34em] text-[#b82222] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] select-none">
            YOU DIED
          </p>
        </div>
      </div>

      {/* Elden Ring / Dark Souls 3-Second Area Discovery Banner */}
      {gameState === 'playing' && !isDead && bannerInfo && (
        <div
          data-testid="area-banner"
          className={`fixed inset-x-0 top-[18%] flex flex-col items-center text-center px-6 transition-opacity duration-700 ${
            bannerVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="px-10 py-4 bg-[radial-gradient(ellipse_at_center,rgba(10,8,7,0.58)_0%,rgba(10,8,7,0)_75%)]">
            <h2 className="font-display text-2xl sm:text-4xl font-normal tracking-[0.28em] text-[#efe5d2] drop-shadow-[0_3px_14px_rgba(0,0,0,0.95)]">
              {bannerInfo.title}
            </h2>
            <div
              className="w-72 sm:w-[28rem] h-[1px] mx-auto mt-3 mb-2"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(212,175,106,0.9), rgba(224,224,230,0.95), rgba(212,175,106,0.9), transparent)',
              }}
            />
            <p className="font-serif-body italic text-sm sm:text-base tracking-[0.18em] text-[#cbbda4] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {bannerInfo.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Top-Left Minimal Zone Indicator (hidden when HUD toggled off) */}
      {gameState === 'playing' && !hudHidden && !isDead && (
        <div className="p-5 flex items-start justify-between">
          <div
            className={`px-3.5 py-2 border ${
              realm === 'astral'
                ? 'bg-[#100e22]/78 border-[#9bb4ff]/35'
                : 'bg-[#120e0b]/75 border-[#c8a25a]/25'
            }`}
          >
            <span className="font-display text-xs tracking-[0.2em] text-[#dfd1b8]">
              {ZONES[currentZone].title}
            </span>
          </div>
          {freeCam && (
            <div className="px-3.5 py-2 bg-[#120e0b]/80 border border-[#d4af6a]/45">
              <span className="font-display text-xs tracking-[0.18em] text-[#e6c47e]">
                FREE-ROAM PHOTO CAMERA · WASD FLY · C EXIT
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Prompts & Minimal Control Guide Dock (no teleport buttons) */}
      {gameState === 'playing' && !isDead && (
        <div className="pb-5 px-4 flex flex-col items-center gap-2.5 mt-auto">
          {/* Subtle Checkpoint Updated Notice */}
          {!hudHidden && checkpointNotice && (
            <div
              data-testid="checkpoint-notice"
              className={`px-5 py-1.5 border ${
                realm === 'astral'
                  ? 'bg-[#100e22]/85 border-[#a8c2ff]/45'
                  : 'bg-[#120e0b]/80 border-[#d4af6a]/40'
              }`}
            >
              <span className="font-serif-body italic text-xs sm:text-sm tracking-[0.14em] text-[#e6c788]">
                {realm === 'astral' ? 'Grace Restored' : 'Bonfire Checkpoint Restored'} ·{' '}
                {checkpointNotice}
              </span>
            </div>
          )}

          {/* Contextual Bonfire / Grace Interact Prompt */}
          {!hudHidden && nearBonfire && !freeCam && (
            <div
              data-testid="bonfire-prompt"
              className={`px-5 py-2 border shadow-[0_4px_20px_rgba(0,0,0,0.65)] ${
                realm === 'astral'
                  ? 'bg-[#110f24]/88 border-[#a8c2ff]/55'
                  : 'bg-[#14100c]/85 border-[#d4af6a]/50'
              }`}
            >
              <span className="font-display text-xs sm:text-sm tracking-[0.18em] text-[#f2e4c9]">
                {realm === 'astral'
                  ? isResting
                    ? '[E] Rise from Grace'
                    : '[E] Rest at Grace'
                  : isResting
                    ? '[E] Rise from Bonfire'
                    : '[E] Rest at Bonfire'}
              </span>
            </div>
          )}

          {/* Contextual Sunken Catacomb Gate Prompt */}
          {!hudHidden && !nearBonfire && nearGate && !gateOpening && !gateOpened && !freeCam && (
            <div
              data-testid="gate-prompt"
              className="px-5 py-2 bg-[#14100c]/85 border border-[#d4af6a]/50 shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
            >
              <span className="font-display text-xs sm:text-sm tracking-[0.18em] text-[#f2e4c9]">
                [E] Open Sunken Gate
              </span>
            </div>
          )}

          {/* Contextual Astral Dimension Portal Prompt */}
          {!hudHidden &&
            !nearBonfire &&
            !(nearGate && !gateOpening && !gateOpened) &&
            nearAstralPortal &&
            portalLabel &&
            !freeCam && (
              <div
                data-testid="astral-portal-prompt"
                className="px-5 py-2 bg-[#110f24]/90 border border-[#a8c2ff]/60 shadow-[0_4px_22px_rgba(0,0,0,0.72)]"
              >
                <span className="font-display text-xs sm:text-sm tracking-[0.18em] text-[#eef2ff]">
                  {portalLabel}
                </span>
              </div>
            )}

          {/* Minimal Bottom Control Bar */}
          {!hudHidden ? (
            <div
              data-testid="bottom-hud"
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 px-4 py-2 bg-[#120e0b]/80 border border-[#c8a25a]/25 shadow-[0_6px_24px_rgba(0,0,0,0.6)]"
            >
              <span className="font-serif-body text-xs tracking-wide text-[#b5a790] whitespace-nowrap">
                WASD Move · Shift Sprint · Space Jump · Ctrl Roll · E Rest · Drag Orbit · Scroll Zoom
              </span>

              <div className="flex items-center gap-1.5 pl-2.5 border-l border-[#c8a25a]/20">
                <button
                  type="button"
                  onClick={onToggleFreeCam}
                  aria-label="Toggle Photo Camera"
                  className={`font-display px-2.5 py-1 text-[11px] tracking-[0.14em] border transition-colors cursor-pointer whitespace-nowrap ${
                    freeCam
                      ? 'text-[#14100c] bg-[#d4af6a] border-[#d4af6a]'
                      : 'text-[#d8cbb4] border-[#c8a25a]/30 hover:border-[#d4af6a]/70'
                  }`}
                >
                  [C] PHOTO CAM
                </button>
                <button
                  type="button"
                  onClick={onToggleHud}
                  aria-label="Hide HUD"
                  className="font-display px-2.5 py-1 text-[11px] tracking-[0.14em] text-[#b5a790] border border-[#c8a25a]/25 hover:text-[#efe3cc] hover:border-[#d4af6a]/60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  [H] HIDE HUD
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleHud}
              aria-label="Show HUD"
              className="pointer-events-auto font-display px-3 py-1 text-[10px] tracking-[0.18em] text-[#a89b84]/75 hover:text-[#efe3cc] bg-[#120e0b]/45 border border-[#c8a25a]/15 transition-colors cursor-pointer"
            >
              [H] SHOW HUD
            </button>
          )}
        </div>
      )}
    </div>
  );
};
