/**
 * Done criterion 4: in the middle of the crowd no visible ghost body is within 0.6 m of the user,
 * and the square beside them still shows exactly N pairs. Walking in is simulated by moving the zone
 * 1.5 m toward the preview camera, which puts the user right beside the highlighted square.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {RedlineInteractor, redline} from "./RedlineLeaf"

@component
export class C4ClearCircleScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()
    await ui.pressButton()
    await ui.slideTo(m, 5)

    const zt = m.zoneRoot.getTransform()
    const home = zt.getWorldPosition()
    zt.setWorldPosition(home.sub(zt.back.uniformScale(150))) // walk 1.5 m in
    await sleep(1000) // fades take ~0.3 s
    expect(m.isUserInZone(), "standing inside the zone").toBe(true)
    expect(m.getFadedCount(), "ghosts whose spot is inside the clear circle").toBeGreaterThan(0)
    expect(m.getVisibleBodiesWithin(60), "visible bodies within 0.6 m").toBe(0)
    expect(m.getSquareFootprintCount(), "pairs in the square beside you").toBe(5)
    expect(m.getGhostCount(), "crowd keeps its true density").toBe(60)

    zt.setWorldPosition(home) // step back out
    await sleep(1000)
    expect(m.getFadedCount(), "faded after stepping out").toBe(0)
    expect(m.getVisibleBodiesWithin(100000), "every body visible again").toBe(60)
  }
}
