/**
 * Test your eye: a round fills the zone at a hidden density (2..7) with every giveaway hidden, the slider
 * sets a guess, Check reveals the truth with a map and "You guessed G, it was T", Next round re-rolls,
 * and Stop test goes back to the density set before.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {RedlineInteractor, redline} from "./RedlineLeaf"

@component
export class R9TestYourEyeScenario extends Scenario {
  async run(): Promise<void> {
    const m = await redline()
    const ui = new RedlineInteractor()
    const tint = (n: number) => (n >= 5 ? "red" : n >= 3 ? "amber" : "green")

    expect(m.isTestButtonEnabled(), "Test your eye greyed out during setup").toBe(false)
    await ui.pressButton() // Done
    expect(m.isTestButtonEnabled(), "Test your eye live after Done").toBe(true)
    await ui.slideTo(m, 2)
    const area = m.getZoneSize().areaM2

    // Start a round: crowd at the hidden density, nothing on the floor or clipboard gives it away.
    await ui.pressTestButton()
    expect(m.getQuizPhase(), "round started").toBe("guess")
    const truth = m.getQuizTruth()
    expect(truth >= 2 && truth <= 7, `hidden density ${truth} is 2..7`).toBe(true)
    expect(m.getGhostCount(), "crowd at the hidden density").toBe(Math.round(truth * area))
    expect(m.getTint(), "no floor colour while guessing").toBe("none")
    expect(m.getValueText(), "number hidden, guess shown").toBe("Guess: 0")
    expect(m.getButtonLabel(), "left button").toBe("Check")
    expect(m.getTestButtonLabel(), "right button").toBe("Stop test")
    expect(m.getDensity(), "the set density is untouched").toBe(2)

    // Guess (deliberately off by one or two) and Check.
    const guess = truth === 4 ? 6 : 4
    await ui.slideGuess(m, guess)
    expect(m.getGhostCount(), "guessing doesn't change the crowd").toBe(Math.round(truth * area))
    await ui.pressButton() // Check
    expect(m.getQuizPhase(), "result shown").toBe("result")
    expect(m.getLevelCaption(), "result line").toBe(`You guessed ${guess}, it was ${truth}`)
    expect(m.getValueText(), "true density revealed").toBe(`${truth} per m²`)
    expect(m.getTint(), "floor colour revealed").toBe(tint(truth))
    expect(m.getMapPeopleCount(), "one map dot per person").toBe(m.getGhostCount())
    expect(m.getButtonLabel(), "left button after Check").toBe("Next round")

    // Next round: a new hidden density, guess reset.
    await ui.pressButton() // Next round
    expect(m.getQuizPhase(), "back to guessing").toBe("guess")
    expect(m.getQuizTruth() !== truth, "a different density next round").toBe(true)
    expect(m.getValueText(), "guess reset").toBe("Guess: 0")

    // Stop: back to the density set before the test.
    await ui.pressTestButton() // Stop test
    expect(m.getQuizPhase(), "test stopped").toBe("off")
    expect(m.getDensity(), "density as before").toBe(2)
    expect(m.getGhostCount(), "crowd as before").toBe(Math.round(2 * area))
    expect(m.getButtonLabel(), "left button back to Edit zone").toBe("Edit zone")
  }
}
