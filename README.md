# Redline

A Spectacles Lens that puts a life-size ghost crowd on your real floor, so you can feel where 5 people per m² starts to get dangerous before the doors open.

**Demo video (under 3 minutes): [youtu.be/H1h7XHV2v-U](https://youtu.be/H1h7XHV2v-U)**

[![Watch the Redline demo on YouTube](https://img.youtube.com/vi/H1h7XHV2v-U/hqdefault.jpg)](https://youtu.be/H1h7XHV2v-U)

![Redline at 5 people per m²: the floor turns red](docs/images/01-red-floor-5.jpg)

**Status**

- [x] Planned with the Devpost Learn skill pack (`devpost/design-brief.md`, approved)
- [x] Built with CLAD in Lens Studio, through the Lens Studio MCP
- [x] Every done criterion has a LEAF test, all passing in the preview (section 8)
- [x] Public demo video, under 3 minutes
- [x] Screenshots from the Interactive Preview (section 3)
- [x] Manual click check in Interactive Preview (section 10)
- [ ] Frame time and comfort on real Specs (needs the glasses, section 9)

---

## 2. The problem and who it's for

Crowd crushes happen when too many people pack into too little space. Above about 5 standing people per m², the risk climbs sharply, and that is hard to judge at eye level.

Redline is for **student organizers and volunteer stewards** who plan an event in a venue and need a feel for the 5-per-m² redline in their own space, before the doors open.

Sources for the 5-per-m² figure:

- G. Keith Still's crowd-density guidance: standing crowds become dangerous above about 5 people per m² (moving crowds above about 3). Surging and collapse appear above that level. [gkstill.com](https://gkstill.com/Support/crowd-density/CrowdDensity-1.html)
- G. Keith Still, *Introduction to Crowd Science* (CRC Press, 2014). Reviewed in [ASIS Security Management](https://www.asisonline.org/security-management-magazine/articles/2016/07/book-review-crowd-science/).
- Riskex, "When Is a Crowd Likely to Become Dangerous?", which summarizes Still's static (above 5/m²) and dynamic (above 3/m²) limits. [riskex.com](https://riskex.com/when-is-a-crowd-likely-to-become-dangerous)
- UK *Guide to Safety at Sports Grounds* ("Green Guide", SGSA): a maximum standing density of 4.7 per m² (47 per 10 m²). [sgsa.org.uk/green-guide](https://sgsa.org.uk/green-guide). This figure was confirmed from secondary copies, not the current official text.

- Other summaries put the onset of crush risk at about 4 per m², for example [Wikipedia: Crowd collapses and crushes](https://en.wikipedia.org/wiki/Crowd_collapses_and_crushes), so 5 is a planning threshold, not a precise cutoff.

---

## 3. What it does

**The one spatial moment.** A steward stands in their empty hall an hour before the doors open. They drag one slider on a small clipboard panel up to 5 people per m², and a ghost crowd fills the floor around them at real size. They walk into the middle of it and look down at one highlighted square metre to count the pairs of feet packed into it. When the slider reaches 5, the floor under the crowd turns red and a low tone plays. The redline is felt in their own venue, not read as a number.

**Every mode in the build:**

| Mode | What the user sees and does |
|---|---|
| **Setup** | A light zone outline and four floor corner handles. Drag a handle to fit the zone to the space. The zone starts 4 × 3 m, with its near edge about 1 m ahead. The slider is greyed out and the clipboard shows "Fit the zone to your space, then pinch Done". Buttons: **Done** and a greyed-out **Test your eye**. |
| **Done** | The handles hide and the button reads **Edit zone** (the handles come back). The slider runs from 0 to 7 in whole steps. At any value above 0, the ghost crowd, floor tint, level caption, murmur, floor labels, highlighted square with its number, and clear circle are shown, and each step plays a tick. The arrow appears when the zone is out of view. |
| **Test your eye** | A practice round: the zone fills at a hidden random density from 2 to 7. The value reads "Guess: N" and the slider sets the guess. **Check** reveals the truth, the line "You guessed G, it was T", and a small top-down map. **Next round** re-rolls. **Stop test** returns to the density set before the round. |
| **Pin** (clipboard) | A round Pin button in the panel's top-right corner. Pinned, the clipboard stays where it is. Pinch again to let it follow. |

**Details of the Done mode**

- **Density and crowd.** Slider value N gives round(N × area) ghosts. In a 4 × 3 m zone at 5 per m², that is 60.
- **Floor tint.** Green at 1 to 2, amber at 3 to 4, red at 5 to 7. Nothing at 0.
- **Level caption** under the value, in the floor colour: "Room to move" (1 to 2), "Getting tight" (3 to 4), "Past the redline" (5 to 7). Blank at 0.
- **Tone.** A low, calm swell that plays once each time the density crosses up past 5. It does not repeat while the slider stays at 5 or above.
- **Ticks.** A short click for each whole step. A step down is quieter than a step up.
- **Murmur.** A spatial murmur from head height in the middle of the zone. It is silent at 0 and loudest at 7.
- **Floor labels.** Full labels for 3 seconds after any change, then a short "N people". Example full label: "12 m², 24 people at 2 per m², 60 at 5 per m²".
- **Highlighted square.** A glowing 1 × 1 m outline at the zone centre, with its footprint pairs and a number (about 20 cm tall) beside it.
- **Clear circle.** Ghost bodies within 0.6 m of the user fade out and fade back in when the user steps away. Footprints never fade.
- **Arrow.** A small arrow on the floor about 1 m ahead, pointing back to the zone. It shows only while the user is outside the zone and no part of it is in view.
- **Sway and wave.** Each figure leans a little on its own. At 6 and 7 per m², a slow wave also runs through the crowd toward the stage.

### Screenshots (Lens Studio Interactive Preview, SPECS 27)

<table>
<tr><td width="50%" valign="top"><img src="docs/images/07-start-view.jpg" alt="Setup: drag the blue corner handles to fit the zone to your space. The slider stays greyed out until you pinch Done."><br>Setup: drag the blue corner handles to fit the zone to your space. The slider stays greyed out until you pinch Done.</td><td width="50%" valign="top"><img src="docs/images/06-density-1-green.jpg" alt="1 per m²: a sparse crowd on a green floor, the first step of the 0 to 7 slider."><br>1 per m²: a sparse crowd on a green floor, the first step of the 0 to 7 slider.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/images/05-density-2-green.jpg" alt="2 per m²: a green floor and "Room to move", with two pairs of feet in the highlighted square metre."><br>2 per m²: a green floor and "Room to move", with two pairs of feet in the highlighted square metre.</td><td width="50%" valign="top"><img src="docs/images/04-density-3-amber.jpg" alt="3 per m²: an amber floor, with exactly three pairs of feet in the highlighted square metre."><br>3 per m²: an amber floor, with exactly three pairs of feet in the highlighted square metre.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/images/03-density-4-amber.jpg" alt="4 per m²: the floor turns amber and the clipboard warns "Getting tight", one step before the red mark on the slider."><br>4 per m²: the floor turns amber and the clipboard warns "Getting tight", one step before the red mark on the slider.</td><td width="50%" valign="top"><img src="docs/images/01-red-floor-5.jpg" alt="5 per m²: the floor turns red and the clipboard reads "Past the redline", the point where a standing crowd becomes dangerous."><br>5 per m²: the floor turns red and the clipboard reads "Past the redline", the point where a standing crowd becomes dangerous.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/images/02-preview-specs27-5.jpg" alt="Running in Lens Studio's Interactive Preview on SPECS 27: the highlighted square metre shows five glowing pairs of feet."><br>Running in Lens Studio's Interactive Preview on SPECS 27: the highlighted square metre shows five glowing pairs of feet.</td><td width="50%" valign="top"><img src="docs/images/08-density-6-red.jpg" alt="6 per m²: past the redline, the crowd packs tighter and the slider sits beyond its red mark."><br>6 per m²: past the redline, the crowd packs tighter and the slider sits beyond its red mark.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/images/14-density-7-red.jpg" alt="7 per m², the top of the slider: seven pairs of feet packed into one square metre."><br>7 per m², the top of the slider: seven pairs of feet packed into one square metre.</td><td width="50%" valign="top"><img src="docs/images/13-whole-room-100m2.jpg" alt="A whole room: a 100 m² zone at 7 per m² holds 700 life-size people, sized with the + and − buttons."><br>A whole room: a 100 m² zone at 7 per m² holds 700 life-size people, sized with the + and − buttons.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/images/12-test-your-eye-new-round.jpg" alt="Test your eye, a new round: the zone fills at a hidden density, and the clipboard only asks "How dense is it?""><br>Test your eye, a new round: the zone fills at a hidden density, and the clipboard only asks "How dense is it?"</td><td width="50%" valign="top"><img src="docs/images/11-test-your-eye-guess.jpg" alt="Test your eye hides the number and the floor colour. Set your guess with the slider, then pinch Check."><br>Test your eye hides the number and the floor colour. Set your guess with the slider, then pinch Check.</td></tr>
<tr><td width="50%" valign="top"><img src="docs/images/10-test-your-eye-reveal.jpg" alt="The reveal: the true density, "You guessed 4, it was 7", and a top-down map with one dot per person."><br>The reveal: the true density, "You guessed 4, it was 7", and a top-down map with one dot per person.</td><td width="50%" valign="top"><img src="docs/images/09-test-your-eye-inside.jpg" alt="The same reveal seen from inside the crowd."><br>The same reveal seen from inside the crowd.</td></tr>
</table>

---

## 4. How to try it

1. Install **Lens Studio 5.24**. The project was built with 5.24.1.
2. Open `redline.esproj`.
3. In the Preview panel, choose device **SPECS 27** and input **Interactive**. For example, use the "Evening Outdoor" interactive scene. The floor of the preview's simulated room stands in for the hall. If the Lens cannot find a floor within 3 seconds, it uses a virtual floor 160 cm below the eye.
4. Press Play.

**Controls (Interactive Preview)**

| Action | Input |
|---|---|
| Walk | W A S D |
| Go down / up | Q / E |
| Look around | Right-drag, or hold Shift and move the mouse |
| Pinch (press a button, drag a slider or handle) | Click |

**Field of view.** The SPECS 27 preview draws only the content inside the glasses' field of view, which is about 37° tall. It does not draw the whole panel. Content placed outside that window will not show in the preview.

**Geometry checks (no Lens Studio needed)**

```
npm test
```

This needs Node 22 or later and no install. It runs `tests/geometry.test.mjs`, which loads `Assets/Scripts/RedlineGeometry.ts` directly.

**LEAF scenarios**

The nine LEAF scenarios are listed in `Assets/Tests/LeafIndex.ts`:
`c1-zone-resize-and-done`, `c2-slider-fills-crowd`, `c3-floor-colour-and-tone`, `c4-clear-circle-in-the-middle`, `c5-arrow-when-zone-out-of-view`, `r6-sway-and-murmur`, `r7-clipboard-redline`, `r8-redline-tone-once`, `r9-test-your-eye-round`.

**Running them.** In this build the agent ran the scenarios through the Lens Studio MCP tools `open_leaf_panel`, `list_leaf_scenarios` and `run_leaf_scenario`. To repeat it, open the project in Lens Studio with the Preview running, connect your coding agent to the Lens Studio MCP, and ask it to list and run the LEAF scenarios.

Before publishing, disable the **LEAF Plugin Bridge** and **LeafIndex** objects, so the test scenarios do not ship in the Lens.

---

## 5. Design decisions

Each row is a decision from `devpost/design-log.md` (or the brief), with its reason.

| Decision | Why |
|---|---|
| **Clipboard size and placement** (history, see below) | Each step fixed a problem seen in the Preview. The current state is listed last. |
| Clipboard at 18 × 12 cm, held at waist height | The first 30 × 20 cm panel at 55 cm covered most of the view, hiding the crowd and the red floor. |
| Clipboard moved to about 55 cm and 10° below the line of sight, see-through, follows head turns lazily | Reading the number should not take the eyes off the crowd. A 45 cm waist position sat below the view, so reading it meant looking down. |
| Backing at 30% opacity with no depth write; text, slider and buttons solid | The crowd shows through the panel, and the controls stay readable. |
| Clipboard at 18 × 12.5 cm, 60 cm ahead, 5° below, holds still while aimed, round **Pin** button | The Done button sat at 91% of screen height, at the edge of the view. The panel also slid out from under a pinch. Pin lets the user fix it in place. |
| Ghosts: solid, unlit blue-grey (#6E8BA8), five shades, real proportions, heads and shoulder line a little brighter | At 5 per m², translucent white figures merged into a white haze. Identical figures read as a pattern, and shades read as separate people. |
| Sway, and a shared wave at 6 and 7 per m² | Above about 5 per m², a real crowd starts to move as one. Seeing that makes the redline something to feel. |
| Spatial crowd murmur, louder as density rises | Sound makes the crowd feel present, even when it is out of view. |
| Level caption under the value ("Room to move", "Getting tight", "Past the redline") | A number alone does not say what it means. The words do, at a glance. |
| Hint in 60% white at caption size | The hint was nearly as big as the button label, so nothing told the eye what mattered first. The value is now largest, then the button label, then the hint. |
| Touch areas: slider 3.6 cm tall (track 2 cm); buttons 8.2 × 4 cm (face 8 × 3 cm); 0.2 cm between the two buttons | Specs asks for targets of at least 6 cm at 110 cm, about 3.5 cm at the clipboard's ~64 cm reading distance. The slider was only 2 cm. |
| Motion: panel rises 2 cm and grows in over 0.35 s; hint and button label fade and cross-fade | The hint and label used to snap, so setup-to-done felt abrupt. |
| Calm tone: G3 (196 Hz) with a soft octave and fifth, slow decay, short room reverb | It should feel like a weight settling, not an alarm. A steward who hears an alarm reads it as "something broke". G3 is kept because small glasses speakers barely reproduce below about 150 Hz. |
| Ticks: 80 ms, down 2 semitones lower and about 4 dB quieter | You can feel each step without looking at the number. A step back sounds like easing off. |
| Test your eye, with a hidden density, a guess, and a reveal | Reading density is a skill stewards need without a number on the wall. A guess with a reveal trains it faster than watching the slider. |
| Font Archivo Black for the value and floor labels; Material icons on the buttons | Heavy weight with clear digits, and it stays readable. Atkinson Hyperlegible Next was tried first, but the import brought in only its regular weight. The brief asks for an icon on each button. |
| Zone cap 10 × 10 m (was 8 × 6 m); start stays at 4 × 3 m | The corner handles can stretch the zone over a whole room, and the slider sets the density across all of it. The 4 × 3 m start stays because the done criteria and LEAF tests are built on it. |
| Ghosts keep at least 22 cm (half a shoulder width) inside the zone outline | No figure should stick out past the outline. |
| Ghosts load blue-grey, not black | The scene had saved them black. Black shows as see-through on the additive display. |
| Zone and clipboard face the right way when looking straight down | The heading uses the up vector as well as forward, so it stays stable when the user looks straight down or up. |
| After Edit zone, the floor reads "0 people" | The crowd is hidden in setup, so a count would describe a crowd that is not shown. |
| Ghosts share one material pair per shade (each gets its own only while fading); zone-in-view check samples only the outline | Fewer materials keep the crowd batched. Sampling only the outline cuts per-frame work on the glasses. |
| **Thin-strip layout fix**, found by `npm test` | A strip thinner than 22 cm, such as the edge of a 3.05 m zone, pushed a person into the next full square metre, which then held N + 1. Thin strips now take no one, and their share goes to the roomier cut cells. |

**Clipboard history, in order:** 30 × 20 cm at 55 cm (covered the crowd) → 18 × 12 cm at waist height (45 cm ahead, 45 cm below eye level, below the view) → 18 × 12 cm about 55 cm away, 10° below the line of sight, see-through, follows lazily → 18 × 12.5 cm at 60 cm, 5° below, holds still while aimed, round Pin button (the earlier placement left the Done button at the edge of the view, and clicks were not reaching the buttons).

> **Known issue:** the Inspector default for the clipboard distance is 60 cm. The saved scene still overrides it to 45 cm, so the current build runs the clipboard at 45 cm, not 60 cm. Change the value in the scene (or remove the override) to match the decision above.

---

## 6. Architecture

### Scene

| Object | Role |
|---|---|
| Camera Object (Device Tracking World) | The user's head. |
| SpectaclesInteractionKit | SIK: interactors, pinch and ray input. |
| SIKExamples | Template demo. Disabled. |
| **Redline** (`RedlineMain`) | The single owner of state. Children: **Zone** (with **FloorLabels**), **Arrow**, **Clipboard**, **VirtualFloor**. The crowd, outline, tint, square and handles are built under the Zone at runtime. |
| LeafIndex, LEAF Plugin Bridge | Test-only. Disable before publishing. |

### Scripts

| File | What it does | Exports / key methods | Depends on |
|---|---|---|---|
| `Assets/Scripts/RedlineMain.ts` | State owner and orchestration. Holds mode (setup / done / quiz), density, zone rect, floor height, tone latch, 3 s label timer, clear-circle count, arrow rule. Runs the floor search, places the zone, plays the audio, and exposes the test surface used by LEAF. Logs one `[Redline] ...` line per state change. | `RedlineMain` | Geometry, Crowd, ZoneView, ClipboardUI, FloorLabelsUI |
| `Assets/Scripts/RedlineGeometry.ts` | Pure math with no Lens APIs, so Node can run it. Crowd placement, zone corner drag, heading, and the triangle data for every code-built mesh. | `layoutCrowd`, `peopleFor`, `rectAreaM2`, `squareRect`, `dragCornerTo`, `yawOf`, `ZONE_LIMITS`, `MAX_DENSITY`, mesh helpers | none |
| `Assets/Scripts/RedlineCrowd.ts` | The ghost crowd. A pool of bodies (two shared meshes each: figure and top edge), five shade material pairs, merged footprint meshes, clear-circle fade, sway and wave. Makes no decisions about density or layout. | `Crowd` | Geometry, ZoneView |
| `Assets/Scripts/RedlineZoneView.ts` | Visuals for the zone: outline, floor tint, glowing square, four SIK corner handles (drag reported as ray-floor hits in zone-local cm), floor arrow, virtual floor grid. Holds no state. | `ZoneView`, `MeshSlot`, `unlitMaterial`, render orders | Geometry, SIK |
| `Assets/Scripts/RedlineClipboardUI.ts` | The clipboard panel (UIKit). Value, level caption, 0 to 7 slider with a red mark at 5, hint, two buttons, Pin button, result map. Follows the user's gaze with lazy smoothing. Holds no domain state. | `RedlineClipboardUI`, `ClipMode`; events `onDensityChange`, `onButtonPressed`, `onTestPressed` | Geometry, ZoneView, SIK, UIKit |
| `Assets/Scripts/RedlineFloorLabelsUI.ts` | Text lying flat on the floor: full or short label on the near edge, and the square's number. Decides nothing. | `RedlineFloorLabelsUI` | Geometry, ZoneView |
| `Assets/Tests/*.ts` | LEAF scenarios c1 to c5 and r6 to r9, the shared helper `RedlineLeaf.ts`, and the index `LeafIndex.ts`. | scenario classes | Leaf, SIK, UIKit |
| `tests/geometry.test.mjs` | Node checks for the crowd maths (`npm test`). | 7 tests | `RedlineGeometry.ts` |

Key constants are set in the code. Important values:

| Constant | Value | Where |
|---|---|---|
| Redline | 5 per m² | RedlineMain |
| Test-your-eye hidden range | 2 to 7 per m² | RedlineMain |
| Start zone | 4 × 3 m, near edge 1 m ahead | RedlineMain |
| Zone limits | 2 × 2 m to 10 × 10 m | RedlineGeometry |
| Max density | 7 per m² | RedlineGeometry |
| Zone edge margin | 22 cm | RedlineGeometry |
| Cell margin | 12 cm | RedlineGeometry |
| Jitter | 0.18 × local spacing | RedlineGeometry |
| Stage spread | ±25° | RedlineGeometry |
| Ghost height | 155 to 185 cm (model 171.5 cm) | RedlineGeometry |
| Clear circle | 0.6 m, fade 0.3 s | RedlineMain |
| Label time | 3 s | RedlineMain |
| Tint opacity | 0.35 | RedlineMain |
| Murmur volume by density (0 to 7) | 0, 0.14, 0.24, 0.35, 0.47, 0.6, 0.75, 0.9 | RedlineMain |
| Arrow | 100 cm ahead, after 0.2 s out of view | RedlineMain |
| Render order | floor −40, tint −30, bodies −20, square highlight −10, UI 0 | RedlineZoneView |

### Floor search and placement

1. On start, the Lens fans hit-test rays from the eye at pitches of 30, 45, 60, 75 and 89°. It keeps hits that are nearly flat (normal y > 0.85) and well below the eye (more than 90 cm down).
2. After 0.6 s it takes the median hit height as the floor. If no hits arrive within 3 s, it places a virtual floor at eye height minus 160 cm.
3. The zone is placed under the user, with its far edge facing the way the user faced.

### Mode and state changes

- **Setup** → Done → **Done** → Edit zone → **Setup**.
- **Done** → Test your eye → **Quiz (guess)** → Check → **Quiz (result)** → Next round → **Quiz (guess)**. Stop test from either quiz phase → **Done**.

### Data flow: slider to crowd, tint and tone

```
Slider drag (UIKit Slider, in RedlineClipboardUI)
  │  onValueChange → onSlider(v): round to 0..7
  ▼
RedlineClipboardUI.onDensityChange ──► RedlineMain
  │
  ▼
RedlineMain.applyDensity(n)                        [Done mode]
  ├─ playTick(up or down)                          tickUp / tickDown, LowLatency
  ├─ crossed 4 → 5 ?  audio.play(tone), toneCount++
  ├─ clipboard.showDensity(n, tint colour, caption)
  ├─ refreshCrowd()
  │    ├─ layoutCrowd(rect, n)          RedlineGeometry     → spots
  │    ├─ crowd.setSpots(spots, user)   RedlineCrowd        → bodies, footprints
  │    ├─ murmurTarget = MURMUR_VOLUME[n]
  │    ├─ zoneView.setTint(colour, 0.35)                    RedlineZoneView
  │    ├─ zoneView.setSquareVisible(true)
  │    └─ floorLabels.setSquareNumber(count in square)      RedlineFloorLabelsUI
  └─ showFullLabels()  → after 3 s → showShortLabels() "N people"
```

In a Test your eye guess phase, the same slider calls `setGuess` instead. It plays ticks but no tone, and it does not touch the tint, the square's glow or number, or the short count. Those stay hidden until Check.

### Placement math (`RedlineGeometry.ts`)

Let A be the zone area in m², and N the density. The total is T = round(N × A).

1. **Grid.** The zone is cut into 1 × 1 m cells. The grid is aligned so one cell is the highlighted square, which is centred on the zone centre.
2. **Full cells** (1 × 1 m fully inside the zone) get exactly N people.
3. **Thin cut cells.** A partial cell with a side of 22 cm or less gets no one. Its share goes to the other cut cells.
4. **Other cut cells** get floor(N × cell area). The rest of T is handed out one person at a time by largest remainder, capped at N per cell. So the total is exactly T.
5. **Position within a cell.** Each person takes a point from `PATTERNS[count]`, a fixed layout of up to 7 points in the unit square (for example, count 5 is a dice pattern). The point is shifted by a random jitter of up to ±0.18 × √(cell area / count).
6. **Clamps.** The point is kept at least 12 cm inside its cell, then at least 22 cm inside the zone outline.
7. **Per figure.** Yaw is random within ±25° (facing the stage). Height is random between 155 and 185 cm.
8. **Randomness.** A small seeded generator (mulberry32) runs per cell, so the same input always gives the same layout.

The result: every full square metre holds exactly N people, and the highlighted square holds exactly N pairs of footprints. `npm test` checks both.

---

## 7. How it was built with CLAD

CLAD is the agent harness and toolkit used for this project. Claude Code was the agent harness.

| Stage | What was done | Tool or skill |
|---|---|---|
| Brief | An interview produced `devpost/design-brief.md` (status: approved). The brief includes the "Build notes for CLAD". | plan-lens skill (Devpost skill pack) |
| Build | The first build was done by CLAD from the brief. | CLAD. Which CLAD agents ran it is not recorded. |
| UI | Clipboard type hierarchy, spacing, hit areas, two-button row, modes. | specs-build-ui |
| Interaction | SIK interaction patterns for the handles and buttons. | specs-interaction-recipes |
| Audio | Low-latency playback for input-driven sounds (ticks and tone). | specs-audio |
| Sound | Generated the ticks and the calm redline tone. | build-sfx |
| Font | Archivo Black, imported through the font tool. | font-selector (FontSelector) |
| Icons | Material Symbols on the buttons. | icon-selector (IconSelector) |
| Tests | Wrote LEAF scenarios R8 (redline tone once) and R9 (Test your eye). | specs-leaf-write-scenarios |
| Screenshots | Taken by hand in the Interactive Preview (section 3). | verify-preview had no screenshot tool on the connected server. |
| LEAF loop | Ran the scenarios in the Preview and read the results. | Lens Studio MCP: `run_leaf_scenario`, `list_leaf_scenarios`, `open_leaf_panel`, `PreviewPanelTool` (refresh and resume), `InjectPreviewGesture` (click test) |
| Review | Code review found 10 issues. All but one were fixed. | ECC `code-review` |
| Harness | Audit of the harness. | ECC `harness-audit` |
| Mapping | Mapped the scripts and the scene for this README. | ECC `code-explorer` |
| Docs | Wrote this README. | ECC `doc-updater` |

Notes on the build:

- Some checks had to wait while the Lens Studio MCP server was offline. Those checks are marked in the design log.
- A click test (`InjectPreviewGesture`) on the Done button reached no button in one session. Fixes followed (see section 5 and section 10).

- Of the 10 code-review issues, the one not fixed is #9: the LEAF test objects (`LeafIndex`, `LEAF Plugin Bridge`) are still in the shipping scene, because disabling them would stop the tests running in the preview. Switch them off before publishing.

- `harness-audit` scored the repo 9/39 at first (no checked-in test entrypoint, no secret ignores, no CI or GitHub templates). Adding `npm test` and secret patterns to `.gitignore` raised it to 15/39. The remaining gaps are mostly GitHub setup (CI, templates, CODEOWNERS).

---

## 8. Testing

### Done criteria and their LEAF tests

Run on 2026-11-09, in Lens Studio 5.24.1 Preview, SPECS 27, Interactive, on the current code.

| # | Done criterion (from the brief) | LEAF test | Latest result |
|---|---|---|---|
| 1 | Dragging a corner resizes the zone and updates the labels (4 × 3 m shows 12 m², 24 at 2 per m², 60 at 5 per m²). Done hides the handles. | `c1-zone-resize-and-done` | PASSED |
| 2 | After Done, slider N fills the zone with N × area ghosts (5 gives 60). The highlighted square shows exactly N pairs. | `c2-slider-fills-crowd` | PASSED |
| 3 | Floor is green at 1 to 2, amber at 3 to 4, red at 5 to 7. The tone plays once on crossing up past 5 and not again while at 5 or above. | `c3-floor-colour-and-tone`, plus `r8-redline-tone-once` | PASSED |
| 4 | Walking into the middle: no visible ghost within 0.6 m of the user, and the square beside the user still shows exactly N pairs. | `c4-clear-circle-in-the-middle` | PASSED |
| 5 | Turning until the zone is out of view shows an arrow about 1 m ahead pointing back. It disappears when the user turns back. | `c5-arrow-when-zone-out-of-view` | PASSED |
| 6 | After Done, Test your eye fills the zone at a hidden density (2 to 7) with no floor colour and no number. Check shows the truth, the map, and "You guessed G, it was T". Stop test restores the density. | `r9-test-your-eye-round` | PASSED |

### Extra scenarios

| Scenario | What it checks | Latest result |
|---|---|---|
| `r6-sway-and-murmur` | The shared wave runs only at 6 and 7 per m². The murmur gets louder with density. | PASSED |
| `r7-clipboard-redline` | A red mark sits on the slider at 5. The value's colour matches the floor colour at each step. | PASSED |
| `r8-redline-tone-once` | One tone on reaching 5 from 4. None for 6, 7, or a return to 5. One tick per step, by direction. | PASSED |

### Geometry checks

`npm test` (Node 22 or later): **7 of 7 pass.** The checks cover the 4 × 3 m labels; the exact total round(N × area) for every zone size and density; exactly N in every full square metre; no body within 22 cm of the zone edge; a stable layout; corner dragging clamped to 2 to 10 m; and the facing direction when looking level, down and up.

### How the LEAF tests work, and their gaps

- The tests press buttons and set the slider through their UIKit value. They do not aim a ray or drag. A mouse drag on the slider is therefore a manual check.
- Walking and turning are simulated by moving or rotating the zone relative to the camera. The user's relative geometry is the same.
- A checked-in test caught a real counting bug in the crowd layout (section 5). Also, a test that presses buttons directly can pass while real clicks fail (section 11).
- All six done criteria have a LEAF test. Real mouse clicks and slider drags were checked by hand in the 10 Nov 2026 Preview session (section 10).

---

## 9. Performance

**Not yet measured:** frame time. It needs a check in the Preview and on real glasses at 4 × 3 m and 5 per m² (60 ghosts), 8 × 6 m and 7 per m² (336 ghosts), and 10 × 10 m and 7 per m² (700 ghosts). The Preview screenshots in section 3 include a 100 m² zone at 7 per m² (700 ghosts) running in the Preview.

Known scale facts, from the code and the design log:

- The 10 × 10 m zone at 7 per m² is 700 ghosts. The code comment in `RedlineGeometry.ts` asks for a frame-time check on device before the zone limit is raised.
- Each body is two render components (figure and top edge). The five shades share one material pair each, so the bodies can batch. A body gets its own material pair only while it fades.
- Footprints are two merged mesh slots: the normal pairs and the pairs in the highlighted square.
- Every frame, the code updates the fade of every ghost and the sway rotation of every drawn body. This is CPU work that grows with the crowd size.

---

## 10. Proven and unproven

### Proven in the Preview (logic)

Each of these passed the LEAF test in the Preview on 2026-11-09, and the geometry checks pass in Node:

- Zone labels, corner resize, and Done hiding the handles.
- Slider sets the ghost count (N × area) and the square's footprint count (N).
- Floor colour, level caption, and the tone once per crossing up past 5.
- Clear circle: bodies within 0.6 m fade out, and come back when the user steps away. Footprints and counts stay true.
- Arrow appears when the zone is out of view and disappears when the user turns back.
- Test your eye: hidden density, guess, Check, map dot count, Next round, Stop test.
- Wave at 6 and 7 per m², murmur getting louder with density, and the clipboard's red mark matching the floor colour.

These tests simulate walking and turning, and set the slider through UIKit. They are logic checks, not checks of the experience.

### Checked by hand in the Preview (2026-11-10)

- **Real mouse input.** In the Interactive Preview session used for the demo video, Done, Edit zone, slider drags from 1 to 7, the area − and + buttons (4 m² up to 100 m²), Test your eye and Check all responded to real clicks. Next round, Stop test and Pin were on screen but not separately recorded.
- **Looks.** The screenshots in section 3 show the see-through clipboard backing, the clipboard in view, and an icon on each button. The small floor labels can sit behind the clipboard's value text at this angle.

### Unproven (manual checks, or only real glasses can tell)

- **Next round, Stop test and Pin** with real clicks: not separately recorded in the 2026-11-10 session.
- **The feel of 5 per m²** through the glasses' narrow view, where only part of the crowd is visible at once. Also how the crowd reads on a display that adds light (figures may look like a pale wash).
- **Comfort** of looking down at the floor for a while, and whether everything needed is in view without looking down.
- **The arrow.** It is seen only when the user looks down at the floor. Someone who turns away while looking straight ahead may miss it.
- **Performance** on real glasses at large zones and high density (section 9).
- **Real hand tracking and real recognition.** Neither is in this build. The crowd is always virtual, and the steward fits the zone by hand.
- **Clipboard distance.** The Inspector default is 60 cm, but the saved scene overrides it to 45 cm, so the current build runs at 45 cm. This is listed in section 5.
- **Publishing.** Disable the LEAF Plugin Bridge and LeafIndex objects first.

### Limits of the tool

**Redline is a training tool. It is not a certified crowd-safety system.** It does not measure real crowds, and it must not be used to set venue capacities. The thresholds come from the sources in section 2. Those sources are a planning guide, and other sources put the risk onset at a different level.

---

## 11. What I learned

- **The display is additive, so dark is invisible.** My first ghosts were translucent white, and at 5 per m² they merged into a white haze. Dark and black read as see-through, so I moved to solid blue-grey figures, with heads and shoulder lines a little brighter, in five shades so that neighbours look like different people.
- **A narrow field of view moved the clipboard.** My first clipboard, 30 × 20 cm at 55 cm, covered most of the view in the Preview and hid the crowd and the red floor. I shrank it and dropped it to waist height, but then reading it meant looking down. I moved it back up to 10° below the line of sight, then to 5° below, and made the backing see-through.
- **A test that presses a button directly can pass while a real click fails.** The LEAF tests trigger buttons without aiming at them, so they passed while clicks on the clipboard did not reach its buttons. Real aimed clicks need their own check.
- **Writing one spatial moment into the brief gave every later decision a test to pass.** Each change could be checked against "a steward in an empty hall, one slider, the crowd at real size".
- **A calm tone, not an alarm.** An alarm reads as "something broke". The redline tone is a low swell that settles, so the steward feels a weight rather than a fault.
- **A checked-in test caught a real counting bug.** `npm test` found that a thin strip at the zone edge pushed a person into the next square metre, so that square held N + 1. The fix is in section 5, and the test now passes.

---

## 12. Repo structure

```
redline/
├── README.md                       this file
├── package.json                    "npm test" (Node 22+, no dependencies)
├── redline.esproj                  Lens Studio project
├── AGENTS.md                       Lens Studio agent reference
├── tests/
│   └── geometry.test.mjs           7 Node checks of the crowd maths
├── devpost/
│   ├── design-brief.md             approved brief (plan-lens)
│   ├── design-log.md               dated changes, each with its reason
│   └── project-story.md            Devpost story
├── docs/images/                    14 Preview screenshots (section 3)
└── Assets/
    ├── Scene.scene                 the Redline scene
    ├── Scripts/
    │   ├── RedlineMain.ts          state owner and orchestration
    │   ├── RedlineGeometry.ts      pure crowd maths and mesh data
    │   ├── RedlineCrowd.ts         ghost crowd: bodies, fade, sway, footprints
    │   ├── RedlineZoneView.ts      zone outline, tint, square, handles, arrow
    │   ├── RedlineClipboardUI.ts   clipboard panel (UIKit)
    │   └── RedlineFloorLabelsUI.ts floor text
    ├── Tests/                      LEAF scenarios c1-c5, r6-r9, RedlineLeaf.ts, LeafIndex.ts
    ├── GeneratedSFX/               RedlineMurmur, RedlineTickUp, RedlineTickDown, RedlineTone (.wav)
    ├── Fonts/                      Archivo Black (used); Atkinson Hyperlegible Next (imported, not used)
    ├── Icons/                      check, edit, arrow_forward, visibility, stop_circle, keep
    └── Materials/                  RedlineUnlit.mat, unlit.graphShader
```

**Packages.** The Redline scripts use SpectaclesInteractionKit, SpectaclesUIKit and Leaf. The template also includes SpectaclesInteractionKitExamples, SnapDecorators, Utilities, Motion, Icons and Bitmoji 3D. The Redline scripts do not import these.

---

## Credits and sources

**Credits**

- **Archivo Black**, a font, under the SIL Open Font License.
- **Material Symbols**, the icons, under the Apache License 2.0.
- **Snap's Spectacles Interaction Kit**, **Spectacles UI Kit** and **LEAF**.

**Sources for the 5-per-m² threshold** are listed in section 2.
