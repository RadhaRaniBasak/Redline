/**
 * RedlineMain — Redline's state and orchestration: the single owner of domain state.
 *
 * Owns: setup/done mode, density (0..7), the zone rect (zone-local cm), the floor height, the tone
 *       latch, the 3 s label timer, the clear-circle count and the arrow rule. Builds the zone
 *       visuals, crowd (with its sway), redline tone and spatial crowd murmur at runtime under the
 *       authored roots and pushes state into the two UI modules (clipboard + floor labels).
 * Logs: exactly one "[Redline] ..." line per state change — preview / LEAF checks read these.
 * Test surface: setDensity, pressDone, pressEditZone, startQuiz, pressCheck, nextRound, stopQuiz,
 *               setZoneSize, dragCorner + read-only getters.
 * Expects (@input): zoneRoot, arrowRoot, virtualFloorRoot, clipboard (RedlineClipboardUI),
 *                   floorLabels (RedlineFloorLabelsUI on Zone/FloorLabels).
 * Must not: create Text or UIKit (that lives in the *UI modules).
 * Size: ~715 lines — single state owner + the test surface; visuals live in RedlineZoneView /
 *       RedlineCrowd and the math in RedlineGeometry.
 */
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {RedlineClipboardUI, ClipMode} from "./RedlineClipboardUI"
import {RedlineFloorLabelsUI} from "./RedlineFloorLabelsUI"
import {
  ZoneRect, ZONE_LIMITS, MAX_DENSITY, yawOf, layoutCrowd, peopleFor, rectAreaM2, rectWidth, rectDepth,
  rectCenterX, rectCenterZ, squareRect, inRect, dragCornerTo
} from "./RedlineGeometry"
import {ZoneView, DragPhase} from "./RedlineZoneView"
import {Crowd} from "./RedlineCrowd"

const TONE = requireAsset("../GeneratedSFX/RedlineTone.wav") as AudioTrackAsset // low, calm swell, not an alarm
const TICK_UP = requireAsset("../GeneratedSFX/RedlineTickUp.wav") as AudioTrackAsset
const TICK_DOWN = requireAsset("../GeneratedSFX/RedlineTickDown.wav") as AudioTrackAsset // lower and ~4 dB quieter
const MURMUR = requireAsset("../GeneratedSFX/RedlineMurmur.wav") as AudioTrackAsset

const REDLINE = 5
const QUIZ_MIN = 2 // Test your eye: the hidden density is a whole number from QUIZ_MIN to MAX_DENSITY
const START_RECT: ZoneRect = {minX: -200, maxX: 200, minZ: -400, maxZ: -100} // 4 x 3 m, near edge 1 m ahead
const TOP_EDGE_GAIN = 1.22 // the shoulder line and the crown read a little brighter than the figure
const MURMUR_VOLUME = [0, 0.14, 0.24, 0.35, 0.47, 0.6, 0.75, 0.9] // by density 0..7: thickens as the crowd packs in
const MURMUR_EASE_S = 0.6
const MURMUR_HEIGHT_CM = 150 // voices come from head height in the middle of the zone
const MURMUR_NEAR_CM = 150
const MURMUR_FAR_CM = 2000
const TINT_RGB: {[name: string]: vec3} = {
  green: new vec3(0.25, 1, 0.35),
  amber: new vec3(1, 0.65, 0.1),
  red: new vec3(1, 0.12, 0.08)
}
const FLOOR_PITCHES_DEG = [30, 45, 60, 75, 89] // rays fanned down from the eye to find the floor
const FLOOR_MIN_DROP_CM = 90 // ignore table tops: the floor is well below the eye
const FLOOR_SETTLE_S = 0.6
const FLOOR_TIMEOUT_S = 3
const ARROW_AHEAD_CM = 100
const ARROW_DELAY_S = 0.2 // zone must stay out of view this long before the arrow shows (no flicker)
const VIEW_SAMPLE_CM = 25
const VIEW_FLOOR_RAYS = [new vec2(0.5, 0.5), new vec2(0, 1), new vec2(0.5, 1), new vec2(1, 1)] // screen centre + bottom edge

