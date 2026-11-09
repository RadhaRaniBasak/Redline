/** The redline tone plays exactly once on reaching 5 from below, and not again while staying at or above 5. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {RedlineInteractor, redline} from "./RedlineLeaf"

@component
export class R8RedlineToneScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()
    await ui.pressButton() // Done: the slider goes live

    await ui.slideTo(m, 4)
    const before = m.getToneCount()
    await ui.slideTo(m, 5)
    expect(m.getToneCount() - before, "one tone on reaching 5 from 4").toBe(1)
    await ui.slideTo(m, 6)
    await ui.slideTo(m, 7)
    await ui.slideTo(m, 5)
    expect(m.getToneCount() - before, "no more tones while at 5 or above").toBe(1)

    // Ticks: one per slider step change, by direction (the down tick is the quieter one).
    const t0 = m.getTickCounts()
    await ui.slideTo(m, 6)
    await ui.slideTo(m, 5)
    const t1 = m.getTickCounts()
    expect(t1.up - t0.up, "one up tick for 5 -> 6").toBe(1)
    expect(t1.down - t0.down, "one down tick for 6 -> 5").toBe(1)
  }
}
