/**
 * RedlineGeometry — pure math for Redline. No Lens globals, so it also runs under node for checks.
 *
 * Owns:
 *  - crowd placement: round(N x area) ghost spots on a jittered grid aligned to the highlighted
 *    1 x 1 m square at the zone centre, so every FULL square metre holds exactly N spots;
 *  - triangle data for every code-built mesh (ghost body, footprints, outlines, tint, handle disc, arrow).
 *
 * Units: zone-local centimetres. Zone frame: +x right, +y up, -z away from the user (toward the far edge).
 * Winding: every triangle is CCW seen from outside (or from above for floor shapes).
 * Must not: touch the scene or any Lens API.
 */

export interface ZoneRect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface GhostSpot {
  x: number // cm, zone-local
  z: number
  yaw: number // radians about +Y; 0 = facing -Z (the zone's far edge, the "stage")
  height: number // cm
  inSquare: boolean // spot lies inside the highlighted square
}

export const SQUARE_CM = 100
const MARGIN_CM = 12 // keeps spots (and most of their footprints) off cell edges
const ZONE_EDGE_CM = 22 // a body's half shoulder width: no body sticks out of the zone outline
/** Highest density the crowd can show (one point pattern per count, 0..MAX_DENSITY). */
export const MAX_DENSITY = 7
const JITTER_FRAC = 0.18 // jitter as a fraction of the local spacing
const STAGE_SPREAD = (25 * Math.PI) / 180 // everyone faces the stage, each turned up to this much at random
const MIN_HEIGHT_CM = 155
const MAX_HEIGHT_CM = 185

export function rectWidth(r: ZoneRect): number {
  return r.maxX - r.minX
}
export function rectDepth(r: ZoneRect): number {
  return r.maxZ - r.minZ
}
export function rectAreaM2(r: ZoneRect): number {
  return (rectWidth(r) / 100) * (rectDepth(r) / 100)
}
export function rectCenterX(r: ZoneRect): number {
  return (r.minX + r.maxX) / 2
}
export function rectCenterZ(r: ZoneRect): number {
  return (r.minZ + r.maxZ) / 2
}
export function squareRect(zone: ZoneRect): ZoneRect {
  const cx = rectCenterX(zone)
  const cz = rectCenterZ(zone)
  const h = SQUARE_CM / 2
  return {minX: cx - h, maxX: cx + h, minZ: cz - h, maxZ: cz + h}
}
type V3 = {x: number; y: number; z: number}
/**
 * Heading (radians about +Y) of a camera's forward vector, as atan2(f.x, f.z). The camera looks along
 * -forward, so looking steeply down (f.y > 0) its up points the way the face points (= -f), and looking
 * steeply up its up points back (= +f); either way the up vector gives a stable heading.
 */
export function yawOf(forward: V3, up: V3): number {
  if (Math.hypot(forward.x, forward.z) > 0.2) return Math.atan2(forward.x, forward.z)
  const s = forward.y > 0 ? -1 : 1
  return Math.atan2(s * up.x, s * up.z)
}
export function inRect(r: ZoneRect, x: number, z: number): boolean {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ
}
/** Zone size limits (cm): 2..10 m each way, so the zone can be stretched over a whole room. */
// ponytail: 10 x 10 m at 7 per m² is 700 ghosts — check frame time on device before raising further.
export const ZONE_LIMITS = {minW: 200, maxW: 1000, minD: 200, maxD: 1000}

/** Corner i (zone-local cm): 0 near-left, 1 near-right, 2 far-right, 3 far-left. Opposite = (i + 2) % 4. */
export function zoneCorner(r: ZoneRect, i: number): [number, number] {
  const k = ((i % 4) + 4) % 4
  if (k === 0) return [r.minX, r.maxZ]
  if (k === 1) return [r.maxX, r.maxZ]
  if (k === 2) return [r.maxX, r.minZ]
  return [r.minX, r.minZ]
}

