/**
 * Done criterion 5: turning until the zone is out of view shows a floor arrow ~1 m ahead pointing back
 * to it; turning back hides it. Turning around is simulated by rotating the zone 180° about the user.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {redline, waitFor} from "./RedlineLeaf"

@component
export class C5ArrowScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    expect(m.isArrowVisible(), "no arrow while the zone is in view").toBe(false)

    const zt = m.zoneRoot.getTransform()
    const home = zt.getWorldRotation()
    zt.setWorldRotation(quat.angleAxis(Math.PI, vec3.up()).multiply(home)) // zone now behind the user
    await waitFor("the arrow to appear", () => m.isArrowVisible(), 2000)
    const a = m.getArrowInfo()
    expect(a.aheadCm, "arrow distance ahead (cm)").toBeCloseTo(100, -1) // within ~5 cm
    expect(a.errorDeg, "arrow points at the zone (degrees off)").toBeLessThan(5)

    zt.setWorldRotation(home) // turn back
    await sleep(800)
    expect(m.isArrowVisible(), "arrow after turning back").toBe(false)
  }
}
