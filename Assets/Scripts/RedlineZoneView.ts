/**
 * RedlineZoneView — runtime visuals for the zone (plain helper owned by RedlineMain).
 *
 * Owns: the light zone outline, the floor tint, the glowing highlighted square, the four corner
 *       handles (real SIK Interactables on box colliders; they highlight when aimed at and report
 *       drags as ray-floor hits in zone-local cm), the floor arrow, and the fallback virtual-floor
 *       grid. Also exports the render helpers the crowd shares (MeshSlot, newMeshBuilder, unlitMaterial).
 * Must not: own state — RedlineMain decides the rect, tint, visibility and what a drag means.
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {DragInteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {ZoneRect, MeshData, addRectOutline, addFloorQuad, addDisc, addArrow, squareRect, zoneCorner} from "./RedlineGeometry"

const BASE_MATERIAL = requireAsset("../Materials/RedlineUnlit.mat") as Material

/** Unlit clone. opaque: solid + depth; tint: see-through blend, no depth write; onTop: solid, drawn over everything. */
export function unlitMaterial(color: vec4, mode: "opaque" | "tint" | "onTop" = "opaque"): Material {
  const m = BASE_MATERIAL.clone()
  m.mainPass.baseColor = color
  m.mainPass.blendMode = mode === "tint" ? BlendMode.Normal : BlendMode.Disabled
  m.mainPass.depthTest = mode !== "onTop"
  m.mainPass.depthWrite = mode === "opaque"
  return m
}

export function newMeshBuilder(): MeshBuilder {
  const b = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3, normalized: true},
    {name: "texture0", components: 2}
  ])
  b.topology = MeshTopology.Triangles
  b.indexType = MeshIndexType.UInt16
  return b
}

/** A SceneObject + RenderMeshVisual whose mesh can be rebuilt in place from MeshData. */
export class MeshSlot {
  readonly so: SceneObject
  readonly rmv: RenderMeshVisual
  private builder: MeshBuilder = newMeshBuilder()

  constructor(parent: SceneObject, name: string, material: Material, renderOrder: number = 0) {
    this.so = global.scene.createSceneObject(name)
    this.so.setParent(parent)
    this.rmv = this.so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.rmv.mainMaterial = material
    this.rmv.setRenderOrder(renderOrder)
    this.rmv.enabled = false
  }

  set(data: MeshData): void {
    const b = this.builder
    if (b.getIndicesCount() > 0) b.eraseIndices(0, b.getIndicesCount())
    if (b.getVerticesCount() > 0) b.eraseVertices(0, b.getVerticesCount())
    if (data.indices.length === 0) {
      this.rmv.enabled = false
      return
    }
    b.appendVerticesInterleaved(data.verts)
    b.appendIndices(data.indices)
    b.updateMesh()
    this.rmv.mesh = b.getMesh()
    this.rmv.enabled = true
  }
}

export type DragPhase = "start" | "move" | "end"

const OUTLINE_COLOR = new vec4(0.78, 0.78, 0.84, 1)
const SQUARE_COLOR = new vec4(1, 0.95, 0.6, 1)
const HANDLE_COLOR = new vec4(0.35, 0.85, 1, 1)
const HANDLE_HOVER_COLOR = new vec4(1, 1, 1, 1)
const ARROW_COLOR = new vec4(1, 0.85, 0.2, 1)
const GRID_COLOR = new vec4(0.22, 0.22, 0.26, 1)
const HANDLE_RADIUS_CM = 7.5 // ~15 cm across
const HANDLE_TARGET_CM = 32 // collider is twice the disc: big target, easy to aim at from metres away
const ARROW_LENGTH_CM = 25
// Render queue (ascending): floor marks, see-through tint, ghost bodies, then the square highlight drawn
// over the bodies (depth test off) — all below the UIKit clipboard and floor text at the default 0, so the
// highlight never paints over the UI.
export const FLOOR_ORDER = -40
export const TINT_ORDER = -30
export const BODY_ORDER = -20
export const HIGHLIGHT_ORDER = -10

interface Handle {
  so: SceneObject
  visual: SceneObject
  mat: Material
  collider: ColliderComponent
}

export class ZoneView {
  private zoneRoot: SceneObject
  private arrowRoot: SceneObject
  private floorRoot: SceneObject
  private onDrag: (corner: number, x: number, z: number, phase: DragPhase) => void
  private outline: MeshSlot
  private tint: MeshSlot
  private tintMat: Material
  private square: MeshSlot
  private handlesRoot: SceneObject
  private handles: Handle[] = []
  private arrow: MeshSlot

  constructor(
    zoneRoot: SceneObject,
    arrowRoot: SceneObject,
    floorRoot: SceneObject,
    onDrag: (corner: number, x: number, z: number, phase: DragPhase) => void,
    debugColliders: boolean
  ) {
    this.zoneRoot = zoneRoot
    this.arrowRoot = arrowRoot
    this.floorRoot = floorRoot
    this.onDrag = onDrag
    this.outline = new MeshSlot(zoneRoot, "Outline", unlitMaterial(OUTLINE_COLOR), FLOOR_ORDER)
    this.tintMat = unlitMaterial(new vec4(0, 0, 0, 0), "tint")
    this.tint = new MeshSlot(zoneRoot, "FloorTint", this.tintMat, TINT_ORDER)
    this.square = new MeshSlot(zoneRoot, "HighlightedSquare", unlitMaterial(SQUARE_COLOR, "onTop"), HIGHLIGHT_ORDER)
    this.handlesRoot = global.scene.createSceneObject("CornerHandles")
    this.handlesRoot.setParent(zoneRoot)
    for (let i = 0; i < 4; i++) this.handles.push(this.makeHandle(i, debugColliders))

    this.arrow = new MeshSlot(arrowRoot, "ArrowMesh", unlitMaterial(ARROW_COLOR), FLOOR_ORDER)
    const a = new MeshData()
    addArrow(a, ARROW_LENGTH_CM, 0)
    this.arrow.set(a)
    this.arrowRoot.enabled = false
    this.floorRoot.enabled = false
  }

