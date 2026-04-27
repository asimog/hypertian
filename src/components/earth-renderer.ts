const LAND_DEEP = [28, 92, 50];
const LAND_BRIGHT = [110, 192, 110];
const OCEAN_DEEP = [8, 28, 60];
const OCEAN_SHALLOW = [38, 130, 168];
const ICE = [232, 244, 250];

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

export type EarthRenderer = {
  buffer: HTMLCanvasElement;
  size: number;
  redraw(rotation: number, brightnessBoost: number, greenShimmer: number): void;
};

export function createEarthRenderer(size: number, textureW = 512, textureH = 256): EarthRenderer | null {
  if (typeof document === 'undefined') return null;

  const texture = document.createElement('canvas');
  texture.width = textureW;
  texture.height = textureH;
  const textureCtx = texture.getContext('2d');
  if (!textureCtx) return null;

  const textureImage = textureCtx.createImageData(textureW, textureH);
  const textureData = textureImage.data;

  for (let v = 0; v < textureH; v += 1) {
    const latAngle = (v / textureH) * Math.PI;
    const sinLat = Math.sin(latAngle);
    const y = -Math.cos(latAngle);
    for (let u = 0; u < textureW; u += 1) {
      const lonAngle = (u / textureW) * Math.PI * 2;
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

      const polePos = v / textureH;
      let iceFactor = 0;
      if (polePos < 0.1) iceFactor = (0.1 - polePos) / 0.1;
      else if (polePos > 0.9) iceFactor = (polePos - 0.9) / 0.1;
      iceFactor = clamp01(iceFactor);
      iceFactor = iceFactor * iceFactor;
      if (iceFactor > 0) {
        r = lerp(r, ICE[0], iceFactor);
        g = lerp(g, ICE[1], iceFactor);
        b = lerp(b, ICE[2], iceFactor);
      }

      const idx = (v * textureW + u) * 4;
      textureData[idx] = r;
      textureData[idx + 1] = g;
      textureData[idx + 2] = b;
      textureData[idx + 3] = 255;
    }
  }
  textureCtx.putImageData(textureImage, 0, 0);

  const buffer = document.createElement('canvas');
  buffer.width = size;
  buffer.height = size;
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) return null;
  const bufferImage = bufferCtx.createImageData(size, size);
  const bufferData = bufferImage.data;

  const total = size * size;
  const inDisk = new Uint8Array(total);
  const texU = new Float32Array(total);
  const texV = new Int32Array(total);
  const lambert = new Float32Array(total);

  const Lx = -0.45;
  const Ly = -0.55;
  const Lz = 0.7;
  const Llen = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
  const lxN = Lx / Llen;
  const lyN = Ly / Llen;
  const lzN = Lz / Llen;

  const half = size / 2;
  for (let py = 0; py < size; py += 1) {
    const sy = (py - half + 0.5) / half;
    for (let px = 0; px < size; px += 1) {
      const sx = (px - half + 0.5) / half;
      const d2 = sx * sx + sy * sy;
      const idx = py * size + px;
      if (d2 > 1) {
        inDisk[idx] = 0;
        continue;
      }
      const sz = Math.sqrt(1 - d2);
      const lat = Math.acos(-sy);
      const v = Math.min(textureH - 1, Math.floor((lat / Math.PI) * textureH));
      const lon = Math.atan2(sx, sz);
      const lit = sx * lxN + sy * lyN + sz * lzN;
      inDisk[idx] = 1;
      texU[idx] = lon;
      texV[idx] = v;
      lambert[idx] = lit > 0 ? lit : 0;
    }
  }

  function redraw(rotation: number, brightnessBoost: number, greenShimmer: number) {
    const tw = textureW;
    const td = textureData;
    const bd = bufferData;
    const twoPi = Math.PI * 2;
    for (let i = 0; i < total; i += 1) {
      const di = i * 4;
      if (!inDisk[i]) {
        bd[di + 3] = 0;
        continue;
      }
      let uNorm = (texU[i] + rotation) / twoPi;
      uNorm -= Math.floor(uNorm);
      const u = Math.min(tw - 1, Math.floor(uNorm * tw));
      const tIdx = (texV[i] * tw + u) * 4;
      const lit = 0.3 + 0.85 * lambert[i] + brightnessBoost;
      let r = td[tIdx] * lit;
      let g = td[tIdx + 1] * lit + greenShimmer * lambert[i] * 36;
      let b = td[tIdx + 2] * lit;
      if (r < 0) r = 0; else if (r > 255) r = 255;
      if (g < 0) g = 0; else if (g > 255) g = 255;
      if (b < 0) b = 0; else if (b > 255) b = 255;
      bd[di] = r;
      bd[di + 1] = g;
      bd[di + 2] = b;
      bd[di + 3] = 255;
    }
    bufferCtx!.putImageData(bufferImage, 0, 0);
  }

  return { buffer, size, redraw };
}
