/**
 * Offline asset generator for 30-Day Drawing Course App.
 * Generates:
 *  - App icons & splash graphics (assets/images/)
 *  - Gentle harmonic timer chime WAV (assets/sounds/chime.wav)
 *  - 40 studio-lit / raymarched / shaded reference plates + exact-luminance grayscale twins (assets/references/)
 *  - Typed asset registry (src/curriculum/assetRegistry.ts)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'images');
const REF_DIR = path.join(ROOT, 'assets', 'references');
const SND_DIR = path.join(ROOT, 'assets', 'sounds');
const REG_PATH = path.join(ROOT, 'src', 'curriculum', 'assetRegistry.ts');

for (const dir of [IMG_DIR, REF_DIR, SND_DIR, path.dirname(REG_PATH)]) {
  fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Minimal PNG Encoder (RGBA8 / RGB8)
// ---------------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}
function encodePNG(width, height, rgbBuffer, hasAlpha = false) {
  const channels = hasAlpha ? 4 : 3;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 1; // Sub filter for great compression on smooth gradients
    const srcStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? rgbBuffer[srcStart + x - channels] : 0;
      raw[rowStart + 1 + x] = (rgbBuffer[srcStart + x] - left) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = hasAlpha ? 6 : 2; // RGBA or RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Vector / SDF Math Helpers
// ---------------------------------------------------------------------------
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const vec3 = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function rotY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}
function rotX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}
function rotZ(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

// SDF primitives
const sdSphere = (p, c, r) => len(sub(p, c)) - r;
function sdBox(p, b) {
  const qx = Math.abs(p[0]) - b[0];
  const qy = Math.abs(p[1]) - b[1];
  const qz = Math.abs(p[2]) - b[2];
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
}
function sdCapsule(p, a, b, r) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const h = clamp(dot(pa, ba) / (dot(ba, ba) || 1e-6), 0, 1);
  return len(sub(pa, mul(ba, h))) - r;
}
function sdEllipsoid(p, r) {
  const k0 = Math.hypot(p[0] / r[0], p[1] / r[1], p[2] / r[2]);
  const k1 = Math.hypot(p[0] / (r[0] * r[0]), p[1] / (r[1] * r[1]), p[2] / (r[2] * r[2]));
  return k0 * (k0 - 1) / (k1 || 1e-6);
}
function sdCylinderY(p, h, r) {
  const dx = Math.hypot(p[0], p[2]) - r;
  const dy = Math.abs(p[1]) - h;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
}
function sdConeY(p, r, h) {
  // base at y=0, tip at y=h
  const qx = Math.hypot(p[0], p[2]);
  const k1x = 0, k1y = h;
  const k2x = -r, k2y = 2 * h;
  const cax = qx - Math.min(qx, p[1] < 0 ? r : 0);
  const cay = Math.abs(p[1]) - h;
  const d1 = (k1x - qx) * k2x + (k1y - p[1]) * k2y;
  const t = clamp(d1 / (k2x * k2x + k2y * k2y), 0, 1);
  const cbx = qx - k1x + k2x * t;
  const cby = p[1] - k1y + k2y * t;
  const s = cbx < 0 && cay < 0 ? -1 : 1;
  return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
}
function sdRoundBox(p, b, r) {
  return sdBox(p, b) - r;
}

// Deterministic hash noise for subtle studio paper/surface grain
function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

// ---------------------------------------------------------------------------
// 3D Studio Raymarcher Renderer
// ---------------------------------------------------------------------------
function renderRaymarch(width, height, opts) {
  const {
    camPos = [0, 1.1, 4.2],
    lookAt = [0, 0.55, 0],
    fov = 1.65,
    lightDir = norm([0.65, 0.8, 0.55]),
    bgTop = [226, 222, 214],
    bgBottom = [194, 189, 180],
    floorY = 0,
    hasFloor = true,
    floorColor = [208, 203, 194],
    skyMode = false,
    sceneFn, // (p) => [dist, matId, r, g, b, rough]
  } = opts;

  const forward = norm(sub(lookAt, camPos));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);

  const buf = Buffer.alloc(width * height * 3);
  const eps = 0.0025;

  const evalScene = (p) => {
    let best = sceneFn(p);
    if (hasFloor) {
      const fd = p[1] - floorY;
      if (fd < best[0]) {
        best = [fd, 0, floorColor[0], floorColor[1], floorColor[2], 0.85];
      }
    }
    return best;
  };

  const calcNormal = (p) => {
    const d0 = evalScene(p)[0];
    return norm([
      evalScene([p[0] + eps, p[1], p[2]])[0] - d0,
      evalScene([p[0], p[1] + eps, p[2]])[0] - d0,
      evalScene([p[0], p[1], p[2] + eps])[0] - d0,
    ]);
  };

  const calcShadow = (ro, rd) => {
    let res = 1.0;
    let t = 0.04;
    for (let i = 0; i < 24; i++) {
      const h = evalScene(add(ro, mul(rd, t)))[0];
      if (h < 0.002) return 0.08;
      res = Math.min(res, (10.0 * h) / t);
      t += clamp(h, 0.03, 0.35);
      if (t > 8.0) break;
    }
    return clamp(res, 0.08, 1.0);
  };

  const calcAO = (p, n) => {
    let occ = 0;
    let sca = 1;
    for (let i = 1; i <= 4; i++) {
      const h = 0.05 * i;
      const d = evalScene(add(p, mul(n, h)))[0];
      occ += (h - d) * sca;
      sca *= 0.65;
    }
    return clamp(1.0 - 1.6 * occ, 0.25, 1.0);
  };

  for (let py = 0; py < height; py++) {
    const v = 1 - (2 * (py + 0.5)) / height;
    const ny = py / height;
    for (let px = 0; px < width; px++) {
      const u = ((2 * (px + 0.5)) / width - 1) * (width / height);
      const rd = norm(add(add(mul(right, u), mul(up, v)), mul(forward, fov)));

      let t = 0;
      let hit = null;
      for (let i = 0; i < 72; i++) {
        const p = add(camPos, mul(rd, t));
        const res = evalScene(p);
        if (res[0] < 0.0025) {
          hit = { p, res };
          break;
        }
        t += res[0];
        if (t > 24.0) break;
      }

      let cr, cg, cb;
      if (hit) {
        const { p, res } = hit;
        const n = calcNormal(p);
        const matId = res[1];
        const baseR = res[2], baseG = res[3], baseB = res[4], rough = res[5];

        const diff = Math.max(dot(n, lightDir), 0);
        const sh = diff > 0.01 ? calcShadow(add(p, mul(n, 0.008)), lightDir) : 0.1;
        const ao = calcAO(p, n);
        // Bounce fill from opposite/below
        const bounce = 0.22 * clamp(0.5 - 0.5 * n[1], 0, 1) + 0.16 * Math.max(dot(n, norm([-lightDir[0], 0.2, -lightDir[2]])), 0);
        // Specular highlight
        const hVec = norm(sub(lightDir, rd));
        const specPow = mix(48, 8, rough);
        const spec = (1 - rough * 0.8) * Math.pow(Math.max(dot(n, hVec), 0), specPow) * sh;

        const keyAmt = diff * sh * 0.92;
        const skyAmt = (0.28 + 0.2 * n[1]) * ao;
        const lit = keyAmt + skyAmt + bounce * ao;

        cr = baseR * lit + 255 * spec * 0.35;
        cg = baseG * lit + 250 * spec * 0.33;
        cb = baseB * lit + 242 * spec * 0.30;

        // Subtle horizon/distance fog into backdrop
        if (matId === 0 || skyMode) {
          const fog = smoothstep(4.5, 18.0, t);
          cr = mix(cr, bgBottom[0], fog);
          cg = mix(cg, bgBottom[1], fog);
          cb = mix(cb, bgBottom[2], fog);
        }
      } else {
        const grad = clamp(ny, 0, 1);
        cr = mix(bgTop[0], bgBottom[0], grad);
        cg = mix(bgTop[1], bgBottom[1], grad);
        cb = mix(bgTop[2], bgBottom[2], grad);
      }

      // Subtle vignette + dither grain
      const dx = (px / width - 0.5) * 1.3;
      const dy = (py / height - 0.5) * 1.3;
      const vig = 1 - 0.14 * (dx * dx + dy * dy);
      const grain = (hash2(px, py) - 0.5) * 3.5;

      const idx = (py * width + px) * 3;
      buf[idx] = clamp(Math.round(cr * vig + grain), 0, 255);
      buf[idx + 1] = clamp(Math.round(cg * vig + grain), 0, 255);
      buf[idx + 2] = clamp(Math.round(cb * vig + grain), 0, 255);
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// 2D Painterly / Landscape / Architecture Raster Renderer
// ---------------------------------------------------------------------------
function render2D(width, height, pixelFn) {
  const buf = Buffer.alloc(width * height * 3);
  for (let py = 0; py < height; py++) {
    const v = py / (height - 1);
    for (let px = 0; px < width; px++) {
      const u = px / (width - 1);
      const [r, g, b] = pixelFn(u, v, px, py);
      const grain = (hash2(px, py) - 0.5) * 3.0;
      const idx = (py * width + px) * 3;
      buf[idx] = clamp(Math.round(r + grain), 0, 255);
      buf[idx + 1] = clamp(Math.round(g + grain), 0, 255);
      buf[idx + 2] = clamp(Math.round(b + grain), 0, 255);
    }
  }
  return buf;
}

function toGrayscaleBuffer(rgbBuf) {
  const out = Buffer.alloc(rgbBuf.length);
  for (let i = 0; i < rgbBuf.length; i += 3) {
    const y = clamp(Math.round(0.299 * rgbBuf[i] + 0.587 * rgbBuf[i + 1] + 0.114 * rgbBuf[i + 2]), 0, 255);
    out[i] = y;
    out[i + 1] = y;
    out[i + 2] = y;
  }
  return out;
}

// Smooth value noise for landscapes
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}
function fbm(x, y, oct = 4) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) {
    val += amp * vnoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return val;
}

// ---------------------------------------------------------------------------
// Mannequin Pose Helper (for Week 3 & Day 15 Gesture Interval Mode)
// ---------------------------------------------------------------------------
function makeMannequinSDF(pose) {
  const {
    pelvis = [0, 0.95, 0],
    rib = [0, 1.38, 0],
    head = [0, 1.82, 0],
    lSh = [-0.26, 1.50, 0],
    lElb = [-0.42, 1.24, 0.05],
    lHand = [-0.46, 0.96, 0.12],
    rSh = [0.26, 1.50, 0],
    rElb = [0.42, 1.24, 0.05],
    rHand = [0.46, 0.96, 0.12],
    lHip = [-0.14, 0.90, 0],
    lKnee = [-0.18, 0.48, 0.04],
    lFoot = [-0.18, 0.06, 0.02],
    rHip = [0.14, 0.90, 0],
    rKnee = [0.18, 0.48, 0.04],
    rFoot = [0.18, 0.06, 0.02],
    baseColor = [224, 198, 168],
    jointColor = [168, 134, 102],
  } = pose;

  return (p) => {
    let bestD = 1e9;
    let isJoint = false;

    const addPart = (d, joint = false) => {
      if (d < bestD) {
        bestD = d;
        isJoint = joint;
      }
    };

    // Head (egg ellipsoid)
    addPart(sdEllipsoid(sub(p, head), [0.115, 0.145, 0.125]));
    // Neck
    addPart(sdCapsule(p, add(rib, [0, 0.14, 0]), sub(head, [0, 0.08, 0]), 0.055));
    // Ribcage
    addPart(sdEllipsoid(sub(p, rib), [0.19, 0.21, 0.13]));
    // Waist / Abdomen
    addPart(sdCapsule(p, pelvis, rib, 0.125));
    // Pelvis
    addPart(sdEllipsoid(sub(p, pelvis), [0.17, 0.12, 0.115]));

    // Arms
    addPart(sdCapsule(p, lSh, lElb, 0.052));
    addPart(sdCapsule(p, lElb, lHand, 0.042));
    addPart(sdCapsule(p, rSh, rElb, 0.052));
    addPart(sdCapsule(p, rElb, rHand, 0.042));

    // Legs
    addPart(sdCapsule(p, lHip, lKnee, 0.075));
    addPart(sdCapsule(p, lKnee, lFoot, 0.056));
    addPart(sdCapsule(p, rHip, rKnee, 0.075));
    addPart(sdCapsule(p, rKnee, rFoot, 0.056));

    // Joint spheres for clear anatomical landmarks
    for (const j of [lSh, lElb, lHand, rSh, rElb, rHand, lKnee, lFoot, rKnee, rFoot]) {
      addPart(sdSphere(p, j, 0.046), true);
    }

    const col = isJoint ? jointColor : baseColor;
    return [bestD, 1, col[0], col[1], col[2], isJoint ? 0.55 : 0.65];
  };
}

// Planar Loomis Head Helper (Week 2)
function makeLoomisHeadSDF(yaw = 0.45, pitch = 0.0, col = [232, 224, 212]) {
  return (rawP) => {
    let p = sub(rawP, [0, 0.85, 0]);
    p = rotY(p, yaw);
    p = rotX(p, pitch);

    // Cranial sphere with sliced side planes (temple slices)
    const sphere = sdSphere(p, [0, 0.12, 0], 0.48);
    const sideSlice = Math.abs(p[0]) - 0.37;
    const cranium = Math.max(sphere, sideSlice);

    // Jaw / lower face wedge
    const jawP = sub(p, [0, -0.22, 0.06]);
    const jawBox = sdRoundBox(rotX(jawP, -0.18), [0.24 - Math.max(0, -jawP[1]) * 0.25, 0.26, 0.30], 0.05);

    // Brow ridge & nose bridge
    const brow = sdRoundBox(sub(p, [0, 0.07, 0.36]), [0.26, 0.045, 0.08], 0.02);
    const nose = sdRoundBox(rotX(sub(p, [0, -0.09, 0.42]), -0.28), [0.055, 0.14, 0.09], 0.02);

    // Neck cylinder
    const neck = sdCapsule(p, [0, -0.35, -0.06], [0, -0.88, -0.08], 0.19);

    const d = Math.min(cranium, jawBox, brow, nose, neck);
    return [d, 1, col[0], col[1], col[2], 0.72];
  };
}

// ---------------------------------------------------------------------------
// Reference Definitions (40 Plates across 30 days)
// ---------------------------------------------------------------------------
const W = 640, H = 640;

const REFERENCES = [
  // WEEK 1: Line, Form & Perspective
  {
    id: 'ref_01_sphere_studio',
    title: 'Classic Matte Sphere — 5 Value Zones',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 1.0, 3.8],
      lookAt: [0, 0.68, 0],
      lightDir: norm([0.72, 0.75, 0.55]),
      sceneFn: (p) => [sdSphere(p, [0, 0.72, 0], 0.72), 1, 234, 229, 220, 0.78],
    }),
  },
  {
    id: 'ref_02_cube_2pt',
    title: 'Rotated Cube — 2-Point Perspective Planes',
    render: () => renderRaymarch(W, H, {
      camPos: [0.3, 1.5, 3.9],
      lookAt: [0, 0.58, 0],
      lightDir: norm([0.75, 0.85, 0.45]),
      sceneFn: (p) => {
        const q = rotY(sub(p, [0, 0.58, 0]), 0.55);
        return [sdRoundBox(q, [0.56, 0.56, 0.56], 0.015), 1, 228, 221, 208, 0.82];
      },
    }),
  },
  {
    id: 'ref_03_cylinder_upright',
    title: 'Upright Cylinder — Ellipses & Core Shadow',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 1.45, 3.9],
      lookAt: [0, 0.72, 0],
      lightDir: norm([-0.72, 0.75, 0.52]),
      sceneFn: (p) => [sdCylinderY(sub(p, [0, 0.72, 0]), 0.72, 0.48), 1, 232, 227, 218, 0.75],
    }),
  },
  {
    id: 'ref_04_cone_pyramid',
    title: 'Cone & Pyramid Form Study',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 1.35, 4.1],
      lookAt: [0, 0.65, 0],
      lightDir: norm([0.7, 0.8, 0.5]),
      sceneFn: (p) => {
        const dCone = sdConeY(sub(p, [-0.62, 0.65, 0.1]), 0.52, 0.65);
        const q = rotY(sub(p, [0.68, 0.55, -0.1]), 0.45);
        const dCyl = sdCylinderY(q, 0.55, 0.42);
        return dCone < dCyl ? [dCone, 1, 234, 228, 216, 0.78] : [dCyl, 2, 214, 208, 198, 0.8];
      },
    }),
  },
  {
    id: 'ref_05_still_life_forms',
    title: 'Overlapping Geometric Still Life',
    render: () => renderRaymarch(W, H, {
      camPos: [0.2, 1.45, 4.3],
      lookAt: [0, 0.65, 0],
      lightDir: norm([0.72, 0.82, 0.55]),
      sceneFn: (p) => {
        const d1 = sdSphere(p, [-0.55, 0.48, 0.45], 0.48);
        const d2 = sdCylinderY(sub(p, [0.42, 0.76, -0.25]), 0.76, 0.36);
        const d3 = sdRoundBox(rotY(sub(p, [-0.1, 0.38, -0.35]), -0.4), [0.45, 0.38, 0.45], 0.015);
        const m = Math.min(d1, d2, d3);
        if (m === d1) return [d1, 1, 236, 231, 222, 0.74];
        if (m === d2) return [d2, 2, 216, 211, 202, 0.8];
        return [d3, 3, 196, 189, 178, 0.85];
      },
    }),
  },
  {
    id: 'ref_06_arch_1pt',
    title: '1-Point Perspective Architectural Corridor',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 1.05, 4.0],
      lookAt: [0, 1.0, 0],
      fov: 1.35,
      lightDir: norm([0.45, 0.9, 0.65]),
      sceneFn: (p) => {
        let d = 1e9;
        for (let i = 0; i < 4; i++) {
          const z = 1.6 - i * 1.8;
          d = Math.min(d, sdBox(sub(p, [-1.15, 1.0, z]), [0.22, 1.0, 0.25]));
          d = Math.min(d, sdBox(sub(p, [1.15, 1.0, z]), [0.22, 1.0, 0.25]));
          d = Math.min(d, sdBox(sub(p, [0, 2.05, z]), [1.38, 0.18, 0.28]));
        }
        return [d, 1, 226, 219, 208, 0.85];
      },
    }),
  },
  {
    id: 'ref_07_arch_3pt',
    title: '3-Point Perspective Monolith Towers',
    render: () => renderRaymarch(W, H, {
      camPos: [0.8, 0.45, 4.4],
      lookAt: [0, 1.55, 0],
      fov: 1.4,
      lightDir: norm([0.75, 0.7, 0.45]),
      bgTop: [212, 220, 228],
      bgBottom: [236, 232, 224],
      sceneFn: (p) => {
        const b1 = sdBox(rotY(sub(p, [0, 1.6, 0]), 0.4), [0.55, 1.6, 0.55]);
        const b2 = sdBox(rotY(sub(p, [-1.1, 1.0, -0.9]), 0.2), [0.42, 1.0, 0.42]);
        const b3 = sdBox(rotY(sub(p, [1.15, 1.2, -0.7]), 0.55), [0.44, 1.2, 0.44]);
        return [Math.min(b1, b2, b3), 1, 220, 214, 204, 0.86];
      },
    }),
  },

  // WEEK 2: Faces & Expressions
  {
    id: 'ref_08_loomis_front',
    title: 'Planar Head — Front View',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 0.92, 3.1],
      lookAt: [0, 0.86, 0],
      hasFloor: false,
      lightDir: norm([0.65, 0.72, 0.6]),
      bgTop: [54, 53, 51],
      bgBottom: [38, 37, 35],
      sceneFn: makeLoomisHeadSDF(0.05, 0.0),
    }),
  },
  {
    id: 'ref_09_loomis_3q_up',
    title: 'Planar Head — 3/4 Looking Up',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 0.72, 3.1],
      lookAt: [0, 0.90, 0],
      hasFloor: false,
      lightDir: norm([0.7, 0.75, 0.55]),
      bgTop: [54, 53, 51],
      bgBottom: [38, 37, 35],
      sceneFn: makeLoomisHeadSDF(0.58, -0.26),
    }),
  },
  {
    id: 'ref_10_loomis_3q_down',
    title: 'Planar Head — 3/4 Looking Down',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 1.15, 3.1],
      lookAt: [0, 0.82, 0],
      hasFloor: false,
      lightDir: norm([-0.68, 0.78, 0.52]),
      bgTop: [54, 53, 51],
      bgBottom: [38, 37, 35],
      sceneFn: makeLoomisHeadSDF(-0.56, 0.28),
    }),
  },
  {
    id: 'ref_11_loomis_profile',
    title: 'Planar Head — Side Profile',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 0.90, 3.1],
      lookAt: [0, 0.85, 0],
      hasFloor: false,
      lightDir: norm([0.5, 0.75, 0.72]),
      bgTop: [54, 53, 51],
      bgBottom: [38, 37, 35],
      sceneFn: makeLoomisHeadSDF(1.42, 0.02),
    }),
  },
  {
    id: 'ref_12_light_rembrandt',
    title: 'Rembrandt 45° Studio Head Lighting',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 0.92, 3.0],
      lookAt: [0, 0.86, 0],
      hasFloor: false,
      lightDir: norm([0.78, 0.65, 0.35]),
      bgTop: [34, 33, 31],
      bgBottom: [22, 21, 20],
      sceneFn: makeLoomisHeadSDF(0.32, 0.04, [235, 221, 206]),
    }),
  },
  {
    id: 'ref_13_light_split',
    title: 'Dramatic 90° Split Head Lighting',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 0.92, 3.0],
      lookAt: [0, 0.86, 0],
      hasFloor: false,
      lightDir: norm([0.96, 0.25, 0.12]),
      bgTop: [28, 28, 28],
      bgBottom: [18, 18, 18],
      sceneFn: makeLoomisHeadSDF(-0.18, 0.0, [232, 224, 214]),
    }),
  },
  {
    id: 'ref_14_light_rim',
    title: 'Back / Rim-Lit Head Silhouette',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 0.92, 3.0],
      lookAt: [0, 0.86, 0],
      hasFloor: false,
      lightDir: norm([-0.6, 0.55, -0.78]),
      bgTop: [30, 32, 36],
      bgBottom: [18, 19, 22],
      sceneFn: makeLoomisHeadSDF(0.45, 0.0, [226, 220, 212]),
    }),
  },
  {
    id: 'ref_15_features_eye_planes',
    title: 'Orbital Socket & Eyelid Sphere Study',
    render: () => renderRaymarch(W, H, {
      camPos: [0.3, 0.72, 2.5],
      lookAt: [0, 0.65, 0],
      hasFloor: false,
      lightDir: norm([0.65, 0.78, 0.5]),
      bgTop: [226, 222, 215],
      bgBottom: [198, 193, 185],
      sceneFn: (rawP) => {
        const p = sub(rawP, [0, 0.65, 0]);
        const brow = sdRoundBox(sub(p, [0, 0.36, 0.1]), [0.65, 0.15, 0.35], 0.06);
        const eye = sdSphere(p, [0, 0.02, 0.05], 0.32);
        const upperLid = sdEllipsoid(rotX(sub(p, [0, 0.14, 0.11]), 0.35), [0.36, 0.14, 0.31]);
        const lowerLid = sdEllipsoid(rotX(sub(p, [0, -0.14, 0.09]), -0.3), [0.34, 0.11, 0.29]);
        const d = Math.min(brow, eye, upperLid, lowerLid);
        return [d, 1, 232, 224, 212, d === eye ? 0.35 : 0.78];
      },
    }),
  },
  {
    id: 'ref_16_features_nose_mouth',
    title: 'Wedge Nose & Barrel Mouth Planes',
    render: () => renderRaymarch(W, H, {
      camPos: [0.45, 0.72, 2.5],
      lookAt: [0, 0.68, 0],
      hasFloor: false,
      lightDir: norm([0.7, 0.75, 0.5]),
      bgTop: [226, 222, 215],
      bgBottom: [198, 193, 185],
      sceneFn: (rawP) => {
        const p = sub(rawP, [0, 0.68, 0]);
        const barrel = sdCylinderY(sub(p, [0, -0.25, -0.05]), 0.36, 0.44);
        const nose = sdRoundBox(rotX(sub(p, [0, 0.25, 0.24]), -0.35), [0.13, 0.28, 0.18], 0.04);
        const uLip = sdEllipsoid(sub(p, [0, -0.18, 0.38]), [0.22, 0.07, 0.08]);
        const lLip = sdEllipsoid(sub(p, [0, -0.30, 0.37]), [0.19, 0.075, 0.08]);
        const d = Math.min(barrel, nose, uLip, lLip);
        return [d, 1, 230, 222, 210, 0.75];
      },
    }),
  },

  // WEEK 3: Bodies, Anatomy & Movement (6 Gesture Poses for Day 15 Interval Mode + Anatomy)
  {
    id: 'ref_17_gesture_reach',
    title: 'Gesture Pose 1 — Overhead Reach (S-Curve)',
    render: () => renderRaymarch(W, H, {
      camPos: [0.4, 1.15, 3.9],
      lookAt: [0, 1.05, 0],
      lightDir: norm([0.7, 0.8, 0.55]),
      sceneFn: makeMannequinSDF({
        pelvis: [-0.06, 0.96, 0],
        rib: [0.08, 1.40, -0.04],
        head: [0.12, 1.84, -0.06],
        lSh: [-0.18, 1.50, -0.04], lElb: [-0.38, 1.24, 0.10], lHand: [-0.46, 0.98, 0.18],
        rSh: [0.30, 1.56, -0.02], rElb: [0.42, 1.88, 0.12], rHand: [0.28, 2.18, 0.22],
        lHip: [-0.18, 0.90, 0], lKnee: [-0.22, 0.48, 0.08], lFoot: [-0.24, 0.06, 0.04],
        rHip: [0.08, 0.92, 0], rKnee: [0.20, 0.48, -0.08], rFoot: [0.28, 0.06, -0.18],
      }),
    }),
  },
  {
    id: 'ref_18_gesture_stride',
    title: 'Gesture Pose 2 — Forward Stride',
    render: () => renderRaymarch(W, H, {
      camPos: [1.8, 1.1, 3.6],
      lookAt: [0, 0.96, 0],
      lightDir: norm([0.65, 0.85, 0.5]),
      sceneFn: makeMannequinSDF({
        pelvis: [0, 0.92, 0],
        rib: [0.04, 1.32, 0.16],
        head: [0.06, 1.74, 0.24],
        lSh: [-0.24, 1.42, 0.16], lElb: [-0.34, 1.20, 0.42], lHand: [-0.24, 1.38, 0.62],
        rSh: [0.26, 1.42, 0.14], rElb: [0.34, 1.18, -0.14], rHand: [0.38, 0.96, -0.34],
        lHip: [-0.14, 0.88, 0.02], lKnee: [-0.16, 0.52, 0.36], lFoot: [-0.16, 0.10, 0.48],
        rHip: [0.14, 0.88, -0.02], rKnee: [0.16, 0.48, -0.26], rFoot: [0.16, 0.14, -0.56],
      }),
    }),
  },
  {
    id: 'ref_19_gesture_seated',
    title: 'Gesture Pose 3 — Seated Forward Lean',
    render: () => renderRaymarch(W, H, {
      camPos: [1.6, 1.1, 3.3],
      lookAt: [0, 0.72, 0.15],
      lightDir: norm([0.65, 0.85, 0.55]),
      sceneFn: (p) => {
        const man = makeMannequinSDF({
          pelvis: [0, 0.54, -0.15],
          rib: [0, 0.92, 0.06],
          head: [0, 1.32, 0.22],
          lSh: [-0.24, 1.02, 0.08], lElb: [-0.28, 0.72, 0.32], lHand: [-0.12, 0.62, 0.46],
          rSh: [0.24, 1.02, 0.08], rElb: [0.28, 0.72, 0.32], rHand: [0.12, 0.62, 0.46],
          lHip: [-0.16, 0.52, -0.10], lKnee: [-0.22, 0.50, 0.38], lFoot: [-0.20, 0.06, 0.36],
          rHip: [0.16, 0.52, -0.10], rKnee: [0.22, 0.50, 0.38], rFoot: [0.20, 0.06, 0.36],
        })(p);
        const stool = sdBox(sub(p, [0, 0.23, -0.15]), [0.28, 0.23, 0.28]);
        return stool < man[0] ? [stool, 2, 165, 160, 152, 0.85] : man;
      },
    }),
  },
  {
    id: 'ref_20_gesture_twist',
    title: 'Gesture Pose 4 — Contrapposto Twist',
    render: () => renderRaymarch(W, H, {
      camPos: [-0.5, 1.1, 3.8],
      lookAt: [0, 0.98, 0],
      lightDir: norm([0.72, 0.8, 0.5]),
      sceneFn: makeMannequinSDF({
        pelvis: [0.06, 0.95, 0],
        rib: [-0.04, 1.38, 0],
        head: [-0.06, 1.82, 0.04],
        lSh: [-0.30, 1.44, 0.10], lElb: [-0.36, 1.16, 0.16], lHand: [-0.20, 1.00, 0.18],
        rSh: [0.22, 1.54, -0.10], rElb: [0.46, 1.34, -0.14], rHand: [0.58, 1.06, -0.08],
        lHip: [-0.10, 0.92, 0], lKnee: [-0.12, 0.48, 0.02], lFoot: [-0.10, 0.06, 0.02],
        rHip: [0.20, 0.88, 0], rKnee: [0.26, 0.48, 0.16], rFoot: [0.32, 0.06, -0.06],
      }),
    }),
  },
  {
    id: 'ref_21_gesture_lunge',
    title: 'Gesture Pose 5 — Dynamic Athletic Lunge',
    render: () => renderRaymarch(W, H, {
      camPos: [1.5, 1.0, 3.8],
      lookAt: [0, 0.82, 0.1],
      lightDir: norm([0.7, 0.85, 0.5]),
      sceneFn: makeMannequinSDF({
        pelvis: [0, 0.72, 0],
        rib: [0, 1.12, 0.18],
        head: [0, 1.52, 0.28],
        lSh: [-0.24, 1.22, 0.18], lElb: [-0.30, 1.08, 0.48], lHand: [-0.18, 1.12, 0.78],
        rSh: [0.24, 1.22, 0.16], rElb: [0.32, 1.02, -0.16], rHand: [0.34, 0.90, -0.42],
        lHip: [-0.15, 0.70, 0.04], lKnee: [-0.18, 0.54, 0.48], lFoot: [-0.18, 0.06, 0.54],
        rHip: [0.15, 0.70, -0.04], rKnee: [0.18, 0.34, -0.34], rFoot: [0.18, 0.06, -0.68],
      }),
    }),
  },
  {
    id: 'ref_22_gesture_recline',
    title: 'Gesture Pose 6 — Reclining Side Rest',
    render: () => renderRaymarch(W, H, {
      camPos: [0.2, 1.15, 3.6],
      lookAt: [0, 0.45, 0],
      lightDir: norm([0.65, 0.85, 0.55]),
      sceneFn: makeMannequinSDF({
        pelvis: [-0.15, 0.22, 0],
        rib: [0.24, 0.42, 0],
        head: [0.56, 0.68, 0.04],
        lSh: [0.30, 0.56, -0.12], lElb: [0.14, 0.44, -0.22], lHand: [-0.06, 0.32, -0.12],
        rSh: [0.28, 0.34, 0.14], rElb: [0.56, 0.24, 0.18], rHand: [0.56, 0.06, 0.22],
        lHip: [-0.22, 0.28, -0.06], lKnee: [-0.62, 0.48, 0.06], lFoot: [-0.96, 0.08, 0.04],
        rHip: [-0.22, 0.16, 0.08], rKnee: [-0.66, 0.14, 0.18], rFoot: [-1.06, 0.08, 0.14],
      }),
    }),
  },
  {
    id: 'ref_23_torso_bean',
    title: 'The Torso Bean — Ribcage & Pelvis Tilt',
    render: () => renderRaymarch(W, H, {
      camPos: [0.9, 1.0, 2.7],
      lookAt: [0, 0.88, 0],
      hasFloor: false,
      lightDir: norm([0.7, 0.8, 0.55]),
      bgTop: [226, 222, 214],
      bgBottom: [196, 191, 182],
      sceneFn: (p) => {
        const ribP = rotZ(rotY(sub(p, [-0.08, 1.15, 0]), 0.35), -0.22);
        const pelP = rotZ(rotY(sub(p, [0.08, 0.58, 0]), -0.2), 0.18);
        const rib = sdEllipsoid(ribP, [0.30, 0.34, 0.22]);
        const pel = sdEllipsoid(pelP, [0.28, 0.20, 0.19]);
        const spine = sdCapsule(p, [0.08, 0.58, -0.04], [-0.08, 1.15, -0.04], 0.16);
        return [Math.min(rib, pel, spine), 1, 228, 210, 192, 0.72];
      },
    }),
  },
  {
    id: 'ref_24_torso_back',
    title: 'Back Torso Massing & Scapulae',
    render: () => renderRaymarch(W, H, {
      camPos: [-0.6, 1.15, -2.8],
      lookAt: [0, 0.95, 0],
      hasFloor: false,
      lightDir: norm([-0.7, 0.75, -0.5]),
      bgTop: [226, 222, 214],
      bgBottom: [196, 191, 182],
      sceneFn: (p) => {
        const rib = sdEllipsoid(sub(p, [0, 1.18, 0]), [0.32, 0.34, 0.20]);
        const lScap = sdEllipsoid(rotZ(sub(p, [-0.15, 1.24, -0.14]), 0.25), [0.13, 0.18, 0.08]);
        const rScap = sdEllipsoid(rotZ(sub(p, [0.15, 1.24, -0.14]), -0.25), [0.13, 0.18, 0.08]);
        const pel = sdEllipsoid(sub(p, [0, 0.60, -0.02]), [0.28, 0.20, 0.18]);
        const waist = sdCapsule(p, [0, 0.62, 0], [0, 1.15, 0], 0.19);
        return [Math.min(rib, lScap, rScap, pel, waist), 1, 226, 206, 186, 0.74];
      },
    }),
  },
  {
    id: 'ref_25_figure_standing',
    title: '8-Head Proportion Standing Figure',
    render: () => renderRaymarch(W, H, {
      camPos: [0.35, 1.05, 3.85],
      lookAt: [0, 1.0, 0],
      lightDir: norm([0.65, 0.8, 0.55]),
      sceneFn: makeMannequinSDF({}),
    }),
  },
  {
    id: 'ref_26_foreshortening_arm',
    title: 'Foreshortened Arm — Overlapping Cylinders',
    render: () => renderRaymarch(W, H, {
      camPos: [0.15, 1.05, 2.7],
      lookAt: [0, 0.92, 0.3],
      hasFloor: false,
      lightDir: norm([0.65, 0.8, 0.55]),
      bgTop: [226, 222, 214],
      bgBottom: [194, 189, 180],
      sceneFn: (p) => {
        const sh = sdSphere(p, [-0.3, 1.1, -0.5], 0.24);
        const upper = sdCapsule(p, [-0.3, 1.1, -0.5], [-0.08, 0.92, 0.18], 0.16);
        const fore = sdCapsule(p, [-0.08, 0.92, 0.18], [0.10, 0.82, 0.95], 0.145);
        const fist = sdRoundBox(rotY(sub(p, [0.12, 0.80, 1.12]), 0.2), [0.14, 0.14, 0.16], 0.05);
        return [Math.min(sh, upper, fore, fist), 1, 226, 204, 182, 0.7];
      },
    }),
  },
  {
    id: 'ref_27_hand_blocks',
    title: 'Block Hand Construction Study',
    render: () => renderRaymarch(W, H, {
      camPos: [0.4, 0.85, 2.45],
      lookAt: [0, 0.72, 0],
      hasFloor: false,
      lightDir: norm([0.65, 0.8, 0.55]),
      bgTop: [226, 222, 214],
      bgBottom: [194, 189, 180],
      sceneFn: (p) => {
        const wrist = sdCapsule(p, [0, 0.1, -0.05], [0, 0.45, 0], 0.14);
        const palm = sdRoundBox(rotX(sub(p, [0, 0.68, 0]), 0.12), [0.24, 0.24, 0.08], 0.03);
        const thumb = sdCapsule(p, [-0.24, 0.56, 0.06], [-0.42, 0.84, 0.22], 0.055);
        const f1 = sdCapsule(p, [-0.18, 0.92, 0.03], [-0.21, 1.24, 0.14], 0.046);
        const f2 = sdCapsule(p, [-0.06, 0.94, 0.03], [-0.07, 1.32, 0.12], 0.048);
        const f3 = sdCapsule(p, [0.07, 0.92, 0.03], [0.09, 1.26, 0.15], 0.045);
        const f4 = sdCapsule(p, [0.19, 0.88, 0.02], [0.24, 1.14, 0.18], 0.04);
        return [Math.min(wrist, palm, thumb, f1, f2, f3, f4), 1, 228, 212, 194, 0.72];
      },
    }),
  },
  {
    id: 'ref_28_foot_wedges',
    title: 'Ankle Cylinder & Foot Wedge',
    render: () => renderRaymarch(W, H, {
      camPos: [1.5, 0.9, 2.7],
      lookAt: [0, 0.36, 0.1],
      lightDir: norm([0.7, 0.82, 0.52]),
      sceneFn: (p) => {
        const shin = sdCapsule(p, [0, 1.15, -0.18], [0, 0.28, -0.15], 0.14);
        const heel = sdSphere(p, [0, 0.15, -0.18], 0.15);
        const arch = sdRoundBox(rotX(sub(p, [0, 0.14, 0.14]), 0.30), [0.14, 0.12, 0.30], 0.04);
        const toes = sdRoundBox(sub(p, [0, 0.07, 0.45]), [0.15, 0.07, 0.13], 0.03);
        return [Math.min(shin, heel, arch, toes), 1, 228, 212, 194, 0.74];
      },
    }),
  },

  // WEEK 4: Landscapes & Composition
  {
    id: 'ref_29_horizon_thirds',
    title: 'Coastal Headland — Rule of Thirds',
    render: () => render2D(W, H, (u, v) => {
      const horizon = 0.66;
      if (v < horizon) {
        // Soft coastal sky
        const t = v / horizon;
        let r = mix(155, 225, t), g = mix(178, 230, t), b = mix(205, 232, t);
        const cloud = smoothstep(0.52, 0.78, fbm(u * 4.5, v * 7.0, 4));
        r = mix(r, 248, cloud * 0.55);
        g = mix(g, 246, cloud * 0.55);
        b = mix(b, 242, cloud * 0.55);
        return [r, g, b];
      }
      // Sea + dark rocky headland at left third (u < 0.38)
      const seaT = (v - horizon) / (1 - horizon);
      let r = mix(118, 62, seaT), g = mix(142, 88, seaT), b = mix(162, 112, seaT);
      const wave = Math.sin(u * 40 + fbm(u * 8, v * 40, 2) * 4) * 6;
      r += wave; g += wave; b += wave;
      const cliffTop = horizon - 0.16 * smoothstep(0.42, 0.0, u) - 0.03 * fbm(u * 12, v * 12, 3);
      if (u < 0.42 && v > cliffTop && v < horizon + 0.14 * (1 - u)) {
        const shade = 0.7 + 0.3 * fbm(u * 18, v * 18, 3);
        return [68 * shade, 64 * shade, 58 * shade];
      }
      return [r, g, b];
    }),
  },
  {
    id: 'ref_30_layers_mountains',
    title: 'Atmospheric Perspective — 5 Mountain Ridges',
    render: () => render2D(W, H, (u, v) => {
      let r = mix(168, 238, v), g = mix(186, 236, v), b = mix(212, 234, v);
      const layers = [
        { base: 0.34, amp: 0.14, freq: 3.2, seed: 1.1, col: [182, 194, 210] },
        { base: 0.46, amp: 0.15, freq: 4.1, seed: 2.7, col: [148, 162, 180] },
        { base: 0.58, amp: 0.15, freq: 5.0, seed: 4.3, col: [110, 126, 142] },
        { base: 0.71, amp: 0.14, freq: 6.2, seed: 6.1, col: [74, 88, 98] },
        { base: 0.85, amp: 0.10, freq: 7.5, seed: 8.4, col: [44, 52, 54] },
      ];
      for (const L of layers) {
        const h = L.base - L.amp * fbm(u * L.freq + L.seed, L.seed, 4);
        if (v > h) {
          const mist = smoothstep(0.0, 0.18, v - h);
          const lit = 0.92 + 0.16 * Math.sin(u * 8 + L.seed);
          r = mix(L.col[0] * lit, L.col[0] + 18, mist * 0.4);
          g = mix(L.col[1] * lit, L.col[1] + 18, mist * 0.4);
          b = mix(L.col[2] * lit, L.col[2] + 16, mist * 0.4);
        }
      }
      return [r, g, b];
    }),
  },
  {
    id: 'ref_31_clouds_sky',
    title: 'Volumetric Cumulus Clouds Over Horizon',
    render: () => render2D(W, H, (u, v) => {
      if (v > 0.78) {
        const f = (v - 0.78) / 0.22;
        return [mix(118, 72, f), mix(128, 86, f), mix(92, 60, f)];
      }
      const skyT = v / 0.78;
      let r = mix(92, 198, skyT), g = mix(132, 214, skyT), b = mix(186, 232, skyT);
      // Volumetric cloud mass centered around (0.48, 0.46)
      const cx = (u - 0.48) * 1.4, cy = (v - 0.45) * 2.1;
      const shape = 1.0 - Math.hypot(cx, cy) + (fbm(u * 7, v * 7, 4) - 0.48) * 0.95;
      if (shape > 0.35 && v < 0.68) {
        const density = smoothstep(0.35, 0.62, shape);
        const topLit = smoothstep(0.66, 0.22, v + (fbm(u * 9, v * 9, 3) - 0.5) * 0.14);
        const cr = mix(145, 252, topLit), cg = mix(154, 249, topLit), cb = mix(170, 244, topLit);
        r = mix(r, cr, density);
        g = mix(g, cg, density);
        b = mix(b, cb, density);
      }
      return [r, g, b];
    }),
  },
  {
    id: 'ref_32_trees_massing',
    title: 'Foliage Canopy Massing & Cast Shadows',
    render: () => renderRaymarch(W, H, {
      camPos: [0.3, 1.25, 4.4],
      lookAt: [0, 1.0, 0],
      lightDir: norm([0.75, 0.75, 0.45]),
      bgTop: [204, 218, 232],
      bgBottom: [232, 228, 218],
      floorColor: [184, 178, 146],
      sceneFn: (p) => {
        const trunk = sdCapsule(p, [0, 0, 0], [0.05, 1.35, 0], 0.13);
        const c1 = sdSphere(p, [0.05, 1.65, 0], 0.68);
        const c2 = sdSphere(p, [-0.52, 1.42, 0.22], 0.48);
        const c3 = sdSphere(p, [0.58, 1.46, -0.15], 0.50);
        const c4 = sdSphere(p, [0.15, 2.02, 0.12], 0.46);
        const foliage = Math.min(c1, c2, c3, c4) + (Math.sin(p[0] * 14) * Math.cos(p[1] * 14) * 0.03);
        if (trunk < foliage) return [trunk, 1, 108, 86, 68, 0.9];
        return [foliage, 2, 118, 138, 92, 0.85];
      },
    }),
  },
  {
    id: 'ref_33_water_reflection',
    title: 'Calm Lake Reflections & Shoreline',
    render: () => render2D(W, H, (u, v) => {
      const shore = 0.52;
      const hill = shore - 0.18 * Math.exp(-Math.pow((u - 0.35) * 3.0, 2)) - 0.06 * fbm(u * 8, 1.2, 3);
      if (v < hill) {
        const t = v / shore;
        return [mix(166, 236, t), mix(186, 224, t), mix(212, 206, t)];
      }
      if (v < shore) {
        const sunlit = smoothstep(0.0, 0.15, u - 0.25);
        return [mix(62, 138, sunlit), mix(70, 122, sunlit), mix(76, 98, sunlit)];
      }
      // Water reflection of hill & sky with horizontal ripples
      const rv = shore - (v - shore) + Math.sin(v * 140 + u * 20) * 0.008;
      const rHill = shore - 0.18 * Math.exp(-Math.pow((u - 0.35) * 3.0, 2)) - 0.06 * fbm(u * 8, 1.2, 3);
      if (rv < rHill) {
        const t = Math.max(0, rv / shore);
        return [mix(142, 208, t), mix(164, 198, t), mix(190, 184, t)];
      }
      return [54, 66, 74];
    }),
  },
  {
    id: 'ref_34_pathway_depth',
    title: 'Winding S-Curve Path Into Woods',
    render: () => render2D(W, H, (u, v) => {
      if (v < 0.42) {
        return [mix(178, 224, v / 0.42), mix(192, 220, v / 0.42), mix(206, 210, v / 0.42)];
      }
      const depth = (v - 0.42) / 0.58;
      const pathCenter = 0.52 + 0.18 * Math.sin(depth * 4.2);
      const halfWidth = 0.02 + 0.16 * depth * depth;
      const dist = Math.abs(u - pathCenter);
      if (dist < halfWidth) {
        const tex = 0.85 + 0.25 * fbm(u * 25, v * 25, 3);
        return [186 * tex, 168 * tex, 142 * tex];
      }
      // Flanking shaded banks & distant trees
      const shade = 0.55 + 0.45 * smoothstep(halfWidth, halfWidth + 0.25, dist);
      const gTex = fbm(u * 14, v * 14, 3);
      return [96 * shade + gTex * 28, 114 * shade + gTex * 32, 74 * shade + gTex * 18];
    }),
  },
  {
    id: 'ref_35_notan_street',
    title: 'High-Contrast Sun & Shadow Alleyway (Notan)',
    render: () => renderRaymarch(W, H, {
      camPos: [-0.2, 1.15, 4.2],
      lookAt: [0, 1.0, 0],
      fov: 1.45,
      lightDir: norm([0.85, 0.72, 0.3]),
      bgTop: [242, 238, 228],
      bgBottom: [232, 226, 214],
      floorColor: [232, 224, 210],
      sceneFn: (p) => {
        const leftWall = sdBox(sub(p, [-1.45, 1.5, -0.5]), [0.45, 1.5, 3.5]);
        const rightWall = sdBox(sub(p, [1.35, 1.2, -0.5]), [0.45, 1.2, 3.5]);
        const arch = sdBox(sub(p, [0, 2.35, -1.5]), [1.4, 0.35, 0.45]);
        const crate = sdBox(sub(p, [-0.7, 0.32, 0.8]), [0.32, 0.32, 0.32]);
        return [Math.min(leftWall, rightWall, arch, crate), 1, 236, 228, 214, 0.88];
      },
    }),
  },
  {
    id: 'ref_36_rocks_canyon',
    title: 'Stratified Rock Cliff Planes',
    render: () => renderRaymarch(W, H, {
      camPos: [0.4, 1.25, 3.8],
      lookAt: [0, 0.85, 0],
      lightDir: norm([0.75, 0.82, 0.48]),
      bgTop: [176, 198, 220],
      bgBottom: [228, 222, 210],
      floorColor: [188, 174, 152],
      sceneFn: (p) => {
        const r1 = sdBox(rotY(rotZ(sub(p, [-0.35, 0.85, -0.1]), 0.14), 0.35), [0.65, 0.85, 0.55]);
        const r2 = sdBox(rotY(rotZ(sub(p, [0.55, 0.55, 0.25]), -0.18), -0.4), [0.55, 0.55, 0.5]);
        const r3 = sdBox(rotY(sub(p, [0.1, 0.28, 0.8]), 0.2), [0.38, 0.28, 0.32]);
        const strata = Math.sin(p[1] * 22) * 0.025;
        return [Math.min(r1, r2, r3) + strata, 1, 186, 160, 134, 0.9];
      },
    }),
  },

  // DAYS 29-30 CAPSTONE
  {
    id: 'ref_37_capstone_traveler',
    title: 'Capstone — Traveler Overlooking Layered Valley',
    render: () => render2D(W, H, (u, v) => {
      // Golden hour sky + layered ridges + foreground cliff & silhouette figure
      let r = mix(118, 245, smoothstep(0.0, 0.65, v));
      let g = mix(138, 214, smoothstep(0.0, 0.65, v));
      let b = mix(174, 176, smoothstep(0.0, 0.65, v));

      const r1 = 0.48 - 0.12 * fbm(u * 4 + 2, 1.5, 4);
      const r2 = 0.62 - 0.14 * fbm(u * 5 + 5, 3.2, 4);
      if (v > r1) { r = 164; g = 158; b = 172; }
      if (v > r2) { r = 104; g = 106; b = 122; }

      // Foreground cliff on left third
      const cliff = 0.72 + 0.14 * smoothstep(0.2, 0.55, u) - 0.04 * fbm(u * 12, v * 12, 3);
      if (v > cliff) {
        return [42, 40, 44];
      }
      // Silhouette traveler standing at (0.31, ~0.58..0.74)
      const fx = Math.abs(u - 0.31);
      if (v > 0.57 && v < 0.75) {
        const w = v < 0.61 ? 0.015 : v < 0.68 ? 0.026 : 0.020;
        if (fx < w) return [32, 30, 34];
      }
      return [r, g, b];
    }),
  },
  {
    id: 'ref_38_capstone_studio',
    title: 'Capstone — Sunlit Bust & Still-Life Interior',
    render: () => renderRaymarch(W, H, {
      camPos: [0.35, 1.15, 3.6],
      lookAt: [0, 0.8, 0],
      lightDir: norm([0.82, 0.68, 0.42]),
      bgTop: [56, 54, 52],
      bgBottom: [34, 33, 31],
      floorColor: [112, 102, 92],
      sceneFn: (p) => {
        const table = sdBox(sub(p, [0, 0.25, 0]), [1.2, 0.25, 0.85]);
        const bust = makeLoomisHeadSDF(-0.35, 0.05, [232, 224, 212])(sub(p, [-0.28, 0.45, -0.05]));
        const sphere = sdSphere(p, [0.42, 0.72, 0.22], 0.22);
        const vase = sdCylinderY(sub(p, [0.58, 0.86, -0.25]), 0.36, 0.16);
        if (table < bust[0] && table < sphere && table < vase) return [table, 2, 138, 122, 106, 0.85];
        if (sphere < bust[0] && sphere < vase) return [sphere, 3, 210, 198, 182, 0.68];
        if (vase < bust[0]) return [vase, 4, 176, 152, 132, 0.72];
        return bust;
      },
    }),
  },
  {
    id: 'ref_39_capstone_archway',
    title: 'Capstone — Monumental Archway & Scale Figure',
    render: () => renderRaymarch(W, H, {
      camPos: [0, 1.0, 4.4],
      lookAt: [0, 1.15, 0],
      fov: 1.4,
      lightDir: norm([0.7, 0.82, 0.5]),
      bgTop: [188, 206, 224],
      bgBottom: [236, 230, 218],
      floorColor: [204, 196, 182],
      sceneFn: (p) => {
        const lPillar = sdBox(sub(p, [-1.15, 1.15, 0]), [0.35, 1.15, 0.42]);
        const rPillar = sdBox(sub(p, [1.15, 1.15, 0]), [0.35, 1.15, 0.42]);
        const lintel = sdBox(sub(p, [0, 2.35, 0]), [1.55, 0.28, 0.48]);
        // Small scale figure inside arch
        const fig = sdCapsule(p, [0.22, 0.05, -0.3], [0.22, 0.62, -0.3], 0.065);
        const figHead = sdSphere(p, [0.22, 0.72, -0.3], 0.055);
        const archD = Math.min(lPillar, rPillar, lintel);
        const figD = Math.min(fig, figHead);
        return figD < archD ? [figD, 2, 72, 68, 64, 0.8] : [archD, 1, 224, 215, 200, 0.86];
      },
    }),
  },
  {
    id: 'ref_40_capstone_dusk',
    title: 'Capstone — Dusk Lantern & Cool Horizon',
    render: () => render2D(W, H, (u, v) => {
      let r = mix(34, 96, v), g = mix(42, 86, v), b = mix(72, 108, v);
      if (v > 0.64) {
        r = mix(38, 26, (v - 0.64) / 0.36);
        g = mix(44, 28, (v - 0.64) / 0.36);
        b = mix(54, 34, (v - 0.64) / 0.36);
      }
      // Warm lantern glow on lower-right third (0.68, 0.66)
      const d = Math.hypot((u - 0.68) * 1.1, v - 0.64);
      const glow = Math.exp(-d * 6.5);
      r += glow * 215;
      g += glow * 145;
      b += glow * 55;
      if (d < 0.032) {
        return [255, 238, 196];
      }
      return [r, g, b];
    }),
  },
];

// ---------------------------------------------------------------------------
// App Icons & Splash Generator
// ---------------------------------------------------------------------------
function generateAppIcons() {
  const mkIcon = (size, transparentBg = false, monochrome = false) => {
    const buf = Buffer.alloc(size * size * 4);
    const cx = size * 0.5, cy = size * 0.5;
    const sphereR = size * 0.27;
    const ringR = size * 0.38;
    const ringThick = size * 0.026;
    const light = norm([0.65, -0.65, 0.55]);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const idx = (y * size + x) * 4;

        let r = 250, g = 247, b = 240, a = transparentBg ? 0 : 255;

        // Subtle outer compass/frame ring
        if (Math.abs(dist - ringR) < ringThick) {
          if (monochrome) {
            r = 255; g = 255; b = 255; a = 255;
          } else {
            r = 56; g = 52; b = 46; a = 255;
          }
        }
        // Center shaded sphere (classic drawing foundation icon)
        if (dist <= sphereR) {
          const nx = dx / sphereR;
          const ny = dy / sphereR;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const lit = clamp(dot([nx, ny, nz], light) * 0.8 + 0.28, 0.14, 1.0);
          if (monochrome) {
            const v = Math.round(255 * lit);
            r = v; g = v; b = v; a = 255;
          } else {
            r = Math.round(235 * lit);
            g = Math.round(224 * lit);
            b = Math.round(205 * lit);
            a = 255;
          }
        }
        // Diagonal pencil stroke accent
        const px = dx * 0.707 - dy * 0.707;
        const py = dx * 0.707 + dy * 0.707;
        if (Math.abs(py - size * 0.24) < size * 0.016 && Math.abs(px) < size * 0.28) {
          if (monochrome) {
            r = 255; g = 255; b = 255; a = 255;
          } else {
            r = 186; g = 98; b = 62; a = 255;
          }
        }

        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
      }
    }
    return encodePNG(size, size, buf, true);
  };

  fs.writeFileSync(path.join(IMG_DIR, 'icon.png'), mkIcon(1024, false, false));
  fs.writeFileSync(path.join(IMG_DIR, 'android-icon-foreground.png'), mkIcon(1024, true, false));
  fs.writeFileSync(path.join(IMG_DIR, 'android-icon-monochrome.png'), mkIcon(1024, true, true));
  fs.writeFileSync(path.join(IMG_DIR, 'splash-icon.png'), mkIcon(512, true, false));
  fs.writeFileSync(path.join(IMG_DIR, 'favicon.png'), mkIcon(128, false, false));

  // Solid warm paper background for adaptive icon
  const bg = Buffer.alloc(1024 * 1024 * 3);
  for (let i = 0; i < bg.length; i += 3) {
    bg[i] = 250; bg[i + 1] = 247; bg[i + 2] = 240;
  }
  fs.writeFileSync(path.join(IMG_DIR, 'android-icon-background.png'), encodePNG(1024, 1024, bg, false));
}

// ---------------------------------------------------------------------------
// Gentle Harmonic Chime WAV (44.1kHz mono 16-bit PCM)
// ---------------------------------------------------------------------------
function generateChimeWav() {
  const sampleRate = 44100;
  const durationSec = 1.4;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM
  buf.writeUInt16LE(1, 20);  // mono
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  // Soft Tibetan-bell / acoustic chime (C5 + G5 + E6 partials)
  const freqs = [523.25, 783.99, 1318.51];
  const amps = [0.52, 0.26, 0.12];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.015);
    const env = attack * Math.exp(-t * 3.1);
    let s = 0;
    for (let k = 0; k < freqs.length; k++) {
      s += amps[k] * Math.sin(2 * Math.PI * freqs[k] * t) * Math.exp(-t * k * 1.1);
    }
    const val = clamp(Math.round(s * env * 22000), -32767, 32767);
    buf.writeInt16LE(val, 44 + i * 2);
  }
  fs.writeFileSync(path.join(SND_DIR, 'chime.wav'), buf);
}

// ---------------------------------------------------------------------------
// Main Execution
// ---------------------------------------------------------------------------
console.log('Generating app icons and chime...');
generateAppIcons();
generateChimeWav();

console.log(`Rendering ${REFERENCES.length} reference plates + grayscale twins...`);
const registryLines = [
  '/* Auto-generated by scripts/generate-assets.mjs */',
  'import { ImageSourcePropType } from "react-native";',
  '',
  'export interface ReferenceAssetPair {',
  '  color: ImageSourcePropType;',
  '  gray: ImageSourcePropType;',
  '}',
  '',
  'export const REFERENCE_ASSETS: Record<string, ReferenceAssetPair> = {',
];

let totalBytes = 0;
for (const ref of REFERENCES) {
  const colorBuf = ref.render();
  const grayBuf = toGrayscaleBuffer(colorBuf);
  const colorPng = encodePNG(W, H, colorBuf, false);
  const grayPng = encodePNG(W, H, grayBuf, false);

  const colorPath = path.join(REF_DIR, `${ref.id}.png`);
  const grayPath = path.join(REF_DIR, `${ref.id}_gray.png`);
  fs.writeFileSync(colorPath, colorPng);
  fs.writeFileSync(grayPath, grayPng);
  totalBytes += colorPng.length + grayPng.length;

  registryLines.push(
    `  "${ref.id}": { color: require("../../assets/references/${ref.id}.png"), gray: require("../../assets/references/${ref.id}_gray.png") },`
  );
  console.log(`  ✓ ${ref.id} (${Math.round(colorPng.length / 1024)}KB + ${Math.round(grayPng.length / 1024)}KB gray)`);
}

registryLines.push('};', '');
fs.writeFileSync(REG_PATH, registryLines.join('\n'));

console.log(`Done! Total reference bundle size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