  /** Rebuild everything that depends on the rect (zone-local cm). */
  update(rect: ZoneRect): void {
    const o = new MeshData()
    addRectOutline(o, rect, 3, 0.6)
    this.outline.set(o)
    const t = new MeshData()
    addFloorQuad(t, rect.minX, rect.minZ, rect.maxX, rect.maxZ, 0.2)
    this.tint.set(t)
    const s = new MeshData()
    addRectOutline(s, squareRect(rect), 3, 0.8)
    this.square.set(s)
    for (let i = 0; i < 4; i++) {
      const [x, z] = zoneCorner(rect, i)
      this.handles[i].so.getTransform().setLocalPosition(new vec3(x, 0, z))
    }
  }

  /** null hides the tint. */
  setTint(color: vec4 | null): void {
    this.tint.so.enabled = color !== null
    if (color) this.tintMat.mainPass.baseColor = color
  }

  get tintColor(): vec4 | null {
    return this.tint.so.enabled ? this.tintMat.mainPass.baseColor : null
  }

  setSquareVisible(visible: boolean): void {
    this.square.so.enabled = visible
  }

  setHandlesVisible(visible: boolean): void {
    this.handlesRoot.enabled = visible
  }

  get handlesVisible(): boolean {
    return this.handlesRoot.enabled
  }

  showArrow(worldPos: vec3, yaw: number): void {
    const t = this.arrowRoot.getTransform()
    t.setWorldPosition(worldPos)
    t.setWorldRotation(quat.angleAxis(yaw, vec3.up()))
    this.arrowRoot.enabled = true
  }

  hideArrow(): void {
    this.arrowRoot.enabled = false
  }

  /** Fallback stand-in when no real floor was found: a faint 10 x 10 m grid, aligned with the zone. */
  showVirtualFloor(): void {
    const zt = this.zoneRoot.getTransform()
    const ft = this.floorRoot.getTransform()
    ft.setWorldPosition(zt.getWorldPosition())
    ft.setWorldRotation(zt.getWorldRotation())
    const g = new MeshData()
    for (let k = -5; k <= 5; k++) {
      addFloorQuad(g, k * 100 - 0.75, -500, k * 100 + 0.75, 500, 0.1)
      addFloorQuad(g, -500, k * 100 - 0.75, 500, k * 100 + 0.75, 0.1)
    }
    new MeshSlot(this.floorRoot, "Grid", unlitMaterial(GRID_COLOR), FLOOR_ORDER).set(g)
    this.floorRoot.enabled = true
  }

  private makeHandle(i: number, debugColliders: boolean): Handle {
    const so = global.scene.createSceneObject(`Handle${i}`)
    so.setParent(this.handlesRoot)
    const collider = so.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(HANDLE_TARGET_CM, 20, HANDLE_TARGET_CM)
    collider.shape = shape
    collider.fitVisual = false
    collider.debugDrawEnabled = debugColliders

    const mat = unlitMaterial(HANDLE_COLOR)
    const visual = new MeshSlot(so, "Disc", mat, FLOOR_ORDER)
    const d = new MeshData()
    addDisc(d, 0, 0, HANDLE_RADIUS_CM, 0, 2.5, 20)
    visual.set(d)

    const handle: Handle = {so, visual: visual.so, mat, collider}
    const interactable = so.createComponent(Interactable.getTypeName()) as Interactable
    interactable.onHoverEnter.add(() => this.highlight(handle, true))
    interactable.onHoverExit.add(() => this.highlight(handle, false))
    interactable.onDragStart.add((e: DragInteractorEvent) => this.drag(i, e, "start"))
    interactable.onDragUpdate.add((e: DragInteractorEvent) => this.drag(i, e, "move"))
    interactable.onDragEnd.add((e: DragInteractorEvent) => this.drag(i, e, "end"))
    return handle
  }

  private highlight(h: Handle, on: boolean): void {
    h.mat.mainPass.baseColor = on ? HANDLE_HOVER_COLOR : HANDLE_COLOR
    const k = on ? 1.3 : 1 // scale the leaf visual only; the collider wrapper stays unit scale
    h.visual.getTransform().setLocalScale(new vec3(k, k, k))
  }

  /** Interactor ray → floor plane (the zone root's height) → zone-local cm. */
  private drag(corner: number, e: DragInteractorEvent, phase: DragPhase): void {
    const origin = e.interactor.startPoint
    const dir = e.interactor.direction
    if (origin && dir && Math.abs(dir.y) > 1e-4) {
      const zt = this.zoneRoot.getTransform()
      const t = (zt.getWorldPosition().y - origin.y) / dir.y
      if (t > 0) {
        const local = zt.getInvertedWorldTransform().multiplyPoint(origin.add(dir.uniformScale(t)))
        this.onDrag(corner, local.x, local.z, phase)
        return
      }
    }
    if (phase === "end") this.onDrag(corner, NaN, NaN, "end")
  }
}
