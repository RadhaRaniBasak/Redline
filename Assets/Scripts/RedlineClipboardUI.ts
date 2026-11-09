/**
 * RedlineClipboardUI — the clipboard panel (passive view) plus how it rides with the user.
 *
 * Owns: a ~18 x 12.5 cm UIKit BackPlate holding the density value ("5 per m²", drawn in the floor's
 *       colour) with its level caption, a 0..7 whole-step Slider with a red mark at the redline, a hint,
 *       and a row of two Buttons. Main sets one of four modes (setMode):
 *         setup  — slider greyed out, setup hint, [Done] [Test your eye (greyed out)]
 *         done   — slider live, no hint, [Edit zone] [Test your eye]
 *         guess  — Test your eye round: value reads "Guess: N", slider sets the guess, [Check] [Stop test]
 *         result — true value + "You guessed 4, it was 6", and a top-down map of the zone and its people
 *                  in place of the slider and hint, [Next round] [Stop test]
 *       The backing is see-through (plateOpacity) so the crowd shows behind it; only text, slider and
 *       buttons are solid. Also owns the lazy follow: followDistanceCm ahead (default 60) and belowGazeDeg (default 5°) below
 *       wherever you look — so it's in view without looking down, whether you look ahead or down at
 *       the square — facing the eye, trailing walks, turns and nods and settling back, and never
 *       closer than MIN_FACE_CM to the face. Motion: the panel rises and grows in when first
 *       placed; the hint fades in / out and the button label cross-fades, exits shorter than entrances.
 *       The slider and button colliders reach past their visuals so they're easy to hit at arm's length. (UIKit Frame's SmoothFollow pushes a 30 cm-wide
 *       panel out to ~71 cm, so the follow is done here with SIK's smoothDamp instead.)
 * Expects: nothing wired. RedlineMain calls setMode() / showDensity() / showGuess() / showResult() /
 *          setRedline() and listens to onDensityChange (whole numbers 0..7), onButtonPressed (the left
 *          button) and onTestPressed (the right button).
 * Must not: hold domain state, pick the hidden density or decide what a press means — RedlineMain does.
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {IMAGE_MATERIAL_ASSET} from "SpectaclesUIKit.lspkg/Scripts/Utility/Assets"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {smoothDamp, smoothDampAngle} from "SpectaclesInteractionKit.lspkg/Utils/mathUtils"
import {MeshData, MAX_DENSITY, ZoneRect, yawOf} from "./RedlineGeometry"
import {MeshSlot, unlitMaterial} from "./RedlineZoneView"

// Bold, highly readable theme font for the density value (Archivo Black: one heavy weight, clear digits).
const VALUE_FONT = requireAsset("../Fonts/Archivo Black.ttf") as Font
// Button icons (Material Symbols, Rounded 600, imported with /icon-selector).
const ICON = {
  check: requireAsset("../Icons/check.png") as Texture,
  edit: requireAsset("../Icons/edit.png") as Texture,
  next: requireAsset("../Icons/arrow_forward.png") as Texture,
  eye: requireAsset("../Icons/visibility.png") as Texture,
  stop: requireAsset("../Icons/stop_circle.png") as Texture,
  pin: requireAsset("../Icons/keep.png") as Texture,
}

// ── Type scale (from /specs-build-ui) — the panel is read at ~64 cm (45 ahead, 45 down), so roles are scaled to that.
const FONT_SIZE_SCALE = 1.0
type TextRole = "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2" | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

const PANEL_W = 18
const PAD = 0.8
const INNER_W = PANEL_W - PAD * 2
const READ_CM = 60 // reading distance: the panel rides ~60 cm from the eye
// Type hierarchy, biggest to smallest: density value (HeadlineXL x2) > button label (Button x1.6) >
// level caption (Subheadline x1.2, in the floor's colour) > hint (Caption, dimmed).
const VALUE_SCALE = 2 // the density value reads at twice its role size
const BUTTON_LABEL_SCALE = 1.6
const HINT_COLOR = new vec4(1, 1, 1, 0.6) // caption tier: secondary white, still bright on the additive display
// Rows (cm) — value and slider sit close (they read together), the hint and button get more air.
// The level caption hangs right under the value (they read as one line of meaning); the slider follows,
// then more air before the hint and the button. PANEL_H is the column's exact height, so it fills the plate.
const VALUE_H = 2.2
const LEVEL_H = 1.2
const GAP_VALUE_LEVEL = 0.1
const SLIDER_H = 2
const HINT_H = 1
const BUTTON_GAP = 0.4
const BUTTON_W = (INNER_W - BUTTON_GAP) / 2 // two buttons side by side: 8 cm each
const BUTTON_H = 3
const GAP_LEVEL_SLIDER = 0.4
const GAP_SLIDER_HINT = 0.6
const GAP_HINT_BUTTON = 0.4
const PANEL_H = VALUE_H + LEVEL_H + SLIDER_H + HINT_H + BUTTON_H +
  GAP_VALUE_LEVEL + GAP_LEVEL_SLIDER + GAP_SLIDER_HINT + GAP_HINT_BUTTON + PAD * 2 // 12.5 cm
// Hit areas: Specs asks for >= 6 cm targets at 110 cm, i.e. ~3.5 cm at this ~64 cm reading distance. The
// colliders grow past the visuals without overlapping: slider +0.8 cm each way, buttons +0.5 cm up and
// down, leaving 0.7 cm between slider and buttons (0.6 gap + 1 cm hint + 0.4 gap - 0.8 - 0.5); sideways
// the buttons grow only 0.1 cm each, leaving 0.2 cm between the two.
const SLIDER_HIT_H = 3.6
const BUTTON_HIT = new vec3(BUTTON_W + 0.2, BUTTON_H + 1, 1)
// Motion: enters (rise + grow) and fades are eased and retargetable; exits are shorter than entrances.
const PANEL_ENTER_S = 0.35
const PANEL_ENTER_RISE_CM = 2
const PANEL_ENTER_SCALE = 0.94
const FADE_IN_S = 0.25
const FADE_OUT_S = 0.15
const MIN_FACE_CM = 30
const DEG = Math.PI / 180
const SNAP_JUMP_CM = 100 // a tracking jump this big re-places the panel instead of easing
const LAYOUT_Z_LIFT = 0.02
const BUTTON_LABEL_Z = 0.08
const HINTS: Record<ClipMode, string> = {
  setup: "Fit the zone to your space, then pinch Done",
  done: "",
  guess: "Set your guess, then pinch Check",
  result: "",
}
const MAIN_LABEL: Record<ClipMode, string> = {setup: "Done", done: "Edit zone", guess: "Check", result: "Next round"}
const TEST_LABEL: Record<ClipMode, string> = {setup: "Test your eye", done: "Test your eye", guess: "Stop test", result: "Stop test"}
const MAIN_ICON: Record<ClipMode, Texture> = {setup: ICON.check, done: ICON.edit, guess: ICON.check, result: ICON.next}
const TEST_ICON: Record<ClipMode, Texture> = {setup: ICON.eye, done: ICON.eye, guess: ICON.stop, result: ICON.stop}
const ICON_CM = 1.3 // icon size on the button face
const PIN_CM = 2.4 // the round Pin button in the panel's top-right corner
const PIN_HIT = new vec3(3.2, 3.2, 1)
const ICON_INSET = 0.5 // icon's gap from the button's left edge; the label centres in the space to its right
const GUESS_PROMPT = "How dense is it?"
// Result map: drawn where the slider and hint sit (they're hidden then), the zone's far edge at the top.
const MAP_H = SLIDER_H + GAP_SLIDER_HINT + HINT_H
const MAP_Y = PANEL_H / 2 - PAD - VALUE_H - GAP_VALUE_LEVEL - LEVEL_H - GAP_LEVEL_SLIDER - MAP_H / 2
const MAP_Z = 0.05
const MAP_LINE = 0.06 // outline thickness (cm on the panel)
const MAP_DOT = 0.14 // one person
const MAP_OUTLINE = new vec4(1, 1, 1, 0.7)
const LEVEL_SCALE = 1.2 // the level caption: Subheadline, a step under the value and over the button label
const BRIGHT = new vec4(1, 1, 1, 1)
const DIM = new vec4(1, 1, 1, 0.45)
const MARK_W = 0.35
const MARK_H = 2.8 // taller than the 2 cm track, so its ends still show while the knob sits on it
const MARK_Z = 0.0125 // between UI Kit's track fill (z 0.01) and knob (z 0.015): over the fill, under the knob
const MARK_ORDER = 1 // the track fill's render order; UI Kit draws the knob after it, at 2
const MARK_DIM = 0.45 // greyed out with the slider during setup

export type ClipMode = "setup" | "done" | "guess" | "result"

interface FadeLabel {
  text: Text
  icon: Image
  icons: Record<ClipMode, Texture>
  wanted: string // what the button means; text and icon swap at the bottom of a cross-fade
  wantedIcon: Texture
  alpha: number
  dim: boolean // greyed out with an inactive button
}

/** Axis-aligned quad facing +z (the eye) on the panel. */
function quad(m: MeshData, x0: number, y0: number, x1: number, y1: number): void {
  const a = m.v(x0, y0, 0, 0, 0, 1)
  const b = m.v(x1, y0, 0, 0, 0, 1)
  const c = m.v(x1, y1, 0, 0, 0, 1)
  const d = m.v(x0, y1, 0, 0, 0, 1)
  m.tri(a, b, c)
  m.tri(a, c, d)
}