/** Drag corner i to (x, z): the opposite corner stays put, the zone stays a rectangle within ZONE_LIMITS. */
export function dragCornerTo(r: ZoneRect, i: number, x: number, z: number): ZoneRect {
  const [fx, fz] = zoneCorner(r, i + 2)
  const [cx, cz] = zoneCorner(r, i)
  const sx = Math.sign(cx - fx) || 1
  const sz = Math.sign(cz - fz) || 1
  const w = Math.max(ZONE_LIMITS.minW, Math.min(ZONE_LIMITS.maxW, sx * (x - fx)))
  const d = Math.max(ZONE_LIMITS.minD, Math.min(ZONE_LIMITS.maxD, sz * (z - fz)))
  const nx = fx + sx * w
  const nz = fz + sz * d
  return {minX: Math.min(fx, nx), maxX: Math.max(fx, nx), minZ: Math.min(fz, nz), maxZ: Math.max(fz, nz)}
}

/** People in the zone at a density: round(N x area). */
export function peopleFor(density: number, zone: ZoneRect): number {
  return Math.round(density * rectAreaM2(zone))
}

/** mulberry32 — small seeded PRNG (CC0), so layouts are stable between runs. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Points per cell in the unit square, laid out in jitter-friendly rows (index = count, 0..7).
const PATTERNS: number[][][] = [
  [],
  [[0.5, 0.5]],
  [[0.25, 0.25], [0.75, 0.75]],
  [[0.25, 0.25], [0.75, 0.25], [0.5, 0.75]],
  [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], // dice five
  [[1 / 6, 0.25], [0.5, 0.25], [5 / 6, 0.25], [1 / 6, 0.75], [0.5, 0.75], [5 / 6, 0.75]],
  [[0.25, 1 / 6], [0.75, 1 / 6], [1 / 6, 0.5], [0.5, 0.5], [5 / 6, 0.5], [0.25, 5 / 6], [0.75, 5 / 6]]
]

interface Cell {
  i: number
  j: number
  x0: number
  x1: number
  z0: number
  z1: number
  full: boolean
  thin: boolean
  quota: number
  count: number
}

/**
 * Ghost spots for a zone at a density (0..7). Cells are 1 x 1 m, aligned so cell (0,0) is the
 * highlighted square. Full cells get exactly N spots; the remainder of round(N x area) is shared
 * among the cut cells at the zone edge by largest remainder, so the total is exact.
 */
export function layoutCrowd(zone: ZoneRect, density: number, seed: number = 7): GhostSpot[] {
  const n = Math.max(0, Math.min(MAX_DENSITY, Math.round(density)))
  if (n === 0) return []
  const total = peopleFor(n, zone)
  const sq = squareRect(zone)
  const i0 = Math.floor((zone.minX - sq.minX) / SQUARE_CM)
  const i1 = Math.ceil((zone.maxX - sq.minX) / SQUARE_CM) - 1
  const j0 = Math.floor((zone.minZ - sq.minZ) / SQUARE_CM)
  const j1 = Math.ceil((zone.maxZ - sq.minZ) / SQUARE_CM) - 1

  const cells: Cell[] = []
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const cx0 = sq.minX + i * SQUARE_CM
      const cz0 = sq.minZ + j * SQUARE_CM
      const x0 = Math.max(cx0, zone.minX)
      const x1 = Math.min(cx0 + SQUARE_CM, zone.maxX)
      const z0 = Math.max(cz0, zone.minZ)
      const z1 = Math.min(cz0 + SQUARE_CM, zone.maxZ)
      if (x1 - x0 <= 0.01 || z1 - z0 <= 0.01) continue
      const full = x1 - x0 >= SQUARE_CM - 0.01 && z1 - z0 >= SQUARE_CM - 0.01
      // A strip too thin to stand in (the zone-edge clamp would push its people into the next square)
      // takes no one; its share goes to the roomier cut cells below.
      const thin = !full && (x1 - x0 <= ZONE_EDGE_CM || z1 - z0 <= ZONE_EDGE_CM)
      const quota = (n * (x1 - x0) * (z1 - z0)) / (SQUARE_CM * SQUARE_CM)
      cells.push({i, j, x0, x1, z0, z1, full, thin, quota, count: full ? n : thin ? 0 : Math.floor(quota)})
    }
  }

  // Largest remainder over the cut cells so the grand total is exactly round(N x area).
  let placed = 0
  for (const c of cells) placed += c.count
  // Thin strips' shares can add up to more than one person per roomy cut cell, so loop until placed.
  const cut = cells.filter((c) => !c.full && !c.thin).sort((a, b) => b.quota - b.count - (a.quota - a.count) || a.i - b.i || a.j - b.j)
  for (let added = true; placed < total && added; ) {
    added = false
    for (let k = 0; k < cut.length && placed < total; k++) {
      if (cut[k].count < n) {
        cut[k].count++
        placed++
        added = true
      }
    }
  }

  const spots: GhostSpot[] = []
  for (const c of cells) {
    if (c.count <= 0) continue
    const r = rng(seed ^ Math.imul(c.i + 1000, 73856093) ^ Math.imul(c.j + 1000, 19349663) ^ Math.imul(n, 83492791))
    const w = c.x1 - c.x0
    const d = c.z1 - c.z0
    const jit = (JITTER_FRAC * Math.sqrt((w * d) / c.count))
    for (const p of PATTERNS[c.count]) {
      // Cell clamp, then zone clamp: a thin cut cell at the edge can't put a body over the outline.
      const x = clampIn(clampIn(c.x0 + p[0] * w + (r() * 2 - 1) * jit, c.x0, c.x1, MARGIN_CM), zone.minX, zone.maxX, ZONE_EDGE_CM)
      const z = clampIn(clampIn(c.z0 + p[1] * d + (r() * 2 - 1) * jit, c.z0, c.z1, MARGIN_CM), zone.minZ, zone.maxZ, ZONE_EDGE_CM)
      const yaw = (r() * 2 - 1) * STAGE_SPREAD
      const height = MIN_HEIGHT_CM + r() * (MAX_HEIGHT_CM - MIN_HEIGHT_CM)
      spots.push({x, z, yaw, height, inSquare: c.i === 0 && c.j === 0})
    }
  }
  return spots
}

