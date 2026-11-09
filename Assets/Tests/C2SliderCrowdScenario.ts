/** Done criterion 2: after Done, slider N fills the zone with N x area ghosts and the square shows exactly N pairs. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {RedlineInteractor, redline} from "./RedlineLeaf"

@component
export class C2SliderCrowdScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()

    expect(m.isSliderEnabled(), "slider greyed out before Done").toBe(false)
    await ui.pressButton()
    expect(m.getGhostCount(), "no crowd at 0").toBe(0)

    const area = m.getZoneSize().areaM2
    for (const n of [2, 5, 7]) {
      await ui.slideTo(m, n)
      expect(m.getGhostCount(), `ghosts at ${n} per m²`).toBe(Math.round(n * area))
      expect(m.getSquareFootprintCount(), `footprint pairs in the square at ${n}`).toBe(n)
      expect(m.getSquareNumberText(), `number by the square at ${n}`).toBe(`${n}`)
      if (n === 5) expect(m.getGhostCount(), "5 per m² in the 4 x 3 m zone").toBe(60)
    }
  }
}
