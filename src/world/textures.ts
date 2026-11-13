import * as THREE from 'three';

export interface MaterialTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

export interface WorldTextureBundle {
  mossyStone: MaterialTextureSet;
  flagstone: MaterialTextureSet;
  darkMarble: MaterialTextureSet;
  gildedRoof: MaterialTextureSet;
  cliffRock: MaterialTextureSet;
  bark: MaterialTextureSet;
  glowSprite: THREE.CanvasTexture;
  dispose: () => void;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates seamless tileable mossy ashlar stone brick maps (albedo + bump + roughness).
 */
function createMossyStoneSet(anisotropy: number, repeatX: number, repeatY: number): MaterialTextureSet {
  const size = 512;
  const rand = mulberry32(101);
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);

  // Mortar base
  aCtx.fillStyle = '#262420';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#1a1a1a';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e8e8e8';
  rCtx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;
  const gap = 5;

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (colW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const bx = col * colW + offset;
      const by = row * rowH;
      const tone = 92 + Math.floor((rand() - 0.5) * 34);
      const warm = Math.floor(rand() * 14);
      const r = tone + warm;
      const g = tone + Math.floor(warm * 0.7);
      const b = tone - 8;

      aCtx.fillStyle = `rgb(${r},${g},${b})`;
      aCtx.fillRect(bx + gap, by + gap, colW - gap * 2, rowH - gap * 2);

      // Subtle bevel highlight & lower shadow on each ashlar block
      aCtx.fillStyle = 'rgba(255, 232, 196, 0.14)';
      aCtx.fillRect(bx + gap, by + gap, colW - gap * 2, 4);
      aCtx.fillStyle = 'rgba(18, 14, 10, 0.28)';
      aCtx.fillRect(bx + gap, by + rowH - gap - 5, colW - gap * 2, 5);

      const bVal = 175 + Math.floor((rand() - 0.5) * 40);
      bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      bCtx.fillRect(bx + gap, by + gap, colW - gap * 2, rowH - gap * 2);

      const rVal = 185 + Math.floor((rand() - 0.5) * 45);
      rCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
      rCtx.fillRect(bx + gap, by + gap, colW - gap * 2, rowH - gap * 2);
    }
  }

  // Stone grain & pitting
  for (let i = 0; i < 3600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 1 + rand() * 4;
    const dark = rand() > 0.45;
    aCtx.fillStyle = dark ? 'rgba(20, 18, 15, 0.22)' : 'rgba(218, 200, 175, 0.14)';
    aCtx.fillRect(x, y, w, w * 0.8);
    bCtx.fillStyle = dark ? 'rgba(30, 30, 30, 0.28)' : 'rgba(240, 240, 240, 0.2)';
    bCtx.fillRect(x, y, w, w);
  }

  // Weathered moss patches clinging to mortar & lower crevices
  for (let i = 0; i < 140; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const rad = 6 + rand() * 22;
    const drawMoss = (ox: number, oy: number) => {
      const grad = aCtx.createRadialGradient(ox, oy, 1, ox, oy, rad);
      grad.addColorStop(0, 'rgba(62, 74, 42, 0.58)');
      grad.addColorStop(0.6, 'rgba(72, 82, 46, 0.28)');
      grad.addColorStop(1, 'rgba(62, 74, 42, 0)');
      aCtx.fillStyle = grad;
      aCtx.beginPath();
      aCtx.arc(ox, oy, rad, 0, Math.PI * 2);
      aCtx.fill();

      rCtx.fillStyle = 'rgba(240, 240, 240, 0.35)';
      rCtx.beginPath();
      rCtx.arc(ox, oy, rad * 0.8, 0, Math.PI * 2);
      rCtx.fill();
    };
    drawMoss(cx, cy);
    if (cx < rad) drawMoss(cx + size, cy);
    if (cx > size - rad) drawMoss(cx - size, cy);
    if (cy < rad) drawMoss(cx, cy + size);
    if (cy > size - rad) drawMoss(cx, cy - size);
  }

  return {
    map: configureTexture(albedoC, true, anisotropy, repeatX, repeatY),
    bumpMap: configureTexture(bumpC, false, anisotropy, repeatX, repeatY),
    roughnessMap: configureTexture(roughC, false, anisotropy, repeatX, repeatY),
  };
}

