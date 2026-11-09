/** Realism check: the shared crowd wave only runs past the redline (6-7), and the murmur thickens with density. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {RedlineInteractor, redline} from "./RedlineLeaf"

@component
export class R6SwayMurmurScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()
    expect(m.getMurmurTarget(), "silent before there is a crowd").toBe(0)
    await ui.pressButton()

    await ui.slideTo(m, 2)
    const quiet = m.getMurmurTarget()
    expect(quiet, "murmur at 2 per m²").toBeGreaterThan(0)
    await ui.slideTo(m, 5)
    await sleep(2500)
    expect(m.getWaveDegrees(), "no shared wave at the redline").toBeLessThan(0.1)
    expect(m.getMurmurTarget(), "murmur louder at 5").toBeGreaterThan(quiet)

    await ui.slideTo(m, 7)
    await sleep(2500)
    expect(m.getWaveDegrees(), "shared wave builds up at 7 per m²").toBeGreaterThan(3)
    expect(m.getMurmurTarget(), "murmur loudest at 7").toBeGreaterThan(0.85)

    await ui.slideTo(m, 4)
    await sleep(4000)
    expect(m.getWaveDegrees(), "wave dies down below the redline").toBeLessThan(0.2)
  }
}
