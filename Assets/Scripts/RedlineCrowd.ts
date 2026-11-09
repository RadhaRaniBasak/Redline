/**
 * RedlineCrowd — the ghost crowd (plain helper owned by RedlineMain).
 *
 * Owns: a pool of ghost bodies (two shared code-built meshes, the figure and its slightly brighter top
 *       edge, in a few shades of the ghost colour — each shade one shared unlit material pair; a body
 *       gets its own pair only while it fades, so the rest of the crowd keeps batching) and two merged
 *       footprint meshes: the normal pairs, and the pairs inside the highlighted square, which glow
 *       brighter and draw over the bodies.
 * Clear circle: a body whose spot is inside the circle lerps its colour to black over fadeSeconds
 *       and then switches off (black reads as see-through on the additive display, and an off body
 *       can't hide its own footprints). Bodies are never moved, so the density stays true; footprints
 *       never fade.
 * Sway: every body leans a little about its feet (feet and footprints never move). Each shifts its
 *       weight on its own; at 6-7 per m² a slow shared wave also runs through the crowd toward the
 *       stage, the way a crowd packed past ~5 per m² starts moving as one.
 * Must not: decide density, layout or visibility — RedlineMain and RedlineGeometry do.
 */
import {GhostSpot, GhostPart, ZoneRect, MeshData, addGhostBodyPart, addFootprints, inRect, GHOST_MODEL_HEIGHT} from "./RedlineGeometry"
import {MeshSlot, newMeshBuilder, unlitMaterial, FLOOR_ORDER, BODY_ORDER, HIGHLIGHT_ORDER} from "./RedlineZoneView"

const FOOT_COLOR = new vec4(0.5, 0.5, 0.56, 1)
const SQUARE_FOOT_COLOR = new vec4(1, 0.95, 0.6, 1)
const FOOT_Y = 0.4
const PARTS: GhostPart[] = ["body", "top"]
const DEG = Math.PI / 180
const IDLE_DEG = 0.8 // each body's own weight shift (head moves ~2 cm)
const IDLE_PERIOD_S = 6
const WAVE_DEG: {[density: number]: number} = {6: 2.5, 7: 4} // shared sway past the redline (head moves ~7-12 cm)
const WAVE_PERIOD_S = 5
const WAVE_LENGTH_CM = 350
const WAVE_EASE_S = 1.2
// People come in a few shades of the ghost colour (brightness x hue tilt), so neighbours read as
// different people. Each shade is one shared material pair, so the crowd still batches.
const SHADES: [number, number, number][] = [
  [0.78, 0.95, 1.05], // darker, a touch bluer
  [1.0, 1.0, 1.0], // the base colour
  [1.15, 1.08, 0.95], // lighter, a touch warmer
  [0.9, 1.05, 0.9], // a touch greener
  [1.25, 1.2, 1.15], // lightest
] // the wave builds up / dies down instead of snapping

interface Body {
  so: SceneObject
  rmvs: RenderMeshVisual[] // one per part: [figure, top edge]
  mats: Material[] | null // the body's own pair while it's fading; null = drawing with the shared pair
  shade: number // index into SHADES
  fade: number // 0 = full colour, 1 = black and switched off
  yaw: number
  seed: number // 0..1: the body's own sway phase and period
}

export class Crowd {
  private root: SceneObject
  private builders: MeshBuilder[] = [] // kept alive: they own the shared meshes
  private meshes: RenderMesh[] = []
  private colors: vec4[][] // [shade][part]
  private shared: Material[][] // [shade][part], used by every body of that shade that isn't fading
  private pool: Body[] = []
  private spots: GhostSpot[] = []
  private feet: MeshSlot
  private squareFeet: MeshSlot
  private waveDeg = 0

  constructor(parent: SceneObject, color: vec3, topEdgeGain: number) {
    const top = color.uniformScale(topEdgeGain)
    const c1 = (v: number) => Math.min(1, v)
    this.colors = SHADES.map(([k, g, b]) => [
      new vec4(c1(color.x * k), c1(color.y * k * g), c1(color.z * k * b), 1),
      new vec4(c1(top.x * k), c1(top.y * k * g), c1(top.z * k * b), 1),
    ])
    this.root = global.scene.createSceneObject("Crowd")
    this.root.setParent(parent)
    for (const part of PARTS) {
      const m = new MeshData()
      addGhostBodyPart(m, part)
      const b = newMeshBuilder()
      b.appendVerticesInterleaved(m.verts)
      b.appendIndices(m.indices)
      b.updateMesh()
      this.builders.push(b)
      this.meshes.push(b.getMesh())
    }
    this.shared = this.colors.map((pair) => pair.map((c) => unlitMaterial(c)))
    this.feet = new MeshSlot(this.root, "Footprints", unlitMaterial(FOOT_COLOR), FLOOR_ORDER)
    this.squareFeet = new MeshSlot(this.root, "SquareFootprints", unlitMaterial(SQUARE_FOOT_COLOR, "onTop"), HIGHLIGHT_ORDER)
  }

