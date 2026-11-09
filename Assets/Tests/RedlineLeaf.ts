/**
 * RedlineLeaf — shared helpers for the Redline LEAF scenarios (not a component).
 *
 * The scenarios pinch and drag the REAL SIK / UIKit interactables (DoneEditButton, TestEyeButton, Handle0..3) the way
 * a mouse pinch does in Interactive Preview, set the DensitySlider through its UIKit value, and read the
 * result from RedlineMain's
 * read-only test getters. Walking and turning are simulated by moving the zone around the preview
 * camera, which gives the same relative geometry as the user moving.
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {RedlineMain} from "../Scripts/RedlineMain"
import {MAX_DENSITY} from "../Scripts/RedlineGeometry"

export async function waitFor(what: string, cond: () => boolean, timeoutMs: number = 3000): Promise<void> {
  const end = getTime() + timeoutMs / 1000
  while (!cond()) {
    if (getTime() > end) throw new Error(`timed out after ${timeoutMs} ms waiting for: ${what}`)
    await sleep(50)
  }
}

/** The Redline controller, once the zone has been placed on the floor (up to ~3 s in the preview). */
export async function redline(): Promise<RedlineMain> {
  const so = findSceneObjectByName("Redline")
  if (!so) throw new Error(`scene object "Redline" not found`)
  const m = so.getComponent(RedlineMain.getTypeName()) as RedlineMain
  if (!m) throw new Error("RedlineMain not found on Redline")
  await waitFor("the zone to be placed on the floor", () => m.isPlaced(), 8000)
  return m
}

/** Expected floor-label text for the zone's current area (mirrors the labels' rounding). */
export function labelsFor(areaM2: number): string {
  const r = Math.round(areaM2 * 10) / 10
  const area = Number.isInteger(r) ? `${r}` : r.toFixed(1)
  return `${area} m², ${Math.round(2 * areaM2)} people at 2 per m², ${Math.round(5 * areaM2)} at 5 per m²`
}

export class RedlineInteractor extends DefaultLeafInteractor {
  /** Pinch an interactable by its scene object name. */
  async pinch(name: string): Promise<void> {
    await this.trigger(this.find(name))
    await sleep(300)
  }

  /** Pinch the clipboard's left button (Done / Edit zone / Check / Next round). */
  async pressButton(): Promise<void> {
    await this.pinch("DoneEditButton")
  }

  /** Pinch the clipboard's right button (Test your eye / Stop test). */
  async pressTestButton(): Promise<void> {
    await this.pinch("TestEyeButton")
  }

  /** During a Test your eye round, set the guess to n through the slider's UIKit value. */
  async slideGuess(m: RedlineMain, n: number): Promise<void> {
    const so = findSceneObjectByName("DensitySlider")
    const slider = so ? (so.getComponent(Slider.getTypeName()) as Slider) : null
    if (!slider) throw new Error("UIKit Slider not found on DensitySlider")
    slider.currentValue = n / MAX_DENSITY
    await waitFor(`the guess to read ${n}`, () => m.getQuizGuess() === n, 2000)
    await sleep(100)
  }

  /**
   * Set the clipboard slider to n through UIKit's Slider value, which fires the same onValueChange a
   * finished drag does. (LEAF 2.0.2's scripted drag never moves a UIKit slider knob, so the mouse drag
   * itself is checked separately in Interactive Preview.)
   */
  async slideTo(m: RedlineMain, n: number): Promise<void> {
    const so = findSceneObjectByName("DensitySlider")
    const slider = so ? (so.getComponent(Slider.getTypeName()) as Slider) : null
    if (!slider) throw new Error("UIKit Slider not found on DensitySlider")
    slider.currentValue = n / MAX_DENSITY
    await waitFor(`the density to read ${n}`, () => m.getDensity() === n, 2000)
    await sleep(100)
  }

  /** Drag corner handle i along the floor (world-space cm per drag frame). */
  async dragHandle(i: number, perFrame: vec3, ms: number): Promise<void> {
    await this.drag(this.find(`Handle${i}`), perFrame, ms)
    await sleep(300)
  }

  private find(name: string): Interactable {
    const it = findInteractableByName(name, undefined, true)
    if (!it) throw new Error(`interactable "${name}" not found or not enabled`)
    return it
  }
}