function clampIn(v: number, lo: number, hi: number, margin: number): number {
  const m = Math.min(margin, (hi - lo) / 2)
  return Math.max(lo + m, Math.min(hi - m, v))
}

// ─── Mesh data ────────────────────────────────────────────────────────────────

/** Interleaved vertices: position(3) normal(3) uv(2). */
export class MeshData {
  verts: number[] = []
  indices: number[] = []
  get vertexCount(): number {
    return this.verts.length / 8
  }
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
    this.verts.push(x, y, z, nx, ny, nz, 0, 0)
    return this.vertexCount - 1
  }
  tri(a: number, b: number, c: number): void {
    this.indices.push(a, b, c)
  }
}

/** Ring for addLoft: [y, rx, rz, x offset?, z offset?] in cm. */
export type Ring = [number, number, number, number?, number?]

/** Elliptical rings lofted bottom-to-top around (cx, cz), capped at both ends (CCW from outside). */
export function addLoft(m: MeshData, cx: number, cz: number, rings: Ring[], segs: number = 14): void {
  const rs = rings.slice().sort((a, b) => a[0] - b[0])
  const rows = rs.map(([y, rx, rz, dx = 0, dz = 0]) => {
    const row: number[] = []
    for (let k = 0; k <= segs; k++) {
      const ph = (2 * Math.PI * k) / segs
      const c = Math.cos(ph), s = Math.sin(ph)
      const nl = Math.hypot(c / rx, s / rz)
      row.push(m.v(cx + dx + rx * c, y, cz + dz + rz * s, c / rx / nl, 0, s / rz / nl))
    }
    return row
  })
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let k = 0; k < segs; k++) {
      const b0 = rows[i][k], b1 = rows[i][k + 1], t0 = rows[i + 1][k], t1 = rows[i + 1][k + 1]
      m.tri(b0, t0, b1)
      m.tri(t0, t1, b1)
    }
  }
  const cap = (r: Ring, row: number[], up: boolean) => {
    const c = m.v(cx + (r[3] || 0), r[0], cz + (r[4] || 0), 0, up ? 1 : -1, 0)
    for (let k = 0; k < segs; k++) {
      if (up) m.tri(c, row[k + 1], row[k])
      else m.tri(c, row[k], row[k + 1])
    }
  }
  cap(rs[0], rows[0], false)
  cap(rs[rs.length - 1], rows[rows.length - 1], true)
}

