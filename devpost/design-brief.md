---
status: approved
---

# Design brief: Redline

Redline trains student organizers and volunteer stewards to judge crowd density in their own venue, before the doors open. Crowd crushes happen when too many people pack into too little space. Above about 5 standing people per square metre the risk climbs sharply, but that's hard to judge at eye level.

## The one spatial moment
A steward stands in their empty hall an hour before the doors open, drags one slider on a small clipboard panel up to 5 people per square metre, and a ghost crowd fills the floor around them at real size. They walk into the middle of it and look down at one highlighted square metre to see how many pairs of feet are packed into it; when the slider reaches 5, the floor under the crowd turns red and a low tone plays, so they feel the redline in their own venue instead of reading a number.

## Why it belongs on glasses
- Uses: draws in the world; leaves your body free.
- Why it's better than the phone or laptop version: the crowd is drawn on their real floor at real scale, and they can walk through it hands-free. On a phone it would just be a small picture.

## Product or overlay
- Type: product: the ghost crowd is the experience (a trainer), set on a real floor.
- What the real version would sense: only the venue's floor, to put the zone on. The steward fits the zone to the space by hand, so nothing needs to be recognized.
- Stand-in for the preview: the floor of the preview's simulated room stands in for the hall. The zone sits on it, starting about 1 m in front of where the user stands when the Lens starts. If the Lens can't find that floor, use a virtual floor at real size (default).

## Where things live
- Where the user is looking during the main task: mostly down at the floor 1 to 3 m ahead, at the crowd and the square, with a glance down at the clipboard to move the slider. Everything sits in front and a little below eye level, never behind.
- Clipboard panel: about 30 x 20 cm, held like a real clipboard, about 55 cm in front and a little below eye level (about 15 cm below (default)), tilted up toward the face. It follows loosely: when the user walks into the middle it trails behind and settles back in front once they stop. It follows walking and turning but keeps its height and doesn't tilt down when the head looks down (default). It never sticks to the face. On it: the density slider with its current value shown, e.g. "5 per m²" (default), one button that reads **Done** during setup and **Edit zone** after, and, during setup, a short hint: "Fit the zone, then pinch Done".
- Zone: one rectangle on the floor, 4 m wide x 3 m deep by default, its near edge about 1 m in front of where the user stands when the Lens starts. A light outline marks it (default). The ghost crowd fills it and never spills outside it. Once there's a crowd, its floor carries a bright, see-through colour tint (see When things show).
- Corner handles: one on the floor at each corner of the zone, about 15 cm across (default). Dragging a corner resizes the zone to fit the space; the zone stays a rectangle and the opposite corner stays put (default). Zone size limits: 2 x 2 m to 8 x 6 m (default).
- Floor labels: lie flat on the floor along the zone's near edge: area, people at 2 per m², people at 5 per m² (a 4 x 3 m zone reads "12 m², 24 people at 2 per m², 60 at 5 per m²"). Letters about 6 cm tall (default). The short form sits in the same spot: one small number, how many people are in the zone at the current setting, e.g. "60 people" (default wording).
- Ghost crowd: at slider value N, N x area ghosts, rounded to a whole number (default). Simple standing human figures about 155 to 185 cm tall (default), in dim, solid, unlit colours with no transparency: the additive display already makes dim colours look see-through, and hundreds of overlapping transparent figures would be slow. Dim but still clearly visible, about 30 to 40% brightness (default). They mostly face the zone's far edge as if toward a stage (default). Each ghost stands on a pair of flat footprint marks. Spread them on an evenly jittered grid lined up with the highlighted square, so every full square metre holds exactly N (default).
- Clear circle: wherever the user walks, ghost bodies keep a clear circle of 0.6 m around them. It applies only to bodies, not footprints. A ghost whose spot falls inside the circle fades out while the user is close and fades back in when they step away. It isn't pushed somewhere else, so the crowd keeps its true density, and its footprints stay where they are.
- Highlighted square metre: a glowing 1 x 1 m outline fixed to the floor at the centre of the zone, about 2.5 m ahead from the starting spot; once the user walks into the middle they're standing right beside it. The footprint pairs inside show the exact count and glow brighter than the rest (default). The number is written flat on the floor next to it, about 20 cm tall (default). If the zone is resized, the square moves to the new centre (default).
- Arrow: a small, bright arrow, about 25 cm long (default), flat on the floor about 1 m ahead of the user, pointing back to the zone. It sits 1 m ahead rather than right at the feet so it falls inside the glasses' narrow view when the user looks down.