function tintName(n: number): string {
  return n >= 5 ? "red" : n >= 3 ? "amber" : n >= 1 ? "green" : "none"
}
/** Plain-language caption under the clipboard's value, one per floor colour. */
const LEVEL_CAPTION: {[tint: string]: string} = {none: "", green: "Room to move", amber: "Getting tight", red: "Past the redline"}
function f2(v: number): string {
  return v.toFixed(2)
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
function log(msg: string): void {
  print("[Redline] " + msg)
}

@component
export class RedlineMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">RedlineMain – zone, ghost crowd density, redline cues</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Zone root; it is placed on the floor at start and the outline, tint, square, handles and crowd are built under it")
  zoneRoot!: SceneObject

  @input
  @hint("Root of the floor arrow that points back to the zone")
  arrowRoot!: SceneObject

  @input
  @hint("Stand-in floor grid, shown only when the real floor isn't found")
  virtualFloorRoot!: SceneObject

  @input
  @hint("Clipboard panel: density slider + Done / Edit zone")
  clipboard!: RedlineClipboardUI

  @input
  @hint("Floor labels (Zone/FloorLabels)")
  floorLabels!: RedlineFloorLabelsUI
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Radius of the clear circle kept around the user (cm); applies to bodies only")
  @widget(new SliderWidget(20, 150, 5))
  clearRadiusCm: number = 60

  @input
  @hint("Seconds a ghost body takes to fade out / back in")
  @widget(new SliderWidget(0.05, 2, 0.05))
  fadeSeconds: number = 0.3

  @input
  @hint("Seconds the full floor labels stay up after any change")
  @widget(new SliderWidget(0.5, 10, 0.5))
  labelSeconds: number = 3

  @input("vec3", "{0.431,0.545,0.659}") // literal default (#6E8BA8): LS can't evaluate a computed one and saves black
  @hint("Ghost colour: dim, solid, unlit blue-grey (#6E8BA8); the shoulder line and crown are drawn a little brighter")
  @widget(new ColorWidget())
  ghostColor: vec3

  @input
  @hint("Opacity of the coloured floor tint under the crowd")
  @widget(new SliderWidget(0.05, 1, 0.05))
  tintOpacity: number = 0.35

  @input
  @hint("Eye height assumed for the virtual floor when the real floor isn't found (cm)")
  @widget(new SliderWidget(100, 200, 1))
  eyeHeightCm: number = 160
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Debug</span>')
  @ui.group_start("Debug")
  @input
  @hint("Wireframe the corner-handle colliders (takes effect on preview restart)")
  debugColliders: boolean = false
  @ui.group_end

  private camera!: Camera
  private camT!: Transform
  private audio!: AudioComponent
  private zoneView: ZoneView | null = null
  private crowd: Crowd | null = null

  private mode: "setup" | "done" | "quiz" = "setup"
  /** Test your eye round: the hidden density, the user's guess, and the density to go back to after. */
  private quiz: {phase: "guess" | "result"; truth: number; guess: number; prev: number} | null = null
  private density = 0
  private rect: ZoneRect = {...START_RECT}
  private placed = false
  private floorSource = "searching"
  private toneCount = 0
  private tickUp: AudioComponent | null = null
  private tickDown: AudioComponent | null = null
  private ticks = {up: 0, down: 0}
  private labelTimer = 0
  private fadedCount = 0
  private arrowShown = false
  private arrowWantS = 0
  private arrowPos = vec3.zero()
  private arrowYaw = 0
  private murmur: AudioComponent | null = null
  private murmurVolume = 0
  private murmurTarget = 0

  private hitSession: HitTestSession | null = null
  private floorHits: number[] = []
  private searchS = 0
  private rayIndex = 0

  onAwake(): void {
    if (!this.zoneRoot || !this.arrowRoot || !this.virtualFloorRoot || !this.clipboard || !this.floorLabels) {
      log("ERROR required @input not wired (zoneRoot, arrowRoot, virtualFloorRoot, clipboard, floorLabels)")
      return
    }
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ── Test surface ───────────────────────────────────────────────────────────
  public setDensity(n: number): void {
    this.applyDensity(n, "api")
  }
  public pressDone(): void {
    if (this.mode !== "setup") return
    this.mode = "done"
    this.applyMode()
  }
  public pressEditZone(): void {
    if (this.mode !== "done") return
    this.mode = "setup"
    this.applyMode()
  }
  /** Test your eye: fill the zone at a hidden random density (2..7) and ask for a guess. Only after Done. */
  public startQuiz(): void {
    if (this.mode !== "done" || !this.placed) return
    this.mode = "quiz"
    this.quiz = {phase: "guess", truth: this.randomTruth(-1), guess: 0, prev: this.density}
    this.enterGuess()
  }
  /** Reveal the true density next to the guess. */
  public pressCheck(): void {
    if (!this.quiz || this.quiz.phase !== "guess") return
    const q = this.quiz
    q.phase = "result"
    this.clipboard.setMode("result")
    this.clipboard.showResult(q.guess, q.truth, TINT_RGB[tintName(q.truth)], this.rect, layoutCrowd(this.rect, q.truth))
    this.refreshCrowd()
    this.showFullLabels()
    log(`quiz=result guess=${q.guess} truth=${q.truth} off=${q.guess - q.truth} tint=${this.getTint()}`)
  }
  /** Another round at a new hidden density. */
  public nextRound(): void {
    if (!this.quiz || this.quiz.phase !== "result") return
    this.quiz.truth = this.randomTruth(this.quiz.truth)
    this.quiz.guess = 0
    this.quiz.phase = "guess"
    this.enterGuess()
  }
  /** Leave the test and go back to the density set before it. */
  public stopQuiz(): void {
    if (!this.quiz) return
    const prev = this.quiz.prev
    this.quiz = null
    this.mode = "done"
    this.clipboard.setMode("done")
    this.clipboard.showDensity(prev, TINT_RGB[tintName(prev)], LEVEL_CAPTION[tintName(prev)])
    this.refreshCrowd()
    this.showFullLabels()
    log(`quiz=off density=${this.density} ghosts=${this.getGhostCount()}`)
  }
  /** Resize keeping the near edge and the centre line (metres, clamped to 2x2..10x10). */
  public setZoneSize(widthM: number, depthM: number): void {
    if (!this.placed) return
    const w = clamp(widthM * 100, ZONE_LIMITS.minW, ZONE_LIMITS.maxW)
    const d = clamp(depthM * 100, ZONE_LIMITS.minD, ZONE_LIMITS.maxD)
    const cx = rectCenterX(this.rect)
    const near = this.rect.maxZ
    this.setRect({minX: cx - w / 2, maxX: cx + w / 2, minZ: near - d, maxZ: near}, "api")
  }
  /** Same path as a handle drag. corner: 0 near-left, 1 near-right, 2 far-right, 3 far-left; target in zone-local metres. */
  public dragCorner(corner: number, xM: number, zM: number): void {
    this.onCornerDrag(corner, xM * 100, zM * 100, "end")
  }

  public getMode(): string {
    return this.mode
  }
  /** "off", "guess" or "result" (test hook). */
  public getQuizPhase(): string {
    return this.quiz ? this.quiz.phase : "off"
  }
  /** The hidden density of the current round, 0 with no round (test hook — the user never sees it before Check). */
  public getQuizTruth(): number {
    return this.quiz ? this.quiz.truth : 0
  }
  public getQuizGuess(): number {
    return this.quiz ? this.quiz.guess : 0
  }
  /** Clipboard texts and state (test hooks). */
  public getValueText(): string {
    return this.clipboard.valueText
  }
  public getMapPeopleCount(): number {
    return this.clipboard.mapPeople
  }
  public isTestButtonEnabled(): boolean {
    return this.clipboard.isTestButtonEnabled
  }
  public getTestButtonLabel(): string {
    return this.clipboard.testButtonLabelText
  }
  public getDensity(): number {
    return this.density
  }
  public isPlaced(): boolean {
    return this.placed
  }
  public getFloorSource(): string {
    return this.floorSource
  }
  public getZoneSize(): {widthM: number; depthM: number; areaM2: number} {
    return {widthM: rectWidth(this.rect) / 100, depthM: rectDepth(this.rect) / 100, areaM2: rectAreaM2(this.rect)}
  }
  /** Copy of the zone rect in zone-local cm (x right, -z toward the far edge; the user started at 0,0). */
  public getZoneRectCm(): ZoneRect {
    return {...this.rect}
  }
  public getLabelsText(): string {
    return this.floorLabels.text
  }
  public isLabelsFull(): boolean {
    return this.floorLabels.isFull
  }
  public getGhostCount(): number {
    return this.crowd && this.crowdShown ? this.crowd.count : 0
  }
  public getSquareFootprintCount(): number {
    return this.crowd && this.crowdShown ? this.crowd.countIn(squareRect(this.rect)) : 0
  }
  public getSquareNumberText(): string {
    return this.floorLabels.squareNumberText
  }
  public getTint(): string {
    return this.crowdShown && this.revealed ? tintName(this.crowdDensity) : "none"
  }
  /** The clipboard's plain-language level caption, e.g. "Getting tight" ("" at 0) (test hook). */
  public getLevelCaption(): string {
    return this.clipboard.levelText
  }
  /** Colour of the clipboard's density value (test hook). */
  public getValueColor(): vec4 {
    return this.clipboard.valueColor
  }
  /** Colour of the floor tint under the crowd, or null when there's no tint (test hook). */
  public getFloorTintColor(): vec4 | null {
    return this.zoneView ? this.zoneView.tintColor : null
  }
  public getToneCount(): number {
    return this.toneCount
  }
  /** Slider ticks played so far, by direction (test hook). */
  public getTickCounts(): {up: number; down: number} {
    return {...this.ticks}
  }
  public getFadedCount(): number {
    return this.fadedCount
  }
  /** Ghost bodies still drawn within radiusCm of the user (0 inside the clear circle once faded). */
  public getVisibleBodiesWithin(radiusCm: number = this.clearRadiusCm): number {
    if (!this.crowd || !this.crowdShown) return 0
    const u = this.userLocal()
    return this.crowd.visibleBodiesWithin(u.x, u.z, radiusCm)
  }
  public isUserInZone(): boolean {
    const u = this.userLocal()
    return this.placed && inRect(this.rect, u.x, u.z)
  }
  public isArrowVisible(): boolean {
    return this.arrowShown
  }
  /** aheadCm: horizontal distance user → arrow; errorDeg: angle between the arrow and the way to the zone centre. */
  public getArrowInfo(): {visible: boolean; aheadCm: number; errorDeg: number} {
    if (!this.arrowShown) return {visible: false, aheadCm: 0, errorDeg: 0}
    const eye = this.camT.getWorldPosition()
    const ahead = new vec3(this.arrowPos.x - eye.x, 0, this.arrowPos.z - eye.z).length
    const c = this.zoneCentreWorld().sub(this.arrowPos)
    const toZone = new vec3(c.x, 0, c.z).normalize()
    const pointing = new vec3(-Math.sin(this.arrowYaw), 0, -Math.cos(this.arrowYaw))
    return {visible: true, aheadCm: ahead, errorDeg: (Math.acos(clamp(toZone.dot(pointing), -1, 1)) * 180) / Math.PI}
  }
  public areHandlesVisible(): boolean {
    return !!this.zoneView && this.zoneView.handlesVisible
  }
  public isSliderEnabled(): boolean {
    return this.clipboard.isSliderEnabled
  }
  public getButtonLabel(): string {
    return this.clipboard.buttonLabelText
  }
  public isHintShown(): boolean {
    return this.clipboard.hintShown
  }
  /** Lean of the shared crowd wave in degrees (0 at or below the redline; builds up at 6-7). */
  public getWaveDegrees(): number {
    return this.crowd ? this.crowd.waveDegrees : 0
  }
  /** Volume the crowd murmur is heading to (0 with no crowd, louder as the density rises). */
  public getMurmurTarget(): number {
    return this.murmurTarget
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  private onStart(): void {
    const cam = WorldCameraFinderProvider.getInstance()
    this.camera = cam.getComponent()
    this.camT = cam.getTransform()
    this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent
    this.audio.audioTrack = TONE
    this.audio.playbackMode = Audio.PlaybackMode.LowLatency // tied to the user's slider move
    this.tickUp = this.createSfx(TICK_UP)
    this.tickDown = this.createSfx(TICK_DOWN) // own component, so a quick reversal doesn't cut the other tick
    this.clipboard.onDensityChange.add((n: number) => (this.quiz ? this.setGuess(n) : this.applyDensity(n, "slider")))
    this.clipboard.onButtonPressed.add(() => this.pressMainButton())
    this.clipboard.onTestPressed.add(() => (this.quiz ? this.stopQuiz() : this.startQuiz()))
    this.clipboard.setMode("setup")
    this.clipboard.showDensity(0)
    this.clipboard.setRedline(REDLINE, TINT_RGB.red)
    const camSO = this.camera.getSceneObject() // spatial audio (the murmur) needs a listener on the camera
    if (!camSO.getComponent("Component.AudioListenerComponent")) camSO.createComponent("Component.AudioListenerComponent")
    try {
      const worldQuery = require("LensStudio:WorldQueryModule") as WorldQueryModule
      const opts = HitTestSessionOptions.create()
      opts.filter = true
      this.hitSession = worldQuery.createHitTestSessionWithOptions(opts)
      this.hitSession.start()
    } catch (e) {
      this.hitSession = null
      log(`floor search unavailable (${e}); a virtual floor will be used`)
    }
  }

  private onUpdate(): void {
    if (!this.camT) return
    const dt = getDeltaTime() // real elapsed time: the 3 s labels and 0.3 s fades are wall-clock
    if (!this.placed) {
      this.searchFloor(dt)
      return
    }
    if (this.labelTimer > 0) {
      this.labelTimer -= dt
      if (this.labelTimer <= 0) this.showShortLabels()
    }
    const user = this.userLocal()
    const faded = this.crowd && this.crowdShown ? this.crowd.updateFade(user.x, user.z, this.clearRadiusCm, dt, this.fadeSeconds) : 0
    if (faded !== this.fadedCount) {
      this.fadedCount = faded
      log(`faded=${faded} (ghost bodies inside the ${this.clearRadiusCm} cm clear circle)`)
    }
    if (this.crowd && this.crowdShown) this.crowd.sway(getTime(), dt, this.crowdDensity)
    if (this.murmur) {
      this.murmurVolume += (this.murmurTarget - this.murmurVolume) * Math.min(1, dt / MURMUR_EASE_S)
      this.murmur.volume = this.murmurVolume
    }
    this.updateArrow(dt, user)
  }

  // ── Floor + placement ──────────────────────────────────────────────────────
  private searchFloor(dt: number): void {
    this.searchS += dt
    const eye = this.camT.getWorldPosition()
    if (this.hitSession) {
      const look = this.flatLook()
      const p = (FLOOR_PITCHES_DEG[this.rayIndex++ % FLOOR_PITCHES_DEG.length] * Math.PI) / 180
      const dir = look.uniformScale(Math.cos(p)).add(new vec3(0, -Math.sin(p), 0))
      this.hitSession.hitTest(eye, eye.add(dir.uniformScale(1000)), (hit: WorldQueryHitTestResult) => {
        if (!this.placed && hit && hit.normal.y > 0.85 && hit.position.y < eye.y - FLOOR_MIN_DROP_CM) {
          this.floorHits.push(hit.position.y)
        }
      })
    }
    if (this.floorHits.length > 0 && this.searchS >= FLOOR_SETTLE_S) {
      const sorted = this.floorHits.slice().sort((a, b) => a - b)
      this.place(sorted[Math.floor(sorted.length / 2)], "found")
    } else if (this.searchS >= FLOOR_TIMEOUT_S) {
      this.place(eye.y - this.eyeHeightCm, "virtual")
    }
  }

  private place(floorY: number, source: string): void {
    this.placed = true
    this.floorSource = source
    if (this.hitSession) this.hitSession.stop()
    const eye = this.camT.getWorldPosition()
    const t = this.zoneRoot.getTransform()
    t.setWorldPosition(new vec3(eye.x, floorY, eye.z)) // under where the user stands
    t.setWorldRotation(quat.angleAxis(yawOf(this.camT.forward, this.camT.up), vec3.up())) // zone -Z = the way the user faced
    this.zoneView = new ZoneView(this.zoneRoot, this.arrowRoot, this.virtualFloorRoot,
      (c: number, x: number, z: number, p: DragPhase) => this.onCornerDrag(c, x, z, p), this.debugColliders)
    this.crowd = new Crowd(this.zoneRoot, this.ghostColor, TOP_EDGE_GAIN)
    this.murmur = this.createMurmur()
    if (source === "virtual") this.zoneView.showVirtualFloor()
    log(`start floor=${source} floorY=${f2(floorY)} eyeY=${f2(eye.y)} eyeHeight=${f2(eye.y - floorY)} hits=${this.floorHits.length}`)
    this.setRect({...START_RECT}, "start")
    this.applyMode()
  }

  // ── State changes ──────────────────────────────────────────────────────────
  private get crowdShown(): boolean {
    return this.placed && ((this.mode === "done" && this.density > 0) || this.mode === "quiz")
  }
  /** The density the crowd is drawn at: the hidden one during a round. */
  private get crowdDensity(): number {
    return this.quiz ? this.quiz.truth : this.density
  }
  /** False while guessing: the floor tint, the square's glow and number, and the short count would give it away. */
  private get revealed(): boolean {
    return !this.quiz || this.quiz.phase === "result"
  }

  /** The left button means Done, Edit zone, Check or Next round depending on the state. */
  private pressMainButton(): void {
    if (this.mode === "setup") this.pressDone()
    else if (this.mode === "done") this.pressEditZone()
    else if (this.quiz && this.quiz.phase === "guess") this.pressCheck()
    else this.nextRound()
  }

  private enterGuess(): void {
    const q = this.quiz!
    this.clipboard.setMode("guess")
    this.clipboard.showGuess(q.guess)
    this.refreshCrowd()
    this.showFullLabels()
    log(`quiz=guess ghosts=${this.getGhostCount()} tint=${this.getTint()} (density hidden)`)
  }

  /** A whole density from QUIZ_MIN to MAX_DENSITY, never the same as `last` twice in a row. */
  private randomTruth(last: number): number {
    let n = last
    while (n === last) n = QUIZ_MIN + Math.floor(Math.random() * (MAX_DENSITY - QUIZ_MIN + 1))
    return n
  }

  private setGuess(n: number): void {
    const q = this.quiz
    if (!q || q.phase !== "guess") return
    const next = clamp(Math.round(n), 0, MAX_DENSITY)
    if (next === q.guess) return
    this.playTick(next > q.guess)
    q.guess = next
    this.clipboard.showGuess(next)
  }

  private playTick(up: boolean): void {
    const tick = up ? this.tickUp : this.tickDown
    if (tick) tick.play(1)
    up ? this.ticks.up++ : this.ticks.down++
  }

  private get clipMode(): ClipMode {
    if (this.quiz) return this.quiz.phase
    return this.mode === "setup" ? "setup" : "done"
  }

  private applyMode(): void {
    const setup = this.mode === "setup"
    this.clipboard.setMode(this.clipMode)
    if (this.zoneView) this.zoneView.setHandlesVisible(setup)
    this.refreshCrowd()
    log(`mode=${this.mode} handles=${setup ? "shown" : "hidden"} slider=${setup ? "disabled" : "enabled"} ` +
      `hint=${setup ? "shown" : "hidden"} button="${this.clipboard.buttonLabelText}" ` +
      `crowd=${this.crowdShown ? "shown" : "hidden"} ghosts=${this.getGhostCount()} tint=${this.getTint()}`)
  }

  private applyDensity(n: number, source: string): void {
    if (this.quiz) return // during a round the slider sets the guess (setGuess), not the density
    const next = clamp(Math.round(n), 0, MAX_DENSITY)
    if (next === this.density) return
    const crossed = this.density < REDLINE && next >= REDLINE // once per crossing up past 5, never while >= 5
    if (source === "slider") this.playTick(next > this.density) // one soft tick per slider step change
    this.density = next
    if (crossed) {
      if (this.audio) this.audio.play(1) // created in onStart; a test hook may set the density earlier
      this.toneCount++
    }
    this.clipboard.showDensity(next, TINT_RGB[tintName(next)], LEVEL_CAPTION[tintName(next)])
    if (this.placed) {
      this.refreshCrowd()
      this.showFullLabels()
    }
    log(`density=${next} ghosts=${this.getGhostCount()} square=${this.getSquareFootprintCount()} ` +
      `tint=${this.getTint()} tone=${crossed ? "played" : "none"} source=${source}`)
  }

  private onCornerDrag(corner: number, x: number, z: number, phase: DragPhase): void {
    if (this.mode !== "setup" || !this.placed) return
    if (isNaN(x) || isNaN(z)) {
      if (phase === "end") this.logZone("drag-end")
      return
    }
    this.setRect(dragCornerTo(this.rect, corner, x, z), phase === "end" ? "drag-end" : "drag")
  }

  private setRect(r: ZoneRect, reason: string): void {
    const before = this.floorLabels.text
    this.rect = r
    this.zoneView!.update(r)
    if (this.murmur) {
      this.murmur.getSceneObject().getTransform().setLocalPosition(new vec3(rectCenterX(r), MURMUR_HEIGHT_CM, rectCenterZ(r)))
    }
    this.floorLabels.layout(r)
    this.refreshCrowd()
    this.showFullLabels()
    if (reason !== "drag" || this.floorLabels.text !== before) this.logZone(reason)
  }

  private logZone(reason: string): void {
    const r = this.rect
    log(`zone w=${f2(rectWidth(r) / 100)} d=${f2(rectDepth(r) / 100)} area=${f2(rectAreaM2(r))} ` +
      `labels="${this.floorLabels.text}" reason=${reason}`)
  }

  private refreshCrowd(): void {
    if (!this.crowd || !this.zoneView) return
    const show = this.crowdShown
    const reveal = show && this.revealed
    const n = this.crowdDensity
    const u = this.userLocal()
    let spots = show ? layoutCrowd(this.rect, n) : []
    if (!reveal) spots = spots.map((s) => ({...s, inSquare: false})) // guessing: the square's feet don't glow
    this.crowd.setSpots(spots, u.x, u.z, this.clearRadiusCm)
    this.murmurTarget = show ? MURMUR_VOLUME[n] : 0
    const rgb = TINT_RGB[tintName(n)]
    this.zoneView.setTint(reveal && rgb ? new vec4(rgb.x, rgb.y, rgb.z, this.tintOpacity) : null)
    this.zoneView.setSquareVisible(reveal)
    this.floorLabels.setSquareNumber(this.getSquareFootprintCount(), reveal)
  }

  private showFullLabels(): void {
    const wasFull = this.floorLabels.isFull
    this.labelTimer = this.labelSeconds
    this.floorLabels.showFull(rectAreaM2(this.rect), peopleFor(2, this.rect), peopleFor(5, this.rect))
    if (!wasFull) log(`labels=full text="${this.floorLabels.text}"`)
  }

  private showShortLabels(): void {
    this.labelTimer = 0
    if (!this.revealed) return // guessing: the short form ("60 people") would give the density away; keep the full one
    this.floorLabels.showShort(peopleFor(this.crowdShown ? this.crowdDensity : 0, this.rect)) // no crowd shown → 0 people
    log(`labels=short text="${this.floorLabels.text}"`)
  }

  // ── Arrow: only while the user is outside the zone and no part of it is in view ──
  private updateArrow(dt: number, user: vec3): void {
    const want = !inRect(this.rect, user.x, user.z) && !this.zoneInView()
    this.arrowWantS = want ? this.arrowWantS + dt : 0
    const show = want && this.arrowWantS >= ARROW_DELAY_S
    if (show) {
      const eye = this.camT.getWorldPosition()
      const floorY = this.zoneRoot.getTransform().getWorldPosition().y
      this.arrowPos = new vec3(eye.x, floorY + 1, eye.z).add(this.flatLook().uniformScale(ARROW_AHEAD_CM))
      const d = this.zoneCentreWorld().sub(this.arrowPos)
      this.arrowYaw = Math.atan2(-d.x, -d.z) // the arrow mesh points -Z
      this.zoneView!.showArrow(this.arrowPos, this.arrowYaw)
    }
    if (show !== this.arrowShown) {
      this.arrowShown = show
      if (!show) this.zoneView!.hideArrow()
      if (show) {
        const info = this.getArrowInfo()
        log(`arrow=shown ahead=${f2(info.aheadCm)}cm errorDeg=${f2(info.errorDeg)} (zone out of view, user outside)`)
      } else {
        log("arrow=hidden")
      }
    }
  }

  /**
   * True if any part of the zone rect is on screen. Samples only the outline (every VIEW_SAMPLE_CM);
   * if no outline point is on screen but the zone still is, the view's floor lies wholly inside it,
   * so a few floor rays from the screen's centre and bottom catch that case.
   */
  private zoneInView(): boolean {
    const m = this.zoneRoot.getTransform().getWorldTransform()
    const eye = this.camT.getWorldPosition()
    const look = this.camT.forward.uniformScale(-1)
    const r = this.rect
    const onScreen = (x: number, z: number): boolean => {
      const p = m.multiplyPoint(new vec3(x, 0, z))
      if (p.sub(eye).dot(look) <= 0) return false
      const s = this.camera.worldSpaceToScreenSpace(p)
      return s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1
    }
    const edges: [number, number, number, number][] = [
      [r.minX, r.minZ, r.maxX, r.minZ], [r.maxX, r.minZ, r.maxX, r.maxZ],
      [r.maxX, r.maxZ, r.minX, r.maxZ], [r.minX, r.maxZ, r.minX, r.minZ]
    ]
    for (const [x0, z0, x1, z1] of edges) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / VIEW_SAMPLE_CM))
      for (let i = 0; i < n; i++) if (onScreen(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n)) return true
    }
    const inv = this.zoneRoot.getTransform().getInvertedWorldTransform()
    const o = inv.multiplyPoint(eye)
    for (const sp of VIEW_FLOOR_RAYS) {
      const q = inv.multiplyPoint(this.camera.screenSpaceToWorldSpace(sp, 100))
      const dy = q.y - o.y
      if (dy >= -1e-3) continue // ray doesn't go down to the floor
      const t = -o.y / dy
      if (inRect(r, o.x + (q.x - o.x) * t, o.z + (q.z - o.z) * t)) return true
    }
    return false
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  /** A non-spatial one-shot on the main object, low latency because it answers the user's hand. */
  private createSfx(track: AudioTrackAsset): AudioComponent {
    const a = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent
    a.audioTrack = track
    a.playbackMode = Audio.PlaybackMode.LowLatency
    return a
  }

  /** Spatial crowd murmur at head height in the middle of the zone; refreshCrowd sets its volume. */
  private createMurmur(): AudioComponent {
    const so = global.scene.createSceneObject("Murmur")
    so.setParent(this.zoneRoot)
    const a = so.createComponent("Component.AudioComponent") as AudioComponent
    a.audioTrack = MURMUR
    a.playbackMode = Audio.PlaybackMode.LowPower // ambient bed: latency doesn't matter
    a.spatialAudio.enabled = true
    a.spatialAudio.positionEffect.enabled = true
    a.spatialAudio.distanceEffect.enabled = true
    a.spatialAudio.distanceEffect.minDistance = MURMUR_NEAR_CM
    a.spatialAudio.distanceEffect.maxDistance = MURMUR_FAR_CM
    a.volume = 0
    a.play(-1)
    return a
  }

  private userLocal(): vec3 {
    return this.zoneRoot.getTransform().getInvertedWorldTransform().multiplyPoint(this.camT.getWorldPosition())
  }

  private zoneCentreWorld(): vec3 {
    return this.zoneRoot.getTransform().getWorldTransform().multiplyPoint(new vec3(rectCenterX(this.rect), 0, rectCenterZ(this.rect)))
  }

  /** The way the user faces, flattened onto the floor (camera looks along -forward). */
  private flatLook(): vec3 {
    const f = this.camT.forward
    const flat = new vec3(-f.x, 0, -f.z)
    return flat.length > 1e-3 ? flat.normalize() : new vec3(0, 0, -1)
  }
}