/** Ellipsoid band between polar angles th0..th1 (degrees down from the top), CCW from outside. */
export function addEllipsoidBand(
  m: MeshData, cx: number, cy: number, cz: number, r: [number, number, number],
  th0Deg: number, th1Deg: number, lat: number, lon: number
): void {
  const base = m.vertexCount
  const t0 = (th0Deg * Math.PI) / 180, t1 = (th1Deg * Math.PI) / 180
  for (let i = 0; i <= lat; i++) {
    const th = t0 + ((t1 - t0) * i) / lat
    for (let j = 0; j <= lon; j++) {
      const ph = (2 * Math.PI * j) / lon
      const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph)
      m.v(cx + r[0] * nx, cy + r[1] * ny, cz + r[2] * nz, nx, ny, nz)
    }
  }
  const at = (i: number, j: number) => base + i * (lon + 1) + j
  const topPole = th0Deg <= 0, bottomPole = th1Deg >= 180
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      if (!(topPole && i === 0)) m.tri(at(i, j), at(i, j + 1), at(i + 1, j))
      if (!(bottomPole && i === lat - 1)) m.tri(at(i, j + 1), at(i + 1, j + 1), at(i + 1, j))
    }
  }
}

/** Up-facing axis-aligned floor quad. */
export function addFloorQuad(m: MeshData, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const a = m.v(x0, y, z1, 0, 1, 0)
  const b = m.v(x1, y, z1, 0, 1, 0)
  const c = m.v(x1, y, z0, 0, 1, 0)
  const d = m.v(x0, y, z0, 0, 1, 0)
  m.tri(a, b, c)
  m.tri(a, c, d)
}

/** Up-facing outline of a rect: four strips of width t centred on the edges. */
export function addRectOutline(m: MeshData, r: ZoneRect, t: number, y: number): void {
  const h = t / 2
  addFloorQuad(m, r.minX - h, r.maxZ - h, r.maxX + h, r.maxZ + h, y) // near
  addFloorQuad(m, r.minX - h, r.minZ - h, r.maxX + h, r.minZ + h, y) // far
  addFloorQuad(m, r.minX - h, r.minZ + h, r.minX + h, r.maxZ - h, y) // left
  addFloorQuad(m, r.maxX - h, r.minZ + h, r.maxX + h, r.maxZ - h, y) // right
}

/** Up-facing ellipse fan, rotated by yaw about +Y around its own centre. */
export function addFloorEllipse(m: MeshData, cx: number, cz: number, rx: number, rz: number, yaw: number, y: number, segs: number): void {
  const cs = Math.cos(yaw), sn = Math.sin(yaw)
  const c = m.v(cx, y, cz, 0, 1, 0)
  const ring: number[] = []
  for (let k = 0; k <= segs; k++) {
    const ph = (2 * Math.PI * k) / segs
    const lx = rx * Math.cos(ph), lz = rz * Math.sin(ph)
    ring.push(m.v(cx + lx * cs + lz * sn, y, cz - lx * sn + lz * cs, 0, 1, 0))
  }
  for (let k = 0; k < segs; k++) m.tri(c, ring[k + 1], ring[k])
}

/** A ghost's pair of footprint marks, toes toward the ghost's facing. */
export function addFootprints(m: MeshData, s: GhostSpot, y: number): void {
  const cs = Math.cos(s.yaw), sn = Math.sin(s.yaw)
  for (const side of [-1, 1]) {
    const lx = side * 8 // feet centres 16 cm apart
    addFloorEllipse(m, s.x + lx * cs, s.z - lx * sn, 4.5, 12, s.yaw, y, 10)
  }
}

