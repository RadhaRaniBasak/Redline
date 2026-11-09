/** Registers the Redline LEAF scenarios: one per done criterion in devpost/design-brief.md, plus R6 to R9. */
import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1ZoneResizeScenario} from "./C1ZoneResizeScenario"
import {C2SliderCrowdScenario} from "./C2SliderCrowdScenario"
import {C3ColourToneScenario} from "./C3ColourToneScenario"
import {C4ClearCircleScenario} from "./C4ClearCircleScenario"
import {C5ArrowScenario} from "./C5ArrowScenario"
import {R6SwayMurmurScenario} from "./R6SwayMurmurScenario"
import {R7ClipboardRedlineScenario} from "./R7ClipboardRedlineScenario"
import {R8RedlineToneScenario} from "./R8RedlineToneScenario"
import {R9TestYourEyeScenario} from "./R9TestYourEyeScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-zone-resize-and-done", typename: C1ZoneResizeScenario.getTypeName()},
    {id: "c2-slider-fills-crowd", typename: C2SliderCrowdScenario.getTypeName()},
    {id: "c3-floor-colour-and-tone", typename: C3ColourToneScenario.getTypeName()},
    {id: "c4-clear-circle-in-the-middle", typename: C4ClearCircleScenario.getTypeName()},
    {id: "c5-arrow-when-zone-out-of-view", typename: C5ArrowScenario.getTypeName()},
    {id: "r6-sway-and-murmur", typename: R6SwayMurmurScenario.getTypeName()},
    {id: "r7-clipboard-redline", typename: R7ClipboardRedlineScenario.getTypeName()},
    {id: "r8-redline-tone-once", typename: R8RedlineToneScenario.getTypeName()},
    {id: "r9-test-your-eye-round", typename: R9TestYourEyeScenario.getTypeName()},
  ]
}
