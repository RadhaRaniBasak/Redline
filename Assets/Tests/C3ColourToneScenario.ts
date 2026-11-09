/** Done criterion 3: green 1-2, amber 3-4, red 5-7 (with the matching clipboard caption); the tone plays once per crossing up past 5. */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {RedlineInteractor, redline} from "./RedlineLeaf"

@component
export class C3ColourToneScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()
    await ui.pressButton()

    const tones0 = m.getToneCount()
    const tint = (n: number) => (n >= 5 ? "red" : n >= 3 ? "amber" : "green")
    const caption = (n: number) => (n >= 5 ? "Past the redline" : n >= 3 ? "Getting tight" : "Room to move")
    // Up 1..7: the tone plays once, on reaching 5.
    for (let n = 1; n <= 7; n++) {
      await ui.slideTo(m, n)
      expect(m.getTint(), `floor at ${n}`).toBe(tint(n))
      expect(m.getLevelCaption(), `caption at ${n}`).toBe(caption(n))
      expect(m.getToneCount() - tones0, `tones by ${n} on the way up`).toBe(n >= 5 ? 1 : 0)
    }
    // Back down to 5: still red, no new tone.
    await ui.slideTo(m, 5)
    expect(m.getTint(), "floor back at 5").toBe("red")
    expect(m.getToneCount() - tones0, "no tone while staying at 5 or above").toBe(1)
    // Below 5: amber, silent.
    await ui.slideTo(m, 4)
    expect(m.getTint(), "floor at 4").toBe("amber")
    expect(m.getToneCount() - tones0, "no tone when dropping below 5").toBe(1)
    // Cross up past 5 again: the tone plays once more.
    await ui.slideTo(m, 5)
    expect(m.getTint(), "floor at 5 again").toBe("red")
    expect(m.getToneCount() - tones0, "second crossing").toBe(2)
  }
}