/** Short upright cylinder standing on y0 (top cap + side; never seen from below). */
export function addDisc(m: MeshData, cx: number, cz: number, r: number, y0: number, y1: number, segs: number): void {
  const c = m.v(cx, y1, cz, 0, 1, 0)
  const top: number[] = []
  for (let k = 0; k <= segs; k++) {
    const ph = (2 * Math.PI * k) / segs
    top.push(m.v(cx + r * Math.cos(ph), y1, cz + r * Math.sin(ph), 0, 1, 0))
  }
  for (let k = 0; k < segs; k++) m.tri(c, top[k + 1], top[k])
  for (let k = 0; k < segs; k++) {
    const p0 = (2 * Math.PI * k) / segs, p1 = (2 * Math.PI * (k + 1)) / segs
    const n0x = Math.cos(p0), n0z = Math.sin(p0), n1x = Math.cos(p1), n1z = Math.sin(p1)
    const b0 = m.v(cx + r * n0x, y0, cz + r * n0z, n0x, 0, n0z)
    const t0 = m.v(cx + r * n0x, y1, cz + r * n0z, n0x, 0, n0z)
    const b1 = m.v(cx + r * n1x, y0, cz + r * n1z, n1x, 0, n1z)
    const t1 = m.v(cx + r * n1x, y1, cz + r * n1z, n1x, 0, n1z)
    m.tri(b0, t0, b1)
    m.tri(t0, t1, b1)
  }
}

/** Flat up-facing arrow pointing -Z, centred on the origin. */
export function addArrow(m: MeshData, length: number, y: number): void {
  const half = length / 2
  const headLen = length * 0.4
  addFloorQuad(m, -length * 0.12, -half + headLen, length * 0.12, half, y)
  const tip = m.v(0, y, -half, 0, 1, 0)
  const left = m.v(-length * 0.28, y, -half + headLen, 0, 1, 0)
  const right = m.v(length * 0.28, y, -half + headLen, 0, 1, 0)
  m.tri(tip, left, right)
}

/**
 * Standing figure ~171 cm tall, feet at y = 0, facing -Z: ~44 cm across the shoulders, ~28 cm chest
 * depth, arms hanging at the sides and a narrow neck under a round head. Two parts so the top edge can
 * be drawn a little brighter: "body" (legs, torso, arms, neck, head below the crown) and "top" (the
 * shoulder line and the crown). Scale by height / GHOST_MODEL_HEIGHT.
 */
export const GHOST_MODEL_HEIGHT = 171.5
export type GhostPart = "body" | "top"
const HEAD_Y = 160.5
const HEAD_R: [number, number, number] = [9, 11, 10] // round, a touch taller than wide
const CROWN_DEG = 50 // the head above this polar angle belongs to the bright top edge
const SHOULDER: Ring[] = [[135, 20.5, 13], [139, 22, 12], [142, 19, 10], [144.5, 12, 8], [146, 6, 6]]
export function addGhostBodyPart(m: MeshData, part: GhostPart): void {
  if (part === "top") {
    addLoft(m, 0, 0, SHOULDER)
    addEllipsoidBand(m, 0, HEAD_Y, 0.5, HEAD_R, 0, CROWN_DEG, 4, 14)
    return
  }
  for (const s of [-1, 1]) {
    // leg and foot (toes toward -Z)
    addLoft(m, s * 9, 0, [[0, 4.6, 9.5, 0, -3], [5, 4.4, 8, 0, -2], [11, 3.8, 4.6], [30, 5, 5.6], [46, 5.2, 5.6], [66, 7, 7.8], [84, 8.5, 9]])
    // arm hanging at the side, hand at the bottom
    addLoft(m, s * 19, 0, [[73, 2.6, 1.7, s * 0.3], [80, 3.4, 2.2, s * 0.4], [86, 3, 3.1, s * 0.4], [96, 3.4, 3.6, s * 0.3],
      [112, 3.9, 4.2], [124, 4.4, 4.8, -s * 0.3], [137, 4.2, 4.8, -s * 0.8]])
  }
  addLoft(m, 0, 0, [[80, 16, 10.5], [92, 15, 10.5], [102, 13.5, 10], [116, 15.5, 12.5], [128, 17.5, 14], [135, 20.5, 13]]) // torso
  addLoft(m, 0, 0.5, [[143, 5.2, 5.2], [153, 4.8, 4.8]]) // neck
  addEllipsoidBand(m, 0, HEAD_Y, 0.5, HEAD_R, CROWN_DEG, 180, 6, 14) // head below the crown
}
