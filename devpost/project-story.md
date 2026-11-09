# Redline: project story

## Inspiration

Crowd crushes don't start with a stampede. They start when too many people stand in too little space, and nobody nearby can tell. Above about **5 standing people per square metre** the risk climbs sharply, but from eye level a crowd of 4 per m² and a crowd of 6 per m² look almost the same. The people who decide when to close a door or open another exit are often student organizers and volunteer stewards with no training in judging density. A number on a safety plan means little until you've stood inside it. I wanted a way to stand inside it safely, in your own venue, before the doors open.

## What it does

Redline is a Snap Spectacles Lens that fills your real floor with a **life-size ghost crowd** at a density you choose.

- **Fit the zone to your space.** A rectangle appears on the floor about 1 m in front of you. Drag its corner handles to match your hall, from 2 × 2 m up to 10 × 10 m, a whole room. Floor labels show the area and how many people it holds at 2 and at 5 per m² ("12 m², 24 people at 2 per m², 60 at 5 per m²").
- **Set the density.** Pinch **Done**, then drag one slider on a floating clipboard from 0 to 7 people per m². The zone fills with exactly that many people per square metre: standing figures 155 to 185 cm tall, 44 cm across the shoulders, in five shades of blue-grey so neighbours read as different people, all facing the "stage".
- **Feel the redline.** The floor turns green (1 to 2, "Room to move"), amber (3 to 4, "Getting tight") or red (5 to 7, "Past the redline"). When you reach 5, a low, calm tone plays once, a weight settling rather than an alarm. Each slider step ticks softly, quieter going down. A spatial crowd murmur thickens as the crowd packs in.
- **Walk into it.** Ghost bodies within 0.6 m of you fade out, so you can stand in the middle of a 5 per m² crowd. Their footprints stay, so the density stays true. Look down at the **highlighted square metre** at the centre: its footprints glow, and a number tells you how many pairs of feet are packed into it.
- **It moves like a crowd.** Every figure shifts its weight a little. Past the redline, at 6 to 7 per m², a slow wave runs through the whole crowd toward the stage, the way real packed crowds start moving as one.
- **It never loses you.** If you turn away and the zone leaves your view, an arrow appears on the floor pointing back to it.
- **Test your eye.** A practice mode fills the zone at a hidden random density from 2 to 7 and hides every giveaway: the number, the floor colour, the glowing square and the people count. Set your guess with the slider and pinch **Check**. Redline reveals the true density, draws a small top-down map of the zone with one dot per person, and tells you "You guessed 4, it was 6". **Next round** picks a new density; **Stop test** takes you back.

The clipboard is a see-through panel that rides about 60 cm away, just below your line of sight, so you never have to look down to read it. It follows you lazily, holds still while you aim at it, and has a Pin button to fix it in place. The density value and floor labels use a bold, highly readable font, and every button has an icon.

## Who it's for

Student event organizers, volunteer stewards, and anyone who runs gigs, festivals, graduations or sports events and needs to judge, by eye, when a space is getting dangerous. It's a trainer you can use in your own empty venue, an hour before the doors open.

## How I built it

- **Plan first.** I used the `plan-lens` skill to write a design brief (`devpost/design-brief.md`) around one spatial moment, with done criteria that can each be checked in Lens Studio's preview. Every change after that is recorded with its reason in `devpost/design-log.md`.
- **Built with CLAD in Claude Code** in Lens Studio 5.24, in TypeScript:
  - `RedlineGeometry` is pure maths: an exact crowd layout on a jittered grid aligned to the centre square, so every full square metre holds exactly N people and the total is exactly round(N × area).
  - `RedlineCrowd` manages a pool of ghost bodies with shared, shaded materials (so the crowd can be drawn in batches), per-body fading and sway.
  - `RedlineZoneView` draws the zone, floor tint, draggable corner handles and arrow.
  - `RedlineClipboardUI` is built with **Spectacles UI Kit** (FlexLayout, Slider, Buttons) and **Spectacles Interaction Kit**, so it works with a mouse in the preview and with hands on glasses.
  - `RedlineMain` ties it together: modes, floor finding (with a virtual floor if no real floor is found), sound and the Test your eye round.
- **Sound** was generated algorithmically with CLAD's sound tools (no samples): the ticks, the calm redline tone and the crowd murmur.
- **Assets:** the Archivo Black font and Material Symbols icons were imported with CLAD's font and icon tools.
- **Tested with LEAF:** nine integration scenarios run inside Lens Studio's preview, one for each of the six done criteria plus three extras (crowd sway and murmur, the slider's red mark, and the tone playing exactly once). All nine passed in the preview; after my last changes only the crowd test was re-run before Lens Studio crashed, so the rest need one more run.

## Challenges I ran into

- **The display adds light.** On Spectacles, black is transparent and nothing looks fully solid. My first translucent white figures merged into a white haze at 5 per m². I switched to dim, solid blue-grey figures with a distinct round head and a brighter shoulder line so each one reads as a person.
- **A narrow field of view.** Specs' view is only about 37° tall. My first clipboard was 30 × 20 cm and covered the crowd. Then I put it at waist height, where you had to look down to read it. It ended up see-through and riding just below your line of sight.
- **Tests that pass while clicks fail.** LEAF presses buttons directly, so every test passed while real mouse clicks on the clipboard weren't reaching the buttons. Logging exactly what was happening, instead of guessing, mattered: my first guess about the cause was wrong. I made the panel hold still while aimed at and added a Pin button.
- **Keeping the numbers honest.** Getting exactly N people in every full square metre and exactly round(N × area) in total, with no body poking outside the zone, took careful layout maths and a self-check across many zone sizes.

## Accomplishments I'm proud of

- A crowd you can walk into, with an exact, honest density you can count at your feet.
- Test your eye, which turns a demo into practice.
- Every done criterion has an automated test, all of which passed in the preview, and every design change is logged with its reason.

## What I learned

- **AR on glasses has its own rules:** dark means invisible, the view is small, and the best place for UI is where the user is already looking.
- **Plan one spatial moment, then build.** Writing the brief first made the build focused and testable.
- **Design for feeling, not just information.** A calm tone instead of an alarm, ticks you can feel without looking, and a crowd that sways all make the redline something you feel rather than read.
- **Test what the user actually does.** Automated tests are great for logic, but aiming and clicking still need a human check. Label what's "logic proven" and what's "feel unproven".

## What's next

- Test on real Spectacles: comfort, hand-tracking pinches, and frame rate with hundreds of ghosts.
- Detect the room's walls and exits automatically instead of fitting the zone by hand.
- More than one zone, saved between sessions, so a steward can walk a whole venue.
- A scored Test your eye series that tracks how a steward's judgement improves.
