/** Clipboard redline: a red mark on the slider where the knob stops at 5, and the value in the floor's colour. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName} from "Leaf.lspkg/Utils/common/Utils"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import {RedlineMain} from "../Scripts/RedlineMain"
import {RedlineInteractor, redline, waitFor} from "./RedlineLeaf"

function expectValueMatchesFloor(m: RedlineMain, n: number): void {
  const v = m.getValueColor()
  const f = m.getFloorTintColor()
  if (!f) throw new Error(`at ${n} per m² the floor has no tint`)
  expect(v.x, `at ${n}: value red = floor red`).toBeCloseTo(f.x, 2)
  expect(v.y, `at ${n}: value green = floor green`).toBeCloseTo(f.y, 2)
  expect(v.z, `at ${n}: value blue = floor blue`).toBeCloseTo(f.z, 2)
  expect(v.w, `at ${n}: value fully lit`).toBeCloseTo(1, 2)
}

@component
export class R7ClipboardRedlineScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()
    const markSo = findSceneObjectByName("RedlineMark")
    if (!markSo) throw new Error(`scene object "RedlineMark" not found`)
    const markColor = () => (markSo.getComponent("Component.RenderMeshVisual") as RenderMeshVisual).mainMaterial.mainPass.baseColor
    const sliderSo = findSceneObjectByName("DensitySlider")
    const slider = sliderSo ? (sliderSo.getComponent(Slider.getTypeName()) as Slider) : null
    if (!slider) throw new Error("UIKit Slider not found on DensitySlider")

    // Setup: the value and the mark are greyed out with the slider.
    expect(markSo.isEnabledInHierarchy, "mark shown").toBe(true)
    expect(m.getValueColor().w, "value greyed in setup").toBeLessThan(0.6)
    expect(markColor().x, "mark dimmed in setup").toBeLessThan(0.6)

    // After Done: white at 0, bright red mark.
    await ui.pressButton()
    const c0 = m.getValueColor()
    expect(c0.x + c0.y + c0.z + c0.w, "value white at 0").toBeCloseTo(4, 2)
    expect(markColor().x, "mark bright red after Done").toBeGreaterThan(0.9)

    // Every step: the value has exactly the floor's colour (green, amber, red).
    for (let n = 1; n <= 7; n++) {
      await ui.slideTo(m, n)
      expectValueMatchesFloor(m, n)
    }

    // At 5 the knob stops right on the mark.
    await ui.slideTo(m, 5)
    const gap = () => slider.knobVisual.transform.getWorldPosition().distance(markSo.getTransform().getWorldPosition())
    await waitFor("the knob to settle on the red mark", () => gap() < 0.15, 2000)
    expect(gap(), "knob centre to mark centre at 5 (cm)").toBeLessThan(0.15)

    // Back to 0 → white; Edit zone → greyed out again.
    await ui.slideTo(m, 0)
    const w = m.getValueColor()
    expect(w.x + w.y + w.z + w.w, "value white back at 0").toBeCloseTo(4, 2)
    await ui.pressButton()
    expect(m.getValueColor().w, "value greyed after Edit zone").toBeLessThan(0.6)
    expect(markColor().x, "mark dimmed after Edit zone").toBeLessThan(0.6)
  }
}