  /** Show exactly these spots (empty = no crowd). Bodies already inside the circle start faded. */
  setSpots(spots: GhostSpot[], userX: number, userZ: number, radiusCm: number): void {
    this.spots = spots
    while (this.pool.length < spots.length) this.pool.push(this.makeBody(this.pool.length))
    for (let i = 0; i < this.pool.length; i++) {
      const b = this.pool[i]
      if (i >= spots.length) {
        b.so.enabled = false
        continue
      }
      const s = spots[i]
      const t = b.so.getTransform()
      t.setLocalPosition(new vec3(s.x, 0, s.z))
      t.setLocalRotation(quat.angleAxis(s.yaw, vec3.up()))
      const k = s.height / GHOST_MODEL_HEIGHT
      t.setLocalScale(new vec3(k, k, k))
      b.yaw = s.yaw
      b.fade = this.inside(s, userX, userZ, radiusCm) ? 1 : 0
      this.applyFade(b)
    }
    const feet = new MeshData()
    const squareFeet = new MeshData()
    for (const s of spots) addFootprints(s.inSquare ? squareFeet : feet, s, FOOT_Y)
    this.feet.set(feet)
    this.squareFeet.set(squareFeet)
  }

  /** Advance the clear-circle fade one frame; returns how many spots are inside the circle. */
  updateFade(userX: number, userZ: number, radiusCm: number, dt: number, fadeSeconds: number): number {
    const step = fadeSeconds > 0 ? dt / fadeSeconds : 1
    let inside = 0
    for (let i = 0; i < this.spots.length; i++) {
      const isIn = this.inside(this.spots[i], userX, userZ, radiusCm)
      if (isIn) inside++
      const b = this.pool[i]
      const target = isIn ? 1 : 0
      if (b.fade !== target) {
        b.fade = target > b.fade ? Math.min(1, b.fade + step) : Math.max(0, b.fade - step)
        this.applyFade(b)
      }
    }
    return inside
  }

  /** Lean every drawn body about its feet: its own weight shift, plus the shared wave at 6-7 per m². */
  sway(time: number, dt: number, density: number): void {
    this.waveDeg += ((WAVE_DEG[density] || 0) - this.waveDeg) * Math.min(1, dt / WAVE_EASE_S)
    for (let i = 0; i < this.spots.length; i++) {
      const b = this.pool[i]
      if (!b.so.enabled) continue
      const own = 2 * Math.PI * (time / (IDLE_PERIOD_S * (0.8 + 0.5 * b.seed)) + b.seed)
      let fwd = IDLE_DEG * Math.sin(own)
      let side = IDLE_DEG * 0.7 * Math.sin(1.3 * own + 2 * Math.PI * b.seed)
      if (this.waveDeg > 0.01) {
        // Crests sit where time / T + z / λ is constant, so they travel toward -z: the stage.
        const wave = 2 * Math.PI * (time / WAVE_PERIOD_S + this.spots[i].z / WAVE_LENGTH_CM)
        fwd += this.waveDeg * Math.sin(wave)
        side += this.waveDeg * 0.35 * Math.sin(0.5 * wave + 1)
      }
      const lean = quat.angleAxis(fwd * DEG, vec3.right()).multiply(quat.angleAxis(side * DEG, vec3.forward()))
      b.so.getTransform().setLocalRotation(lean.multiply(quat.angleAxis(b.yaw, vec3.up())))
    }
  }

  /** Current strength of the shared wave, in degrees of lean (0 below the redline). */
  get waveDegrees(): number {
    return this.waveDeg
  }

  get count(): number {
    return this.spots.length
  }

  /** Footprint pairs whose spot lies inside a rect (the highlighted square). */
  countIn(rect: ZoneRect): number {
    let n = 0
    for (const s of this.spots) if (inRect(rect, s.x, s.z)) n++
    return n
  }

  /** Bodies still drawn whose spot is within r of (x, z) — 0 inside the clear circle once faded. */
  visibleBodiesWithin(x: number, z: number, radiusCm: number): number {
    let n = 0
    for (let i = 0; i < this.spots.length; i++) {
      if (this.pool[i].so.enabled && this.inside(this.spots[i], x, z, radiusCm)) n++
    }
    return n
  }

  private inside(s: GhostSpot, x: number, z: number, r: number): boolean {
    const dx = s.x - x
    const dz = s.z - z
    return dx * dx + dz * dz < r * r
  }

  private applyFade(b: Body): void {
    b.so.enabled = b.fade < 1
    if (b.fade <= 0) {
      if (b.mats) {
        b.mats = null
        b.rmvs.forEach((r, p) => (r.mainMaterial = this.shared[b.shade][p]))
      }
      return
    }
    if (!b.mats) {
      b.mats = this.shared[b.shade].map((m) => m.clone())
      b.rmvs.forEach((r, p) => (r.mainMaterial = b.mats![p]))
    }
    const k = 1 - b.fade
    for (let p = 0; p < b.mats.length; p++) {
      const c = this.colors[b.shade][p]
      b.mats[p].mainPass.baseColor = new vec4(c.x * k, c.y * k, c.z * k, 1)
    }
  }

  private makeBody(i: number): Body {
    const so = global.scene.createSceneObject(`Ghost${i}`)
    so.setParent(this.root)
    const shade = Math.floor(((i * 0.7548776662) % 1) * SHADES.length) // spread shades evenly, no stripes
    const rmvs = this.meshes.map((mesh, p) => {
      const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = mesh
      rmv.setRenderOrder(BODY_ORDER)
      rmv.mainMaterial = this.shared[shade][p]
      return rmv
    })
    return {so, rmvs, mats: null, shade, fade: 0, yaw: 0, seed: (i * 0.6180339887) % 1} // golden-ratio spread of phases
  }
}