function easeOut(p: number): number {
  return 1 - (1 - p) * (1 - p)
}
function stepToward(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step)
}
function withAlpha(c: vec4, a: number): vec4 {
  return new vec4(c.x, c.y, c.z, a)
}

@component
export class RedlineClipboardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">RedlineClipboardUI – density slider + Done / Edit zone, follows loosely</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("How far ahead of the eye the clipboard rides (cm)")
  @widget(new SliderWidget(35, 90, 1))
  followDistanceCm: number = 60

  @input
  @hint("How far below the line of sight the clipboard rides (degrees). Specs' view is ~37° tall, so keep it under ~12° to stay in view")
  @widget(new SliderWidget(0, 15, 0.5))
  belowGazeDeg: number = 5

  @input
  @hint("Opacity of the clipboard's backing: low lets the crowd show through (text, slider and buttons stay solid)")
  @widget(new SliderWidget(0, 1, 0.05))
  plateOpacity: number = 0.3

  @input
  @hint("How long the clipboard takes to settle back in front after a walk or turn (s)")
  @widget(new SliderWidget(0.1, 2, 0.05))
  followLagSeconds: number = 0.7
  @ui.group_end

  private _onDensityChange = new Event<number>()
  private _onButtonPressed = new Event<void>()
  /** Fires with the new whole density (0..7) when the user moves the slider. */
  get onDensityChange(): PublicApi<number> {
    return this._onDensityChange.publicApi()
  }
  /** Fires when the left button (Done / Edit zone / Check / Next round) is pinched. */
  get onButtonPressed(): PublicApi<void> {
    return this._onButtonPressed.publicApi()
  }
  private _onTestPressed = new Event<void>()
  /** Fires when the right button (Test your eye / Stop test) is pinched. */
  get onTestPressed(): PublicApi<void> {
    return this._onTestPressed.publicApi()
  }

  private slider!: Slider
  private sliderSo!: SceneObject
  private button!: Button
  private testButton!: Button
  private valueLabel!: Text
  private levelLabel!: Text
  private hintLabel!: Text
  private mainLabel!: FadeLabel
  private testLabel!: FadeLabel
  private mark!: MeshSlot
  private mapRoot!: SceneObject
  private mapOutline!: MeshSlot
  private mapDots!: MeshSlot
  private mapDotCount = 0
  private mode: ClipMode = "setup"
  private markRgb = new vec3(1, 1, 1)
  private levelColor = BRIGHT
  private shownDensity = 0
  private suppressSlider = false

  private hintWanted = true // what the hint is heading to; text clears once the fade-out finishes
  private hintAlpha = 1
  private enterT = 0
  private pinned = false // Pin button: the clipboard stops following and stays where it is
  private aimed = 0 // how many of the panel's controls the pointer is on: hold still while > 0
  private pinButton!: Button
  private pinIcon!: Image // 0 → 1 over PANEL_ENTER_S after the first placement

  private cam!: Transform
  private placed = false
  private lastEye = vec3.zero()
  private cx = 0
  private cy = 0
  private cz = 0
  private heading = 0
  private pitch = 0 // radians, + up: the smoothed line of sight
  private vx = 0
  private vy = 0
  private vz = 0
  private vh = 0
  private vp = 0

  onAwake(): void {
    this.cam = WorldCameraFinderProvider.getInstance().getTransform()
    this.buildPanel()
    this.setMode("setup")
    this.createEvent("UpdateEvent").bind(() => {
      const dt = Math.min(getDeltaTime(), 0.1)
      this.follow(dt)
      this.animateText(dt)
    })
  }

  // ── Main → UI ──────────────────────────────────────────────────────────────
  /**
   * Show a density without echoing it back through onDensityChange; `rgb` is the floor's colour at it (none at 0)
   * and `level` the plain-language caption under the value ("" at 0).
   */
  showDensity(n: number, rgb?: vec3, level: string = ""): void {
    const k = Math.max(0, Math.min(MAX_DENSITY, Math.round(n)))
    this.shownDensity = k
    this.valueLabel.text = `${k} per m²`
    this.levelLabel.text = level
    this.suppressSlider = true
    this.slider.currentValue = k / MAX_DENSITY
    this.suppressSlider = false
    this.levelColor = rgb ? new vec4(rgb.x, rgb.y, rgb.z, 1) : BRIGHT
    this.paint()
  }

  /** Put the red mark on the slider track exactly where the knob stops at density `at`. */
  setRedline(at: number, rgb: vec3): void {
    const knobW = this.slider.customKnobSize ? this.slider.knobSize.x : this.slider.size.y // UI Kit: knob is track-high
    const x = (at / MAX_DENSITY - 0.5) * (this.slider.size.x - knobW) // UI Kit's getKnobPositionFromValue
    this.mark.so.getTransform().setLocalPosition(new vec3(x, 0, MARK_Z))
    this.markRgb = rgb
    this.mark.so.enabled = true
    this.paint()
  }

  /** Switch what the panel shows and what its buttons say (see the header for the four modes). */
  setMode(mode: ClipMode): void {
    this.mode = mode
    this.slider.inactive = mode === "setup"
    this.sliderSo.enabled = mode !== "result" // the map takes its place
    this.mapRoot.enabled = mode === "result"
    const hint = HINTS[mode]
    this.hintWanted = hint.length > 0 // fades in / out in animateText
    if (this.hintWanted) this.hintLabel.text = hint
    this.mainLabel.wanted = MAIN_LABEL[mode] // labels and icons cross-fade in animateText
    this.mainLabel.wantedIcon = MAIN_ICON[mode]
    this.testLabel.wanted = TEST_LABEL[mode]
    this.testLabel.wantedIcon = TEST_ICON[mode]
    this.testButton.inactive = mode === "setup" // the zone has to be fitted first
    this.testLabel.dim = mode === "setup"
    this.paint()
  }

  /** Guess round: the value reads "Guess: N" (the true density stays hidden) and the slider moves to N. */
  showGuess(n: number): void {
    const k = Math.max(0, Math.min(MAX_DENSITY, Math.round(n)))
    this.shownDensity = k
    this.valueLabel.text = `Guess: ${k}`
    this.levelLabel.text = GUESS_PROMPT
    this.suppressSlider = true
    this.slider.currentValue = k / MAX_DENSITY
    this.suppressSlider = false
    this.levelColor = BRIGHT
    this.paint()
  }

  /** Round result: the true density in its colour, "You guessed G, it was T", and a top-down map of the zone. */
  showResult(guess: number, truth: number, rgb: vec3, rect: ZoneRect, spots: {x: number; z: number}[]): void {
    this.valueLabel.text = `${truth} per m²`
    this.levelLabel.text = `You guessed ${guess}, it was ${truth}`
    this.levelColor = new vec4(rgb.x, rgb.y, rgb.z, 1)
    this.drawMap(rect, spots, this.levelColor)
    this.paint()
  }

  get levelText(): string {
    return this.levelLabel.text
  }

  get valueText(): string {
    return this.valueLabel.text
  }
  get mapPeople(): number {
    return this.mapDotCount
  }
  /** True while the Pin button holds the clipboard in place. */
  get isPinned(): boolean {
    return this.pinned
  }
  /** Pin or unpin: pinned, the clipboard stays where it is instead of following the head. */
  setPinned(pinned: boolean): void {
    this.pinned = pinned
    this.pinIcon.mainPass.baseColor = pinned ? BRIGHT : DIM
  }

  get isTestButtonEnabled(): boolean {
    return !this.testButton.inactive
  }
  get testButtonLabelText(): string {
    return this.testLabel.wanted
  }

  get valueColor(): vec4 {
    return this.valueLabel.textFill.color
  }

  get isSliderEnabled(): boolean {
    return !this.slider.inactive
  }
  /** The label the button is showing or cross-fading to (tests read it right after a press). */
  get buttonLabelText(): string {
    return this.mainLabel.wanted
  }
  /** Whether the hint is showing or fading in (false as soon as it starts fading out). */
  get hintShown(): boolean {
    return this.hintWanted
  }

  // ── Build (UIKit) ──────────────────────────────────────────────────────────
  private buildPanel(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(PANEL_W, PANEL_H)
    // See-through backing: BackPlate draws with UI Kit's RoundedRectangle on this same object. Low opacity
    // blends it over the crowd instead of hiding it, and no depth write so nothing behind it gets cut out.
    const rect = this.sceneObject.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
    if (rect) {
      rect.opacity = this.plateOpacity
      this.createEvent("OnStartEvent").bind(() => {
        if (rect.renderMeshVisual) rect.renderMeshVisual.mainPass.depthWrite = false
      })
    }

    const content = this.obj(this.sceneObject, "Content", new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = PANEL_W
    flex.height = PANEL_H
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Center
    flex.alignItems = FlexAlign.Center
    flex.rowGap = 0 // per-row gaps come from each item's marginTop
    flex.paddingTop = PAD
    flex.paddingBottom = PAD
    flex.paddingLeft = PAD
    flex.paddingRight = PAD

    this.flexChild(content, {w: INNER_W, h: VALUE_H}, (item) => {
      this.valueLabel = this.addText(item, "0 per m²", "HeadlineXL", INNER_W, VALUE_H, VALUE_SCALE)
      this.valueLabel.font = VALUE_FONT
    })
    this.flexChild(content, {w: INNER_W, h: LEVEL_H, top: GAP_VALUE_LEVEL}, (item) => {
      this.levelLabel = this.addText(item, "", "Subheadline", INNER_W, LEVEL_H, LEVEL_SCALE)
    })
    this.flexChild(content, {w: INNER_W, h: SLIDER_H, top: GAP_LEVEL_SLIDER}, (item) => {
      const so = this.obj(item, "DensitySlider")
      this.sliderSo = so
      this.slider = so.createComponent(Slider.getTypeName()) as Slider
      // Size, segments and hit area BEFORE the slider initializes (fill/knob/collider are set up once at init).
      this.slider.size = new vec3(INNER_W, SLIDER_H, 1)
      this.slider.colliderFitElement = false
      this.slider.colliderSize = new vec3(INNER_W, SLIDER_HIT_H, 1)
      this.slider.numberOfSegments = MAX_DENSITY + 1
      this.slider.segmented = true
      this.slider.currentValue = 0
      this.slider.onValueChange.add((v: number) => this.onSlider(v))
      this.holdStillWhileAimed(this.slider)
      this.mark = this.addMark(so)
    })
    this.flexChild(content, {w: INNER_W, h: HINT_H, top: GAP_SLIDER_HINT}, (item) => {
      this.hintLabel = this.addText(item, HINTS.setup, "Caption", INNER_W, HINT_H)
      this.hintLabel.textFill.color = HINT_COLOR
    })
    this.flexChild(content, {w: INNER_W, h: BUTTON_H, top: GAP_HINT_BUTTON}, (row) => {
      const rowFlex = row.createComponent(FlexLayout.getTypeName()) as FlexLayout
      rowFlex.width = INNER_W
      rowFlex.height = BUTTON_H
      rowFlex.direction = FlexDirection.Row
      rowFlex.justifyContent = FlexJustify.Center
      rowFlex.alignItems = FlexAlign.Center
      rowFlex.columnGap = BUTTON_GAP
      this.flexChild(row, {w: BUTTON_W, h: BUTTON_H}, (item) => {
        ;[this.button, this.mainLabel] = this.addButton(item, "DoneEditButton", MAIN_LABEL, MAIN_ICON, this._onButtonPressed)
      })
      this.flexChild(row, {w: BUTTON_W, h: BUTTON_H}, (item) => {
        ;[this.testButton, this.testLabel] = this.addButton(item, "TestEyeButton", TEST_LABEL, TEST_ICON, this._onTestPressed)
      })
    })

    // Result map — not a flex item: it overlays the slider + hint rows, which are hidden while it shows.
    this.mapRoot = this.obj(content, "QuizMap", new vec3(0, MAP_Y, MAP_Z))
    this.mapOutline = new MeshSlot(this.mapRoot, "MapOutline", unlitMaterial(MAP_OUTLINE))
    this.mapDots = new MeshSlot(this.mapRoot, "MapPeople", unlitMaterial(BRIGHT))
    this.mapRoot.enabled = false

    // Pin: a round icon button in the top-right corner (not a flex item: it overlays the value row's empty edge).
    const pinSo = this.obj(content, "PinButton", new vec3(PANEL_W / 2 - PAD - PIN_CM / 2, PANEL_H / 2 - PAD - PIN_CM / 2, LAYOUT_Z_LIFT))
    this.pinButton = pinSo.createComponent(Button.getTypeName()) as Button
    this.pinButton.size = new vec3(PIN_CM, PIN_CM, 1)
    this.pinButton.colliderFitElement = false
    this.pinButton.colliderSize = PIN_HIT
    const pinIconSo = this.obj(pinSo, "PinIcon", new vec3(0, 0, BUTTON_LABEL_Z))
    pinIconSo.getTransform().setLocalScale(new vec3(ICON_CM, ICON_CM, 1))
    this.pinIcon = pinIconSo.createComponent("Component.Image") as Image
    this.pinIcon.mainMaterial = IMAGE_MATERIAL_ASSET.clone()
    this.pinIcon.mainPass.baseTex = ICON.pin
    this.pinIcon.mainPass.baseColor = DIM
    this.holdStillWhileAimed(this.pinButton)
    this.pinButton.onTriggerUp.add(() => this.setPinned(!this.pinned))
  }

  /** The panel stops following while the pointer is on one of its controls, so it never slides out from under a pinch. */
  private holdStillWhileAimed(e: Button | Slider): void {
    e.onHoverEnter.add(() => this.aimed++)
    e.onHoverExit.add(() => (this.aimed = Math.max(0, this.aimed - 1)))
  }

  private addButton(
    parent: SceneObject,
    name: string,
    labels: Record<ClipMode, string>,
    icons: Record<ClipMode, Texture>,
    pressed: Event<void>
  ): [Button, FadeLabel] {
    const so = this.obj(parent, name)
    const b = so.createComponent(Button.getTypeName()) as Button
    b.size = new vec3(BUTTON_W, BUTTON_H, 1)
    b.colliderFitElement = false
    b.colliderSize = BUTTON_HIT
    this.holdStillWhileAimed(b)
    b.onTriggerUp.add(() => {
      if (!b.inactive) pressed.invoke()
    })
    // Icon at the left of the face, label centred in the space to its right (both lifted off the face).
    const iconX = -BUTTON_W / 2 + ICON_INSET + ICON_CM / 2
    const iconSo = this.obj(so, "ButtonIcon", new vec3(iconX, 0, BUTTON_LABEL_Z))
    iconSo.getTransform().setLocalScale(new vec3(ICON_CM, ICON_CM, 1)) // UI Kit images are 1 cm at scale 1
    const icon = iconSo.createComponent("Component.Image") as Image
    icon.mainMaterial = IMAGE_MATERIAL_ASSET.clone()
    icon.mainPass.baseTex = icons.setup
    const left = iconX + ICON_CM / 2 + 0.2
    const labelW = BUTTON_W / 2 - 0.3 - left
    const text = this.addButtonLabel(so, labels.setup, labelW)
    text.getSceneObject().getTransform().setLocalPosition(new vec3(left + labelW / 2, 0, BUTTON_LABEL_Z))
    return [b, {text, icon, icons, wanted: labels.setup, wantedIcon: icons.setup, alpha: 1, dim: false}]
  }

  /** Top-down map fitted into the slider + hint area: zone outline, one dot per person, far edge at the top. */
  private drawMap(rect: ZoneRect, spots: {x: number; z: number}[], color: vec4): void {
    const w = rect.maxX - rect.minX
    const d = rect.maxZ - rect.minZ
    const k = Math.min(INNER_W / w, (MAP_H - 0.2) / d) // panel cm per floor cm
    const cx = (rect.minX + rect.maxX) / 2
    const cz = (rect.minZ + rect.maxZ) / 2
    const hw = (w * k) / 2
    const hd = (d * k) / 2
    const t = MAP_LINE
    const outline = new MeshData()
    quad(outline, -hw, hd - t, hw, hd) // far edge (top)
    quad(outline, -hw, -hd, hw, -hd + t) // near edge
    quad(outline, -hw, -hd, -hw + t, hd)
    quad(outline, hw - t, -hd, hw, hd)
    this.mapOutline.set(outline)
    const dots = new MeshData()
    const r = MAP_DOT / 2
    for (const s of spots) {
      const x = (s.x - cx) * k
      const y = -(s.z - cz) * k // floor -z (toward the stage) is up on the panel
      quad(dots, x - r, y - r, x + r, y + r)
    }
    this.mapDots.set(dots)
    this.mapDotCount = spots.length
    this.mapDots.rmv.mainMaterial.mainPass.baseColor = color
  }

  private onSlider(v: number): void {
    if (this.suppressSlider) return
    const n = Math.max(0, Math.min(MAX_DENSITY, Math.round(v * MAX_DENSITY)))
    if (n === this.shownDensity) return
    this.shownDensity = n
    this.valueLabel.text = this.mode === "guess" ? `Guess: ${n}` : `${n} per m²`
    this._onDensityChange.invoke(n)
  }

  /** Value in the floor's colour and the mark in red; both greyed out with the slider during setup. */
  private paint(): void {
    const setup = this.mode === "setup"
    this.valueLabel.textFill.color = setup ? DIM : this.levelColor
    this.levelLabel.textFill.color = setup ? DIM : this.levelColor
    const k = setup ? MARK_DIM : 1
    this.mark.rmv.mainMaterial.mainPass.baseColor = new vec4(this.markRgb.x * k, this.markRgb.y * k, this.markRgb.z * k, 1)
  }

  /** A thin upright bar facing the eye on the slider track; hidden until setRedline() places it. */
  private addMark(slider: SceneObject): MeshSlot {
    const slot = new MeshSlot(slider, "RedlineMark", unlitMaterial(BRIGHT), MARK_ORDER)
    const m = new MeshData()
    const w = MARK_W / 2
    const h = MARK_H / 2
    const a = m.v(-w, -h, 0, 0, 0, 1)
    const b = m.v(w, -h, 0, 0, 0, 1)
    const c = m.v(w, h, 0, 0, 0, 1)
    const d = m.v(-w, h, 0, 0, 0, 1)
    m.tri(a, b, c)
    m.tri(a, c, d)
    slot.set(m)
    slot.so.enabled = false
    return slot
  }

  // ── Lazy follow ────────────────────────────────────────────────────────────
  private follow(dt: number): void {
    const eye = this.cam.getWorldPosition()
    if (this.placed && (this.pinned || this.aimed > 0) && eye.distance(this.lastEye) <= SNAP_JUMP_CM) {
      // Pinned or being aimed at: hold still. Keep the smoothing state in step so it resumes without a jump.
      this.lastEye = eye
      return
    }
    const target = yawOf(this.cam.forward, this.cam.up) // stable even looking straight down
    const look = this.cam.forward.uniformScale(-1) // the camera looks along -forward
    const targetPitch = Math.asin(Math.max(-1, Math.min(1, look.y)))
    if (!this.placed || eye.distance(this.lastEye) > SNAP_JUMP_CM) {
      this.placed = true
      this.cx = eye.x
      this.cy = eye.y
      this.cz = eye.z
      this.heading = target
      this.pitch = targetPitch
      this.vx = this.vy = this.vz = this.vh = this.vp = 0
      this.enterT = 0 // (re)placed: play the entrance
    } else {
      ;[this.cx, this.vx] = smoothDamp(this.cx, eye.x, this.vx, this.followLagSeconds, dt)
      ;[this.cy, this.vy] = smoothDamp(this.cy, eye.y, this.vy, this.followLagSeconds, dt)
      ;[this.cz, this.vz] = smoothDamp(this.cz, eye.z, this.vz, this.followLagSeconds, dt)
      this.heading = Math.atan2(Math.sin(this.heading), Math.cos(this.heading))
      ;[this.heading, this.vh] = smoothDampAngle(this.heading, target, this.vh, this.followLagSeconds, dt)
      ;[this.pitch, this.vp] = smoothDamp(this.pitch, targetPitch, this.vp, this.followLagSeconds, dt)
    }
    this.lastEye = eye
    // belowGazeDeg under the smoothed line of sight, kept between 70° down and 20° up.
    const a = Math.max(-70 * DEG, Math.min(20 * DEG, this.pitch - this.belowGazeDeg * DEG))
    const dir = new vec3(-Math.sin(this.heading) * Math.cos(a), Math.sin(a), -Math.cos(this.heading) * Math.cos(a))
    let pos = new vec3(this.cx, this.cy, this.cz).add(dir.uniformScale(this.followDistanceCm))
    const toPanel = pos.sub(eye)
    if (toPanel.length < MIN_FACE_CM) pos = eye.add(toPanel.normalize().uniformScale(MIN_FACE_CM))
    // Entrance: rise PANEL_ENTER_RISE_CM and grow from PANEL_ENTER_SCALE, eased out.
    this.enterT = Math.min(1, this.enterT + dt / PANEL_ENTER_S)
    const e = easeOut(this.enterT)
    pos = pos.add(new vec3(0, -PANEL_ENTER_RISE_CM * (1 - e), 0))
    const t = this.sceneObject.getTransform()
    const k = PANEL_ENTER_SCALE + (1 - PANEL_ENTER_SCALE) * e
    t.setLocalScale(new vec3(k, k, k))
    t.setWorldPosition(pos)
    t.setWorldRotation(quat.lookAt(eye.sub(pos).normalize(), vec3.up())) // face the eye → tilts up toward the face
  }

  // ── Text motion (retargetable: each frame steps toward the current target) ──
  private animateText(dt: number): void {
    // Hint: fade in over FADE_IN_S, out over the shorter FADE_OUT_S, then drop the text.
    const hintTarget = this.hintWanted ? 1 : 0
    if (this.hintAlpha !== hintTarget) {
      this.hintAlpha = stepToward(this.hintAlpha, hintTarget, dt / (hintTarget > this.hintAlpha ? FADE_IN_S : FADE_OUT_S))
      if (this.hintAlpha === 0) this.hintLabel.text = ""
    }
    this.hintLabel.textFill.color = withAlpha(HINT_COLOR, HINT_COLOR.w * easeOut(this.hintAlpha))
    // Button labels: cross-fade — the old word fades out, swaps at zero, the new one fades in.
    for (const l of [this.mainLabel, this.testLabel]) {
      const swapping = l.text.text !== l.wanted || l.icon.mainPass.baseTex !== l.wantedIcon
      l.alpha = stepToward(l.alpha, swapping ? 0 : 1, dt / (swapping ? FADE_OUT_S : FADE_IN_S))
      if (swapping && l.alpha === 0) {
        l.text.text = l.wanted
        l.icon.mainPass.baseTex = l.wantedIcon
      }
      const a = easeOut(l.alpha) * (l.dim ? DIM.w : 1)
      l.text.textFill.color = withAlpha(BRIGHT, a)
      l.icon.mainPass.baseColor = withAlpha(BRIGHT, a)
    }
  }

  // ── Layout helpers (from /specs-build-ui helpers.md) ───────────────────────
  private obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    if (position) so.getTransform().setLocalPosition(position)
    return so
  }

  private flexChild(parent: SceneObject, size: {w: number; h: number; top?: number}, builder: (child: SceneObject) => void): SceneObject {
    const child = this.obj(parent, "Item", new vec3(0, 0, LAYOUT_Z_LIFT))
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    item.overrideWidth = size.w
    item.overrideHeight = size.h
    item.flexGrow = 0
    item.flexShrink = 0
    item.marginTop = size.top || 0
    builder(child)
    // Built in onAwake, before the layout starts: auto-discovery registers the item on start
    // (addItems() before init throws while autoDiscoverItemsOnStart is on).
    const layout = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
    if (layout && !layout.autoDiscoverItemsOnStart) layout.addItems([item])
    return child
  }

  private addText(parent: SceneObject, text: string, role: TextRole, w: number, h: number, scale: number = 1): Text {
    const so = this.obj(parent, "Text")
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, role, READ_CM)
    t.size *= scale
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    t.textFill.color = BRIGHT
    return t
  }

  private addButtonLabel(parent: SceneObject, text: string, widthCM: number): Text {
    const so = this.obj(parent, "ButtonLabel", new vec3(0, 0, BUTTON_LABEL_Z)) // in front of the button face
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, "Button", READ_CM)
    t.size *= BUTTON_LABEL_SCALE
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-widthCM / 2, widthCM / 2, -1.4, 1.4)
    t.textFill.color = BRIGHT
    return t
  }
}