/**
 * Generates cracked sanctuary flagstone paving (albedo + bump + roughness).
 */
function createFlagstoneSet(anisotropy: number, repeatX: number, repeatY: number): MaterialTextureSet {
  const size = 512;
  const rand = mulberry32(202);
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);

  aCtx.fillStyle = '#23201c';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#181818';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#eaeaea';
  rCtx.fillRect(0, 0, size, size);

  const grid = 4;
  const tile = size / grid;
  const gap = 6;

  for (let gx = 0; gx < grid; gx++) {
    for (let gy = 0; gy < grid; gy++) {
      const px = gx * tile;
      const py = gy * tile;
      const base = 84 + Math.floor(rand() * 28);
      const r = base + 12;
      const g = base + 6;
      const b = base - 6;

      aCtx.fillStyle = `rgb(${r},${g},${b})`;
      aCtx.fillRect(px + gap, py + gap, tile - gap * 2, tile - gap * 2);

      // Worn stone center sheen
      const sheen = aCtx.createRadialGradient(
        px + tile * 0.5,
        py + tile * 0.5,
        8,
        px + tile * 0.5,
        py + tile * 0.5,
        tile * 0.55,
      );
      sheen.addColorStop(0, 'rgba(210, 190, 155, 0.14)');
      sheen.addColorStop(1, 'rgba(20, 18, 15, 0.22)');
      aCtx.fillStyle = sheen;
      aCtx.fillRect(px + gap, py + gap, tile - gap * 2, tile - gap * 2);

      const bv = 190 + Math.floor((rand() - 0.5) * 35);
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(px + gap, py + gap, tile - gap * 2, tile - gap * 2);

      const rv = 155 + Math.floor((rand() - 0.5) * 45);
      rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.fillRect(px + gap, py + gap, tile - gap * 2, tile - gap * 2);

      // Cracks across flagstones
      if (rand() > 0.35) {
        const sx = px + gap + rand() * (tile - gap * 2);
        const sy = py + gap + rand() * (tile - gap * 2);
        aCtx.strokeStyle = 'rgba(20, 18, 15, 0.72)';
        aCtx.lineWidth = 1.6;
        bCtx.strokeStyle = 'rgba(25, 25, 25, 0.85)';
        bCtx.lineWidth = 2.0;

        aCtx.beginPath();
        bCtx.beginPath();
        aCtx.moveTo(sx, sy);
        bCtx.moveTo(sx, sy);
        let cx = sx;
        let cy = sy;
        for (let s = 0; s < 4; s++) {
          cx += (rand() - 0.5) * 38;
          cy += (rand() - 0.5) * 38;
          aCtx.lineTo(cx, cy);
          bCtx.lineTo(cx, cy);
        }
        aCtx.stroke();
        bCtx.stroke();
      }
    }
  }

  // Mossy joints & dust speckles
  for (let i = 0; i < 2400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const sz = 1 + rand() * 3;
    aCtx.fillStyle =
      rand() > 0.82 ? 'rgba(78, 88, 52, 0.32)' : 'rgba(28, 24, 20, 0.2)';
    aCtx.fillRect(x, y, sz, sz);
  }

  return {
    map: configureTexture(albedoC, true, anisotropy, repeatX, repeatY),
    bumpMap: configureTexture(bumpC, false, anisotropy, repeatX, repeatY),
    roughnessMap: configureTexture(roughC, false, anisotropy, repeatX, repeatY),
  };
}

/**
 * Generates veined ancient dark marble for citadel trim, statues, and plinths.
 */