## Hands and input
- Change the density: pinch and drag the slider on the clipboard, 0 to 7 people per m² in whole steps.
- Fit the zone: pinch and drag a corner handle along the floor.
- Finish or reopen setup: pinch Done on the clipboard to hide the handles; the button changes to Edit zone, which brings them back.
- Targets are big and highlight when aimed at.
- Voice (if any) and the button that does the same job: no voice.

## When things show
- Zone outline, corner handles and labels: show when the Lens starts, so the zone can be fitted to the space. The slider starts at 0, so the zone is empty and setup stays clean.
- Corner handles: hide when Done is pinched; come back with Edit zone.
- Slider: greyed out until Done is pinched, with a short hint on the clipboard: "Fit the zone, then pinch Done". Pinching Edit zone greys it out and brings the hint back until Done (default).
- Ghost crowd: appears only once Done is pinched and the slider is moved above 0. The highlighted square and its number appear with the crowd (default). While the zone is being edited again, the crowd hides and comes back at the current setting on Done (default).
- Full floor labels (area, people at 2 per m², people at 5 per m²): show for 3 seconds after any change, whether a corner is dragged or the slider moved, and for 3 seconds when the Lens starts (default). Then they shrink to one small number on the floor: how many people are in the zone at the current setting.
- Floor tint: once there's a crowd, the floor always shows the level in bright colours: green at 1 to 2, amber at 3 to 4, red at 5 to 7.
- Low tone: plays once each time the slider crosses up past 5 (reaching 5 from below). It doesn't repeat while the slider stays at 5 or above, and only plays again after dropping below 5 and crossing again. Dropping below 5 just changes the colour, with no sound. Short and low, about 1 second (default).
- Ghost bodies near the user: fade out inside the 0.6 m clear circle and fade back in when the user steps away, over about 0.3 seconds (default). The fade dims the colour toward black, which the display shows as see-through, so no transparency is needed (default).
- If something needs attention out of view: when the zone is out of view because the user has turned away, the arrow appears on the floor about 1 m ahead pointing back to it, and disappears when they turn back. It only shows while the user is outside the zone and no part of the zone is in view (default).

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Dragging a corner handle resizes the zone and updates the labels: a 4 x 3 m zone shows 12 m², 24 people at 2 per m² and 60 at 5 per m². Pinching Done hides the handles.
2. After Done, setting the slider to N fills the zone with N x area ghosts (5 gives 60), and the highlighted square at the zone's centre shows exactly N pairs of footprints.
3. The floor is green at 1 to 2, amber at 3 to 4 and red at 5 to 7. The tone plays once when I cross up past 5 (reaching 5 from below) and not again while I stay at 5 or above.
4. When I walk into the middle of the crowd, no visible ghost body is within 0.6 m of me, and the square beside me still shows exactly N pairs of footprints.
5. When I turn until the zone is out of view, an arrow appears on the floor about 1 m ahead pointing back to it, and it disappears when I turn back.

## Out of scope
- Seeing, counting or recognizing real people. The crowd is always virtual.
- Recognizing the venue's walls, pillars or exits. The steward fits the zone by hand.
- More than one zone.
- Saving a zone between sessions.
- Densities above 7 per m².

## Risks and open questions
- Feel unproven: how a 5 per m² crowd feels through the real glasses' narrow view, where only part of the crowd is visible at once, and how comfortable it is to look down at the floor for a while.
- Many ghosts: a large zone at 7 per m² means hundreds of figures (8 x 6 m gives 336). Fine on a laptop, but speed on real glasses is unproven. The size limit is a default.
- Flat floor text is read at an angle. Check in the preview that the labels and the square's number read easily from where the user stands.
- The arrow is only seen when the user looks down at the floor. On real glasses, someone who turns away while looking straight ahead may miss it.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
