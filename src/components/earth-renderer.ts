const LAND_DEEP = [28, 92, 50];
const LAND_BRIGHT = [110, 192, 110];
const OCEAN_DEEP = [8, 28, 60];
const OCEAN_SHALLOW = [38, 130, 168];
const ICE = [232, 244, 250];

const TEX_W = 512;
const TEX_H = 256;

function noise3(x: number, y: number, z: number) {
  const a = Math.sin(x * 1.7 + y * 0.9 + z * 1.3);
  const b = Math.sin(x * 3.1 - y * 2.1 + z * 0.7);
  const c = Math.sin(x * 5.7 + y * 4.3 - z * 1.9);
  const d = Math.sin(x * 11 - y * 9 + z * 5);
  return (a + b * 0.55 + c * 0.32 + d * 0.18) / 2.05;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

let cachedTextureData: Uint8ClampedArray | null = null;

function getTextureData(): Uint8ClampedArray | null {
  if (cachedTextureData) return cachedTextureData;
  if (typeof Uint8ClampedArray === 'undefined') return null;

  const data = new Uint8ClampedArray(TEX_W * TEX_H * 4);
  for (let v = 0; v < TEX_H; v += 1) {
    const latAngle = (v / TEX_H) * Math.PI;
    const sinLat = Math.sin(latAngle);
    const y = -Math.cos(latAngle);
    const polePos = v / TEX_H;
    let iceFactor = 0;
    if (polePos < 0.1) iceFactor = (0.1 - polePos) / 0.1;
    else if (polePos > 0.9) iceFactor = (polePos - 0.9) / 0.1;
    iceFactor = clamp01(iceFactor);
    iceFactor *= iceFactor;

    for (let u = 0; u < TEX_W; u += 1) {
      const lonAngle = (u / TEX_W) * Math.PI * 2;
      const nx = Math.cos(lonAngle) * sinLat;
      const nz = Math.sin(lonAngle) * sinLat;
      const continent = noise3(nx * 1.5, y * 1.5, nz * 1.5);
      const elev = noise3(nx * 4.5, y * 4.5, nz * 4.5);
      const t = clamp01((elev + 1) * 0.5);
      let r: number;
      let g: number;
      let b: number;
      if (continent > 0.04) {
        r = lerp(LAND_DEEP[0], LAND_BRIGHT[0], t);
        g = lerp(LAND_DEEP[1], LAND_BRIGHT[1], t);
        b = lerp(LAND_DEEP[2], LAND_BRIGHT[2], t);
      } else {
        r = lerp(OCEAN_DEEP[0], OCEAN_SHALLOW[0], t);
        g = lerp(OCEAN_DEEP[1], OCEAN_SHALLOW[1], t);
        b = lerp(OCEAN_DEEP[2], OCEAN_SHALLOW[2], t);
      }

      if (iceFactor > 0) {
        r = lerp(r, ICE[0], iceFactor);
        g = lerp(g, ICE[1], iceFactor);
        b = lerp(b, ICE[2], iceFactor);
      }

      const idx = (v * TEX_W + u) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  cachedTextureData = data;
  return data;
}

export type EarthRenderer = {
  buffer: HTMLCanvasElement;
  size: number;
  redraw(rotation: number, brightnessBoost: number, greenShimmer: number): void;
};

const LAMB_SCALE = 0.85 / 255;
const SHIMMER_SCALE = 36 / 255;

export function createEarthRenderer(size: number): EarthRenderer | null {
  if (typeof document === 'undefined') return null;
  const textureData = getTextureData();
  if (!textureData) return null;

  const buffer = document.createElement('canvas');
  buffer.width = size;
  buffer.height = size;
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) return null;
  const bufferImage = bufferCtx.createImageData(size, size);
  const bufferData = bufferImage.data;

  const total = size * size;
  const SENTINEL = TEX_W;

  // Memory optimization: pack texU (uint16), texV (uint8), lambert (uint8) into
  // a single interleaved Uint8Array. Each pixel uses 4 bytes instead of 4+1+1=6.
  // This reduces per-pixel lookup memory by ~33% and improves cache locality.
  // Layout: [texU_low, texU_high, texV, lambert] per pixel.
  const texData = new Uint8Array(total * 4);
  const texDataU16 = new Uint16Array(texData.buffer);

  const Lx = -0.45;
  const Ly = -0.55;
  const Lz = 0.7;
  const Llen = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
  const lxN = Lx / Llen;
  const lyN = Ly / Llen;
  const lzN = Lz / Llen;

  const half = size / 2;
  const twoPi = Math.PI * 2;
  for (let py = 0; py < size; py += 1) {
    const sy = (py - half + 0.5) / half;
    for (let px = 0; px < size; px += 1) {
      const sx = (px - half + 0.5) / half;
      const d2 = sx * sx + sy * sy;
      const idx = py * size + px;
      if (d2 > 1) {
        texDataU16[idx * 2] = SENTINEL;
        texData[idx * 4 + 2] = 0;
        texData[idx * 4 + 3] = 0;
        bufferData[idx * 4 + 3] = 0;
        continue;
      }
      const sz = Math.sqrt(1 - d2);
      const lat = Math.acos(-sy);
      let v = ((lat / Math.PI) * TEX_H) | 0;
      if (v > TEX_H - 1) v = TEX_H - 1;
      const lon = Math.atan2(sx, sz);
      let u = (((lon / twoPi) + 0.5) * TEX_W) | 0;
      if (u >= TEX_W) u -= TEX_W;
      else if (u < 0) u += TEX_W;
      const lit = sx * lxN + sy * lyN + sz * lzN;
      texDataU16[idx * 2] = u;
      texData[idx * 4 + 2] = v < 255 ? v : 255;
      texData[idx * 4 + 3] = lit > 0 ? Math.min(255, (lit * 255) | 0) : 0;
    }
  }

  function redraw(rotation: number, brightnessBoost: number, greenShimmer: number) {
    const td = textureData!;
    const bd = bufferData;
    let rotShift = ((rotation / twoPi) * TEX_W) | 0;
    rotShift = ((rotShift % TEX_W) + TEX_W) % TEX_W;
    for (let i = 0; i < total; i += 1) {
      const baseU = texDataU16[i * 2];
      if (baseU === SENTINEL) continue;
      let u = baseU + rotShift;
      if (u >= TEX_W) u -= TEX_W;
      const tIdx = (texData[i * 4 + 2] * TEX_W + u) * 4;
      const lambInt = texData[i * 4 + 3];
      const lit = 0.3 + LAMB_SCALE * lambInt + brightnessBoost;
      const di = i * 4;
      let r = td[tIdx] * lit;
      let g = td[tIdx + 1] * lit + greenShimmer * lambInt * SHIMMER_SCALE;
      let b = td[tIdx + 2] * lit;
      if (r > 255) r = 255; else if (r < 0) r = 0;
      if (g > 255) g = 255; else if (g < 0) g = 0;
      if (b > 255) b = 255; else if (b < 0) b = 0;
      bd[di] = r;
      bd[di + 1] = g;
      bd[di + 2] = b;
      bd[di + 3] = 255;
    }
    bufferCtx!.putImageData(bufferImage, 0, 0);
  }

  return { buffer, size, redraw };
}