function createDarkMarbleSet(anisotropy: number, repeatX: number, repeatY: number): MaterialTextureSet {
  const size = 512;
  const rand = mulberry32(303);
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);

  aCtx.fillStyle = '#2d2b2e';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#b0b0b0';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#707070';
  rCtx.fillRect(0, 0, size, size);

  // Cloudy mineral patches
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 20 + rand() * 65;
    const grad = aCtx.createRadialGradient(x, y, 2, x, y, rad);
    const v = 35 + Math.floor(rand() * 30);
    grad.addColorStop(0, `rgba(${v + 8}, ${v + 4}, ${v}, 0.28)`);
    grad.addColorStop(1, 'rgba(40, 38, 42, 0)');
    aCtx.fillStyle = grad;
    aCtx.beginPath();
    aCtx.arc(x, y, rad, 0, Math.PI * 2);
    aCtx.fill();
  }

  // Subtle amber/pale mineral veins
  for (let v = 0; v < 26; v++) {
    let vx = rand() * size;
    let vy = rand() * size;
    const gold = rand() > 0.65;
    aCtx.strokeStyle = gold ? 'rgba(182, 148, 92, 0.25)' : 'rgba(165, 165, 175, 0.18)';
    aCtx.lineWidth = 0.8 + rand() * 1.8;
    bCtx.strokeStyle = 'rgba(145, 145, 145, 0.3)';
    bCtx.lineWidth = aCtx.lineWidth;
    aCtx.beginPath();
    bCtx.beginPath();
    aCtx.moveTo(vx, vy);
    bCtx.moveTo(vx, vy);
    for (let s = 0; s < 8; s++) {
      vx += (rand() - 0.3) * 48;
      vy += (rand() - 0.5) * 34;
      aCtx.lineTo(vx, vy);
      bCtx.lineTo(vx, vy);
    }
    aCtx.stroke();
    bCtx.stroke();
  }

  return {
    map: configureTexture(albedoC, true, anisotropy, repeatX, repeatY),
    bumpMap: configureTexture(bumpC, false, anisotropy, repeatX, repeatY),
    roughnessMap: configureTexture(roughC, false, anisotropy, repeatX, repeatY),
  };
}

/**
 * Generates weathered golden-gilt cathedral roof shingles inspired by Leyndell.
 */
function createGildedRoofSet(anisotropy: number, repeatX: number, repeatY: number): MaterialTextureSet {
  const size = 512;
  const rand = mulberry32(404);
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);

  aCtx.fillStyle = '#6f5425';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#8a8a8a';
  rCtx.fillRect(0, 0, size, size);

  const rows = 12;
  const cols = 10;
  const rh = size / rows;
  const cw = size / cols;

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + off;
      const y = r * rh;
      const shade = 0.8 + rand() * 0.35;
      const red = Math.min(235, Math.floor(178 * shade));
      const green = Math.min(195, Math.floor(134 * shade));
      const blue = Math.min(95, Math.floor(52 * shade));

      aCtx.fillStyle = `rgb(${red},${green},${blue})`;
      aCtx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      aCtx.fillStyle = 'rgba(255, 224, 140, 0.24)';
      aCtx.fillRect(x + 2, y + 2, cw - 4, 3);
      aCtx.fillStyle = 'rgba(38, 25, 10, 0.35)';
      aCtx.fillRect(x + 2, y + rh - 5, cw - 4, 3);

      const bv = Math.floor(150 + rand() * 75);
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(x + 2, y + 2, cw - 4, rh - 4);

      const rv = Math.floor(85 + rand() * 60);
      rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
    }
  }

  return {
    map: configureTexture(albedoC, true, anisotropy, repeatX, repeatY),
    bumpMap: configureTexture(bumpC, false, anisotropy, repeatX, repeatY),
    roughnessMap: configureTexture(roughC, false, anisotropy, repeatX, repeatY),
  };
}

/**
 * Generates craggy mottled cliff rock texture (avoiding artificial horizontal stripes).
 */
