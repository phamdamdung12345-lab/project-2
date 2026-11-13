import { useEffect, useRef, useState, useCallback } from 'react';
import { mountFantasyEngine, EngineController, RealmId } from './world/engine';
import { ZoneId } from './world/terrainMath';
import { ExplorationHUD } from './components/ExplorationHUD';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<EngineController | null>(null);

  const initialAutoStart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<'title' | 'playing'>(
    initialAutoStart ? 'playing' : 'title',
  );
  const [realm, setRealm] = useState<RealmId>('overworld');
  const [currentZone, setCurrentZone] = useState<ZoneId>('sanctuary');
  const [activeBannerZone, setActiveBannerZone] = useState<ZoneId | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [nearBonfire, setNearBonfire] = useState(false);
  const [nearGate, setNearGate] = useState(false);
  const [nearAstralPortal, setNearAstralPortal] = useState(false);
  const [portalLabel, setPortalLabel] = useState('');
  const [portalFadeOpacity, setPortalFadeOpacity] = useState(0);
  const [gateOpening, setGateOpening] = useState(false);
  const [gateOpened, setGateOpened] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [freeCam, setFreeCam] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [checkpointNotice, setCheckpointNotice] = useState<string | null>(null);

  const fadeOutTimerRef = useRef<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const checkpointTimerRef = useRef<number | null>(null);

  const triggerZoneBanner = useCallback((zone: ZoneId) => {
    if (fadeOutTimerRef.current) window.clearTimeout(fadeOutTimerRef.current);
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);

    setActiveBannerZone(zone);
    setBannerVisible(false);
    // Double rAF ensures opacity-0 -> opacity-100 CSS fade transition triggers cleanly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBannerVisible(true);
      });
    });

    // Hold for 3 seconds after fade-in, then fade gracefully
    fadeOutTimerRef.current = window.setTimeout(() => {
      setBannerVisible(false);
      clearTimerRef.current = window.setTimeout(() => {
        setActiveBannerZone(null);
      }, 750);
    }, 3400);
  }, []);

  const triggerCheckpointNotice = useCallback((name: string) => {
    if (checkpointTimerRef.current) window.clearTimeout(checkpointTimerRef.current);
    setCheckpointNotice(name);
    checkpointTimerRef.current = window.setTimeout(() => {
      setCheckpointNotice(null);
    }, 2600);
  }, []);

  // Sync dataset attributes for deterministic state inspection
  useEffect(() => {
    document.body.dataset.state = gameState;
    document.body.dataset.realm = realm;
    document.body.dataset.zone = currentZone;
    document.body.dataset.resting = isResting ? 'true' : 'false';
    document.body.dataset.freecam = freeCam ? 'true' : 'false';
    document.body.dataset.hud = hudHidden ? 'hidden' : 'visible';
    document.body.dataset.dead = isDead ? 'true' : 'false';
    document.body.dataset.neargate = nearGate ? 'true' : 'false';
    document.body.dataset.nearportal = nearAstralPortal ? 'true' : 'false';
    document.body.dataset.gateopening = gateOpening ? 'true' : 'false';
    document.body.dataset.gateopen = gateOpened ? 'true' : 'false';
  }, [
    gameState,
    realm,
    currentZone,
    isResting,
    freeCam,
    hudHidden,
    isDead,
    nearGate,
    nearAstralPortal,
    gateOpening,
    gateOpened,
  ]);

  // Mount Three.js engine once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = mountFantasyEngine(
      container,
      {
        onZoneEnter: (zone) => {
          setCurrentZone(zone);
          triggerZoneBanner(zone);
        },
        onDeathStateChange: (dead) => {
          setIsDead(dead);
        },
        onCheckpointLit: (name) => {
          triggerCheckpointNotice(name);
        },
        onPortalFadeChange: (opacity) => {
          setPortalFadeOpacity(opacity);
        },
        onPromptStateChange: (state) => {
          setRealm(state.realm);
          setNearBonfire(state.nearBonfire);
          setNearGate(state.nearGate);
          setNearAstralPortal(state.nearAstralPortal);
          setPortalLabel(state.portalLabel);
          setGateOpening(state.gateOpening);
          setGateOpened(state.gateOpened);
          setIsResting(state.isResting);
          setFreeCam(state.freeCam);
          setCurrentZone(state.zone);
        },
      },
      initialAutoStart,
    );

    engineRef.current = controller;

    return () => {
      if (fadeOutTimerRef.current) window.clearTimeout(fadeOutTimerRef.current);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      if (checkpointTimerRef.current) window.clearTimeout(checkpointTimerRef.current);
      controller.dispose();
      engineRef.current = null;
    };
  }, [initialAutoStart, triggerZoneBanner, triggerCheckpointNotice]);

  const handleStart = useCallback(() => {
    setGameState('playing');
    engineRef.current?.setPlaying(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Global keyboard shortcuts for Title Start (Enter/Space) and HUD Toggle (H)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStart();
        return;
      }
      if (gameState === 'playing' && e.code === 'KeyH') {
        setHudHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleStart]);

  const handleToggleFreeCam = useCallback(() => {
    engineRef.current?.toggleFreeCam();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const handleToggleHud = useCallback(() => {
    setHudHidden((prev) => !prev);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#120f0c]">
      <div ref={mountRef} className="w-full h-full" />
      <ExplorationHUD
        gameState={gameState}
        realm={realm}
        activeBannerZone={activeBannerZone}
        bannerVisible={bannerVisible}
        nearBonfire={nearBonfire}
        nearGate={nearGate}
        nearAstralPortal={nearAstralPortal}
        portalLabel={portalLabel}
        portalFadeOpacity={portalFadeOpacity}
        gateOpening={gateOpening}
        gateOpened={gateOpened}
        isResting={isResting}
        freeCam={freeCam}
        hudHidden={hudHidden}
        isDead={isDead}
        checkpointNotice={checkpointNotice}
        currentZone={currentZone}
        onStart={handleStart}
        onToggleHud={handleToggleHud}
        onToggleFreeCam={handleToggleFreeCam}
      />
    </main>
  );
}
