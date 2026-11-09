/** Done criterion 1: dragging a corner handle resizes the zone and updates the labels; Done hides the handles. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {RedlineInteractor, redline, labelsFor} from "./RedlineLeaf"

@component
export class C1ZoneResizeScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()

    // A fresh 4 x 3 m zone reads 12 m², 24 at 2 per m², 60 at 5 per m², with the handles out.
    expect(m.getZoneSize().widthM, "start width").toBeCloseTo(4, 2)
    expect(m.getZoneSize().depthM, "start depth").toBeCloseTo(3, 2)
    expect(m.getLabelsText(), "start labels").toBe("12 m², 24 people at 2 per m², 60 at 5 per m²")
    expect(m.areHandlesVisible(), "handles at start").toBe(true)

    // Drag the near-right handle outward along the floor; the far-left corner stays put.
    const before = m.getZoneRectCm()
    await ui.dragHandle(1, new vec3(5, 0, 0), 1200)
    const after = m.getZoneRectCm()
    const size = m.getZoneSize()
    expect(size.widthM, `zone wider after the drag (now ${size.widthM.toFixed(2)} m)`).toBeGreaterThan(4.05)
    expect(after.minX, "far-left corner x stays").toBeCloseTo(before.minX, 1)
    expect(after.minZ, "far-left corner z stays").toBeCloseTo(before.minZ, 1)
    expect(m.isLabelsFull(), "full labels after a change").toBe(true)
    expect(m.getLabelsText(), "labels match the new area").toBe(labelsFor(size.areaM2))

    // Pinching Done hides the handles and switches the clipboard to the crowd.
    await ui.pressButton()
    expect(m.areHandlesVisible(), "handles after Done").toBe(false)
    expect(m.getButtonLabel(), "button after Done").toBe("Edit zone")
    expect(m.isSliderEnabled(), "slider after Done").toBe(true)
    expect(m.isHintShown(), "hint after Done").toBe(false)
  }
}