function createCliffRockSet(anisotropy: number, repeatX: number, repeatY: number): MaterialTextureSet {
  const size = 512;
  const rand = mulberry32(505);
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);

  aCtx.fillStyle = '#3b332b';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#dedede';
  rCtx.fillRect(0, 0, size, size);

  // Organic craggy rock facets & fractures
  for (let i = 0; i < 240; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 18 + rand() * 68;
    const h = 10 + rand() * 36;
    const shade = Math.floor((rand() - 0.5) * 34);
    aCtx.save();
    aCtx.translate(x, y);
    aCtx.rotate((rand() - 0.5) * 0.5);
    aCtx.fillStyle = `rgb(${58 + shade},${50 + shade},${42 + shade})`;
    aCtx.fillRect(-w / 2, -h / 2, w, h);
    aCtx.restore();

    const bv = 128 + shade * 2;
    bCtx.save();
    bCtx.translate(x, y);
    bCtx.rotate((rand() - 0.5) * 0.5);
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(-w / 2, -h / 2, w, h);
    bCtx.restore();
  }

  for (let i = 0; i < 2600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 2 + rand() * 7;
    const h = 2 + rand() * 5;
    aCtx.fillStyle = rand() > 0.5 ? 'rgba(20, 17, 13, 0.34)' : 'rgba(136, 118, 94, 0.16)';
    aCtx.fillRect(x, y, w, h);
    bCtx.fillStyle = rand() > 0.5 ? 'rgba(35,35,35,0.38)' : 'rgba(225,225,225,0.32)';
    bCtx.fillRect(x, y, w, h);
  }

  return {
    map: configureTexture(albedoC, true, anisotropy, repeatX, repeatY),
    bumpMap: configureTexture(bumpC, false, anisotropy, repeatX, repeatY),
    roughnessMap: configureTexture(roughC, false, anisotropy, repeatX, repeatY),
  };
}

/**
 * Generates furrowed gnarled tree bark.
 */
function createBarkSet(anisotropy: number): MaterialTextureSet {
  const size = 256;
  const rand = mulberry32(606);
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);

  aCtx.fillStyle = '#332820';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#686868';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e0e0e0';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 160; i++) {
    const x = rand() * size;
    const w = 2 + rand() * 5;
    aCtx.fillStyle = rand() > 0.45 ? 'rgba(24, 18, 14, 0.55)' : 'rgba(84, 68, 52, 0.35)';
    aCtx.fillRect(x, 0, w, size);
    bCtx.fillStyle = rand() > 0.45 ? 'rgba(30, 30, 30, 0.6)' : 'rgba(205, 205, 205, 0.45)';
    bCtx.fillRect(x, 0, w, size);
  }

  return {
    map: configureTexture(albedoC, true, anisotropy, 2, 3),
    bumpMap: configureTexture(bumpC, false, anisotropy, 2, 3),
    roughnessMap: configureTexture(roughC, false, anisotropy, 2, 3),
  };
}

function createGlowSprite(): THREE.CanvasTexture {
  const size = 128;
  const [c, ctx] = makeCanvas(size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 245, 210, 1)');
  grad.addColorStop(0.28, 'rgba(255, 175, 72, 0.85)');
  grad.addColorStop(0.65, 'rgba(210, 95, 25, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createWorldTextures(renderer: THREE.WebGLRenderer): WorldTextureBundle {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const mossyStone = createMossyStoneSet(anisotropy, 1.5, 1.5);
  const flagstone = createFlagstoneSet(anisotropy, 2, 2);
  const darkMarble = createDarkMarbleSet(anisotropy, 2, 2);
  const gildedRoof = createGildedRoofSet(anisotropy, 3, 2);
  const cliffRock = createCliffRockSet(anisotropy, 3, 3);
  const bark = createBarkSet(anisotropy);
  const glowSprite = createGlowSprite();

  const disposeSet = (set: MaterialTextureSet) => {
    set.map.dispose();
    set.bumpMap.dispose();
    set.roughnessMap.dispose();
  };

  return {
    mossyStone,
    flagstone,
    darkMarble,
    gildedRoof,
    cliffRock,
    bark,
    glowSprite,
    dispose: () => {
      disposeSet(mossyStone);
      disposeSet(flagstone);
      disposeSet(darkMarble);
      disposeSet(gildedRoof);
      disposeSet(cliffRock);
      disposeSet(bark);
      glowSprite.dispose();
    },
  };
}
