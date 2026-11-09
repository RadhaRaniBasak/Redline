/**
 * RedlineFloorLabelsUI — passive view: the text Redline writes flat on the floor.
 *
 * Owns: the near-edge label (full form: area / people at 2 per m² / people at 5 per m², or the
 *       short form: one people count, in the same spot) and the highlighted square's number.
 *       Lives on Zone/FloorLabels, so every position is zone-local cm (x right, -z toward the far edge).
 * Expects: nothing wired. RedlineMain pushes data through layout / showFull / showShort / setSquareNumber.
 * Must not: decide what to show or when — RedlineMain owns the state and the 3-second timer.
 */
import {ZoneRect, rectCenterX, squareRect} from "./RedlineGeometry"
import {HIGHLIGHT_ORDER} from "./RedlineZoneView"

const EM_PER_SIZE = 43.886 // Text.size / 43.886 = em-square height in cm (world space)
// Bold, highly readable theme font, shared with the clipboard's density value.
const FLOOR_FONT = requireAsset("../Fonts/Archivo Black.ttf") as Font
const CAP_RATIO = 0.688 // cap height / em for Archivo Black (OS/2 sCapHeight 688 / 1000)
const MAX_TEXT_SIZE = 800 // Text.size ceiling; larger letters are reached with object scale
const EDGE_GAP_CM = 8 // gap between the zone's near edge and the label block
const LIFT_CM = 1 // above the floor tint

@component
export class RedlineFloorLabelsUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">RedlineFloorLabelsUI – text lying flat on the floor</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Letter height of the near-edge labels (cm)")
  @widget(new SliderWidget(2, 20, 0.5))
  letterHeightCm: number = 6

  @input
  @hint("Digit height of the number beside the highlighted square (cm)")
  @widget(new SliderWidget(5, 40, 1))
  squareNumberHeightCm: number = 20

  @input("vec4", "{0.95,0.95,0.95,1}")
  @hint("Text colour — keep it light, the display is additive (dark text disappears)")
  @widget(new ColorWidget())
  textColor: vec4
  @ui.group_end

  private edgeText!: Text
  private edgeObj!: SceneObject
  private numberText!: Text
  private numberObj!: SceneObject
  private full = false

  onAwake(): void {
    ;[this.edgeObj, this.edgeText] = this.makeFloorText("EdgeLabel", this.letterHeightCm, true)
    // The square sits inside the crowd: draw its number over the ghost bodies so it can always be read.
    ;[this.numberObj, this.numberText] = this.makeFloorText("SquareNumber", this.squareNumberHeightCm, false)
    this.numberObj.enabled = false
  }

  /** Re-anchor both labels to a zone rect (zone-local cm). */
  layout(rect: ZoneRect): void {
    const cx = rectCenterX(rect)
    this.edgeObj.getTransform().setLocalPosition(new vec3(cx, LIFT_CM, rect.maxZ + EDGE_GAP_CM))
    const sq = squareRect(rect)
    this.numberObj.getTransform().setLocalPosition(new vec3(cx, LIFT_CM, sq.maxZ + EDGE_GAP_CM))
  }

  /** Full form: "12 m²", "24 people at 2 per m²", "60 at 5 per m²" (three lines, same spot as the short form). */
  showFull(areaM2: number, at2: number, at5: number): void {
    this.full = true
    this.edgeText.text = `${formatArea(areaM2)} m²\n${at2} people at 2 per m²\n${at5} at 5 per m²`
  }

  /** Short form: how many people are in the zone at the current setting. */
  showShort(people: number): void {
    this.full = false
    this.edgeText.text = `${people} people`
  }

  setSquareNumber(n: number, visible: boolean): void {
    this.numberText.text = `${n}`
    this.numberObj.enabled = visible
  }

  /** Near-edge text on one line (newlines shown as ", "), for logs and tests. */
  get text(): string {
    return this.edgeText.text.split("\n").join(", ")
  }
  get isFull(): boolean {
    return this.full
  }
  get squareNumberText(): string {
    return this.numberObj.enabled ? this.numberText.text : ""
  }

  private makeFloorText(name: string, capCm: number, depthTest: boolean): [SceneObject, Text] {
    const so = global.scene.createSceneObject(name)
    so.setParent(this.sceneObject)
    // Lie flat, face up, letter tops pointing at the far edge so it reads from where the user stands.
    so.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 2, vec3.right()))
    const t = so.createComponent("Component.Text") as Text
    t.font = FLOOR_FONT
    t.text = ""
    t.depthTest = depthTest
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Top // block starts at the anchor and runs toward the user
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-1, 1, -1, 1)
    t.textFill.color = this.textColor
    if (!depthTest) t.setRenderOrder(HIGHLIGHT_ORDER) // over the ghost bodies, under the clipboard UI
    const size = (capCm / CAP_RATIO) * EM_PER_SIZE
    t.size = Math.min(size, MAX_TEXT_SIZE)
    const k = size / t.size
    so.getTransform().setLocalScale(new vec3(k, k, k))
    return [so, t]
  }
}

function formatArea(a: number): string {
  const r = Math.round(a * 10) / 10
  return Number.isInteger(r) ? `${r}` : r.toFixed(1)
}
