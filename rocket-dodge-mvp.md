# Get2Mars — MVP spec

A retro, three-color mobile arcade game. You steer a tiny rocket left and right through deep space, dodging huge asteroids and flocks of chickens. Visuals come first: everything is square, pixel-perfect and limited to exactly three colors.

---

## 1. Pillars

1. **Three colors, no exceptions.** Every pixel on screen is one of three palette colors.
2. **Color carries meaning.** Orange = danger and energy. Cream = the player and harmless things.
3. **Readable at a glance.** Every threat is telegraphed before it can hurt you.
4. **Short, juicy runs.** 30–90 seconds per run, instant retry.

---

## 2. Visual system

### 2.1 Palette ("Deep space")

| Role | Name | Hex | Used for |
|---|---|---|---|
| Background | Navy | `#1B1F3B` | Sky, letterbox bars, crater holes, chicken eye, text on cream |
| Rocket | Cream | `#F2E9DC` | Rocket body, chickens, HUD text, feathers, asteroid rim light |
| Details | Orange | `#FF6B35` | Stars, flame, rocket window, asteroids, warnings, eggs, beak and feet, popups |

Store these in one `PALETTE` constant. Nothing else may define a color. Swapping the palette later (v2) should be a one-line change.

### 2.2 Resolution and scaling

- Logical resolution: **72 × 144** (portrait, 1:2).
- Render the game to an offscreen 72 × 144 canvas, then draw it to the screen canvas at an **integer scale**: `scale = floor(min(viewportW / 72, viewportH / 144))`, minimum 1.
- Fit it inside the safe area (notch and home bar) and the *small* viewport height (`100svh`), so it doesn't jump in size when Safari's toolbars show or hide.
- Center it. Fill leftover space with **navy** (not black), so the palette rule holds.
- `imageSmoothingEnabled = false` on every context. CSS: `image-rendering: pixelated`.
- All positions are snapped to whole pixels at draw time (`Math.round`). Physics may use floats.
- Respect device pixel ratio: size the screen canvas in device pixels, then compute the integer scale from that.

### 2.3 Typography

- Font: **Press Start 2P**, bundled with the app (`@fontsource/press-start-2p`, latin subset; no network needed), drawn at 8 px on the logical canvas.
- Text antialiasing can produce in-between colors. Acceptable for the MVP; replace with a tiny bitmap font (5×7) later to keep the palette strict.
- Text is always uppercase in-game.

### 2.4 Sprites

Legend for every map below: `.` = transparent. Other letters map to palette colors as noted.

**Rocket — 9 × 12** (`R` = cream, `D` = orange)

```
....R....
...RRR...
...RRR...
..RRRRR..
..RDDDR..
..RDDDR..
..RRRRR..
..RRRRR..
.RRRRRRR.
RRRRRRRRR
RR.RRR.RR
R.......R
```

**Flame** (orange, drawn under the rocket, toggles every 4 frames)
- Short: 3 × 2 block at `(x+3, y+12)` plus a 1 × 2 tip at `(x+4, y+14)`.
- Long: 3 × 4 block at `(x+3, y+12)` plus a 1 × 2 tip at `(x+4, y+16)`.

**Chicken — 11 × 9, 2 frames, faces right** (`B` = cream body, `O` = orange beak, comb and feet, `E` = navy eye). Mirror horizontally for left-flying chickens. Swap frames every 8 frames (16 when tumbling after a hit, or speed it up for panic).

Frame A (wings up):
```
....BB.....
...BBB.....
..BBB...OO.
BBBBBBBBBB.
.BBBBBBBEBO
..BBBBBBBB.
...BBBBBB..
....O..O...
...........
```

Frame B (wings down):
```
...........
...........
........OO.
BBBBBBBBBB.
.BBBBBBBEBO
..BBBBBBBB.
...BBBBBB..
...BBBB....
....O..O...
```

**Asteroid — generated, radius 14 (about 29 × 29)**

Generate once per variant at startup into an offscreen canvas (make 4–6 variants from fixed seeds):

1. Canvas size `2r + 3`. Center `c = size / 2`.
2. Make 12 edge jitter values in `[-1.2, 1.2]` (one per 30° slice).
3. Make 4 craters: offset in `±0.55r`, radius `1.5 + rand × 0.22r`.
4. For every pixel: `d` = distance to center, slice = angle bucket. Skip if `d > r + jitter[slice]`.
   - Inside a crater → navy.
   - On the outer 1.2 px edge and in the top-left quadrant → cream (rim light).
   - Otherwise → orange.

Use a small seeded random (e.g. `seed = (seed * 9301 + 49297) % 233280`) so asteroids look the same on every run.

**Warning icon — 3 × 9** (orange)
```
XXX
XXX
XXX
XXX
XXX
.X.
...
XXX
XXX
```

**Chevron — 5 × 3** (orange, no longer used)
```
X...X
.X.X.
..X..
```

**Egg, filled — 4 × 5** (orange) and **egg, empty — 4 × 5** (outline in HUD text color)
```
.XX.      .XX.
XXXX      X..X
XXXX      X..X
XXXX      X..X
.XX.      .XX.
```

**Swap icon — 7 × 6** (orange, shown while controls are reversed)
```
....X..
XXXXXX.
....X..
..X....
.XXXXXX
..X....
```

### 2.5 Background

- About 22 stars: 1 × 1 orange pixels at random positions.
- Two parallax layers: near stars scroll at 60 px/s, far stars at 30 px/s, wrapping vertically.
- A few stars blink (skip drawing on some frames) for life.

---

## 3. Screens and states

```
TITLE ──tap──▶ PLAYING ──fatal hit──▶ DYING (1.2 s) ──▶ GAME_OVER ──tap retry──▶ PLAYING
```

### TITLE
- Slow-scrolling stars.
- "GET2" in cream, "MARS" in orange, near the top.
- Rocket drawn at 2× in the middle, bobbing ±3 px.
- "TAP" blinking at the bottom (on 0.5 s, off 0.5 s).
- Any tap starts a run.

### PLAYING
- See sections 4–6.

### DYING
- Input ignored. Rocket explodes into its own pixels (see 7). Screen shake. Particles finish, then go to GAME_OVER.

### GAME_OVER
- "GAME OVER" in orange, or **"FOWL PLAY"** if the third chicken egg caused the death.
- Final score (cream), "BEST 0000" (orange). Show "NEW BEST" blinking if beaten.
- Cream "RETRY" button with navy text. Tap it to start a new run. Ignore taps for the first 0.5 s to prevent accidental retries.

---

## 4. Player

| Property | Value |
|---|---|
| Size | 9 × 12 |
| Vertical position | Free within the lower half: top edge y ∈ [72, 124], starting at 112 |
| Horizontal range | x ∈ [0, 63] (clamped) |
| Hitbox | 7 × 10, inset 1 px on each side (forgiving) |
| Max speed | 300 px/s following a finger, 140 px/s with arrow keys |

### Controls
- **Drag anywhere** on the screen. The rocket's target is the finger's position (converted to logical pixels), with the rocket centered on the finger (an offset above it, 16 px then 8 px, felt too far) so the thumb doesn't hide it.
- Up and down are limited to the lower half, so asteroids still need a sideways dodge and the warnings stay clear.
- The rocket eases toward the target, closing 35% of the gap per frame, capped at max speed in any direction. It catches a 30 px finger move in about 170 ms (was 400 ms at 0.15 and 140 px/s, which felt laggy).
- When the finger lifts, the rocket stays where it is.
- Also support mouse drag and arrow keys (all four) for desktop testing.

### Dazed (chicken hit)
- The rocket flies at **40%** of its speed and responsiveness for **2.5 s**. A new hit restarts the timer.
- Feedback while dazed:
  - HUD bar inverts (cream bar, navy text) and a feather icon blinks in it.
  - Rocket shakes ±2 px horizontally for the first 0.5 s.
  - The flame sputters and drops out.
  - A small cream feather with an orange tip sways on the rocket's right side.

### Reversed controls (orange egg)
- While reversed, target x = `72 − fingerX`. Arrow keys also swap. Up and down stay normal.
- Duration: **3 s**, restarted by another orange egg.
- Feedback: HUD bar inverts with the swap icon, and 3 orange "dizzy" pixels orbit above the rocket. With both effects on, the HUD icons take turns.

---

## 5. Obstacles

### 5.1 Asteroids (lethal)

| Property | Value |
|---|---|
| Size | Radius 14 (about 29 px wide) |
| Spawn lane | Center x random in [16, 56] |
| Warning time | 1.5 s at start, shrinking to 0.8 s (see 8) |
| Fall speed | 190 px/s, rising to 240 px/s |
| Hitbox | Circle, radius 12 (slightly smaller than drawn) |
| On hit | Fatal → DYING |

**Warning phase** (before the asteroid appears):
- Only the warning icon, at the top of the lane (y = 18), so the screen stays clean. It blinks every 8 frames, then every 4 frames for the last 40% of the warning.
- Two quick blips play when the warning appears.

**Fall phase:**
- The asteroid spawns above the screen (y = −30) and falls straight down the warned lane.
- While it is within 20 px vertically of the rocket, shake the screen by ±1 px.
- Despawn when y > 160.

**Rules:**
- Asteroids only fall vertically. The rocket only moves sideways, so a sideways asteroid would be undodgeable.
- Never spawn two asteroid lanes that together leave no gap wider than 14 px for the rocket.

### 5.2 Chickens (nuisance)

| Property | Value |
|---|---|
| Size | 11 × 9 |
| Direction | Dives at 45° (vy = vx), entering from a side or the top; sprite faces its horizontal direction |
| Speed | 36–60 px/s horizontally (the same again vertically), rising later |
| Path | Each flock picks where its leader crosses the rocket's current row: half aim at the rocket's position at spawn time, the rest anywhere. It enters from the side *away* from that spot, so it is on screen a while first. A flat crossing would be impossible to dodge, since the rocket only moves sideways |
| Formation | Single chicken, or a V of 3 or 5: each row trails 12 px behind along the path and fans 2.5 px to each side. Every flock leaves at least 17 of 64 rocket positions safe |
| Hitbox | 9 × 7, inset 1 px |
| On hit | Not fatal. The rocket is dazed (see 4) + one strike egg (see 6) |

**On hit:**
- Burst of 12 feather particles (mostly cream, every third one orange).
- The chicken tumbles off: velocity becomes (+1.3, −1.6) px/frame away from the rocket, and its wing animation speeds up. It no longer collides.
- The rocket gets 0.5 s of chicken immunity, so one flock can't hit you three times in one frame.

---

## 6. Hearts (chicken lives)

- The HUD shows **3 hearts** (5 × 5, 2 px apart, x 51–69): full orange hearts for lives left, cream outlines for lost ones (navy while the bar is inverted). Hearts make it obvious that chicken hits matter. They replaced 3, then 5, egg slots.
- Each chicken hit costs a heart. **Losing all 3 = fatal**, exactly like an asteroid hit (death cause: chicken → "FOWL PLAY").
- **Recovery:** if 8 s pass without a chicken hit, one heart comes back. This repeats every 8 s until all are full. Any hit resets the 8 s timer.
- When the last heart goes: the hearts blink for 0.5 s, then the rocket explodes.
- CLEAR refills all hearts.

---

## 7. Feedback and juice

| Event | Effect |
|---|---|
| Always | Flame flicker, star parallax |
| Asteroid warning | Blinking "!" at the top of the lane, faster near the drop, plus two blips |
| Asteroid passing nearby | ±1 px screen shake |
| Near miss | "+50" orange popup that rises 15 px over about 0.8 s and blinks out. 10-particle cream and orange spark burst at the rocket's side |
| Chicken hit | Feather burst, chicken tumbles away, rocket shake, HUD inverts, swap icon, dizzy pixels |
| Death | Rocket breaks into its own pixels: each pixel becomes a particle moving outward from the center plus random up-kick, gravity 0.04 px/frame², lifetime 1–1.7 s. Screen shake ±2 px for 0.3 s |

Particles: max about 200 alive. Single pixels in palette colors only.

---

## 8. Difficulty curve

Driven by elapsed run time. Interpolate between rows.

| Time | Asteroid interval | Warning time | Fall speed | Chicken interval | Flock size | Chicken speed | Max asteroids at once |
|---|---|---|---|---|---|---|---|
| 0 s | 5.5 s | 1.5 s | 190 | 3.0 s | 1 | 36 | 1 |
| 30 s | 4.4 s | 1.3 s | 200 | 2.5 s | 1–3 | 42 | 1 |
| 60 s | 3.6 s | 1.1 s | 215 | 2.0 s | 3 | 48 | 1 |
| 90 s | 3.0 s | 0.95 s | 225 | 1.8 s | 3–5 | 54 | 2 |
| 120 s+ | 2.5 s | 0.8 s | 240 | 1.5 s | 5 | 60 | 2 |

The first asteroid comes 2 s into a run and the first chicken at 4 s, so players get a moment to settle in.

---

## 9. Scoring and saving

- **Distance:** +10 points per second survived (show as an integer, 4 digits, padded with zeros, max 9999 shown).
- **Near miss:** +50 when an asteroid overlaps the rocket's rows (y 112–124) and the horizontal gap between the asteroid's edge and the rocket's hitbox is ≤ 6 px, without touching (the drawn rock reaches about 2 px past its hit circle, so that is a visible gap of up to about 4 px). Max once per asteroid.
- **Best score:** saved in `localStorage` under `get2mars.best`. Wrap reads and writes in try/catch, and fall back to 0.

---

## 10. HUD (top 16 px)

```
┌────────────────────────────────────┐
│ 0412          ⇄        ◯ ◯ ◯       │  y 0–14: bar (navy, or cream when reversed)
├────────────────────────────────────┤  y 15: 1 px orange line
```

- Score: left at x = 3, baseline y = 12, cream (navy when reversed).
- Swap icon: x = 40, y = 4, only while reversed, blinking.
- Eggs: x = 51, 58, 65, y = 5. Filled = orange, empty = outline in the bar's text color.
- Play area: y 16–143.

---

## 11. Tech

### Stack
- **Vite + TypeScript**, HTML canvas 2D, no game engine, no runtime dependencies.
- Runs in mobile Safari and Chrome. Add a web app manifest so it can be added to the home screen and run fullscreen.
- Later (v2): wrap with Capacitor for the App Store and Play Store.

### iOS app (Capacitor 8)
- The Vite build (`dist/`) is copied into a native Xcode project in `ios/` and runs in WKWebView. No game code is iOS-specific except `src/haptics.ts`.
- `capacitor.config.ts`: bundle ID `com.get2mars.app` (change it to match the App ID in your Apple Developer account), navy background, no scrolling, the page handles safe areas itself.
- Native setup: iPhone only, portrait only, full screen, status bar hidden, plain navy launch screen, app icon from `npm run icons`.
- Haptics: `@capacitor/haptics` on iOS (light: near miss, medium: chicken, heavy: shield pop, error notification: crash). The web version falls back to the Vibration API.
- Swift Package Manager, no CocoaPods.
- Workflow:
  - `npm run ios`: build the game and copy it into the Xcode project. Run it after every web change.
  - `npm run ios:open`: same, then open Xcode. Pick your phone or a simulator and press Run.
- First run on your own iPhone: in Xcode, select the App target → Signing & Capabilities → choose your team (a free Apple ID works for 7-day installs; TestFlight and the App Store need the $99/year program). On the phone, turn on Developer Mode when asked.

### Game loop
- `requestAnimationFrame`, **fixed timestep** of 1/60 s with an accumulator (update may run 0–N times per frame, then render once).
- Clamp large frame gaps (tab switches) to 0.25 s. Pause automatically on `visibilitychange`.

### Input
- Pointer events (`pointerdown`, `pointermove`, `pointerup`) on the screen canvas, with `touch-action: none`.
- Convert screen coordinates to logical: `(clientX − offsetX) / scale`.
- Prevent scrolling, zooming and the long-press menu (`user-select: none`, `-webkit-touch-callout: none`, viewport meta with `user-scalable=no`).

### Suggested structure
```
rocket-dodge/
├── index.html
├── public/
│   └── manifest.webmanifest
└── src/
    ├── main.ts            boot, resize, loop
    ├── config.ts          PALETTE, sizes, timings, difficulty table
    ├── sprites.ts         pixel maps + drawSprite(), asteroid generator
    ├── input.ts           pointer/keyboard → targetX, reverse handling
    ├── state.ts           TITLE / PLAYING / DYING / GAME_OVER
    ├── entities/
    │   ├── rocket.ts
    │   ├── asteroid.ts    warning + fall phases
    │   └── chicken.ts     single + flock spawning
    ├── systems/
    │   ├── spawner.ts     difficulty-driven spawning
    │   ├── collision.ts   AABB, circle vs AABB, near-miss check
    │   ├── particles.ts
    │   └── shake.ts
    ├── hud.ts
    ├── screens.ts         title + game over drawing
    └── storage.ts         best score
```

### Collision helpers
- AABB vs AABB for rocket vs chicken.
- Circle vs AABB for rocket vs asteroid: clamp the circle center to the box, compare the distance to the radius.
- Near miss: the same check with radius + 6 that does *not* collide with the real radius.

### Tuning
Put every number from sections 4–9 in `config.ts`. Optional: a `?debug` URL flag that draws hitboxes and shows the current difficulty values.

---

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| M1 | Canvas and palette | 72×144 canvas scales crisply on a phone with navy letterbox. Stars scroll. |
| M2 | Rocket and controls | Drag to steer works on touch and mouse. Flame flickers. Rocket clamps to edges. |
| M3 | Asteroids | Warning lanes, falling asteroids, fatal collision, near-miss +50. |
| M4 | Chickens and eggs | Flocks dive across, hits reverse controls, eggs fill and recover, 3 eggs is fatal. |
| M5 | Game flow | Title → play → dying → game over → retry. Best score saved. "FOWL PLAY" on chicken deaths. |
| M6 | Juice and tuning | All effects in section 7, difficulty curve, home-screen manifest and icons (`npm run icons`), safe-area layout, bundled font, playtest on a real phone. |

## 13. MVP acceptance checklist

- [ ] Only the three palette colors appear (except text antialiasing).
- [ ] No blurry pixels at any phone size.
- [ ] Every asteroid shows its warning before it can reach the rocket.
- [ ] An asteroid hit always ends the run. A chicken hit never does unless it takes the last heart.
- [ ] Reversed controls clearly show in the HUD and last 2.5 s from the latest hit.
- [ ] One egg empties after 8 s without a hit.
- [ ] Near-miss bonus triggers at most once per asteroid.
- [ ] Best score survives a reload.
- [ ] Holds 60 fps on a mid-range phone.
- [ ] A new player understands both obstacles within their first run.

---

## 14. v2: sound, haptics and power-ups (built)

### Sound (`src/audio.ts`)
- Everything is synthesized with Web Audio (square/triangle waves and filtered noise). No audio files.
- Effects: start jingle, asteroid warning (two blips when a warning appears), near miss, chicken squawk, shield bounce, three-egg alarm, crash, game over, new best, pickup, shield pop, slow motion on/off.
- Music: a slow, spacey 4-bar loop in A minor at 96 bpm (140 bpm with a bouncing bass felt too arcade), only during a run. Each bar a chord pad (Am9, Fmaj7, Dm9, Esus4) swells in over 0.8 s from two slightly detuned triangles through a low-pass, for a slow shimmer. A soft triangle bass pulses on the half notes. Sparse high square blips go into an echo (0.47 s, darkening repeats). Two blip patterns alternate every loop. It speeds up 10% by 120 s, drops to half speed during TIME, and fades out over 0.8 s when a run ends. Music sits a little under the effects.
- Audio starts on the first tap or key press (browsers require a user gesture).
- Mute: speaker icon top-right on the title and game over screens (tap area x ≥ 52, y < 16), or the M key. Saved as `get2mars.muted`. On iPhone, the ringer switch also silences it.

### Haptics (`src/haptics.ts`)
- Kept soft: on iOS, stars and near misses use the selection tick (the gentlest haptic), chicken hits and eggs a light impact, shield pops a medium impact, and a crash one heavy impact.
- A buzz within 90 ms of the previous one is dropped (except a crash), so bursts don't rattle.
- Web: Vibration API, 5–50 ms (Android only; iOS Safari has none).

### Power-ups
| Property | Value |
|---|---|
| Look | 9 × 9 box with a glyph (shield, clock, egg). Box and glyph swap cream/orange every 16 frames |
| Spawn | First at 12 s, then every 12–20 s. Falls at 40 px/s, x ∈ [4, 59], away from lanes with an asteroid warning |
| Kind | Shield or TIME, 50/50. When a CLEAR would help (lost hearts, dazed, reversed or yolk), 50% chance of a CLEAR instead |
| Collect | Rocket hitbox overlaps the box. Pickup chime and a popup (SHIELD, TIME, CLEAR) |

- **Shield (10 s):** a ring of 10 rotating pixels around the rocket. Chickens bounce off without laying eggs, and bad falling eggs break on it; the shield stays up. An asteroid hit shatters the asteroid instead of the rocket and uses up the shield.
- **TIME (5 s, was "Slow"):** asteroids, warnings, chickens, pickups, spawners and stars run at half speed. The rocket, score and every timer stay at full speed.
- **CLEAR:** refills the hearts and ends dazed, reversed and yolk at once.
- Active effects show as countdown lines on the bottom edge: cream (shield) at y 143, orange (TIME) at y 141. Both blink for their last 2 s.
- Everything ends on death.

---

## 15. v3: variety (built)

New things unlock one at a time during a run, each announced with a popup in the middle of the screen and a two-note chime:

| Time | Unlock | Popup |
|---|---|---|
| 10 s | Star trails | STARS |
| 25 s | Bouncing chickens | BOUNCE |
| 45 s | Diving chickens | DIVE |
| 90 s | Egg-laying chickens | EGGS |

### Star trails
- Every 6–10 s, a line of 6–9 cream "+" stars (3 × 3) falls at 55 px/s, swaying side to side (sine curve, 10–22 px wide, kept on screen). Stars twinkle down to one pixel now and then.
- Each star: +10, a chime that climbs a scale along the trail, and a selection-tick haptic. The whole trail with none missed: +50 popup and a jingle.
- They pull you out of safe spots and make every run's path different.

### Bouncing chickens
- 35% of chicken spawns become a single bouncer: it turns back at a screen edge up to 2 times instead of flying out, so edges aren't safe.

### Diving chickens
- Every 6–10 s: a chicken drops in from the top and hovers at y 19, flapping frantically and jittering (the warning). After 1.1 s it dives in a straight line at where the rocket is at that moment, at 130 px/s, with a falling whistle.

### Egg-laying chickens and falling eggs
- 35% of chickens (divers included) carry an egg. They drop it shortly after appearing over the play area, or at the latest just above the rocket's band. Eggs fall straight down at 70 px/s. About 12 a minute late in a run.
- **Cream egg (45%):** yolk splat. A lumpy cream blob with an orange yolk (radius ~15 px) covers part of the screen (center x 14–58, y 40–92) for 3 s, drips, and dissolves over the last second, edges first.
- **Orange egg (45%):** reversed controls for 3 s.
- **Golden egg (10%, flashes cream/orange):** +200, or a free shield or TIME (50/50), with a jingle.
- The shield breaks cream and orange eggs harmlessly. Golden eggs always pay out.
- Falling eggs are separate from the HUD hearts.

### Later ideas for the unlock schedule
- Comet: a fast diagonal streak with a short warning at the screen edge.
- Satellite debris: small, fast pieces drifting sideways in pairs that push the rocket.
- Black hole: sits at one side for a few seconds and pulls the rocket toward it.

---

## 16. Mars on the horizon (built)

- The game stays endless (it keeps the scoreboard meaningful). Mars shows progress instead of being a finish line.
- Mars rises into the **top-right corner** from behind the HUD and the screen edge: center (66, 8), radius growing from 6 (hidden) to a cap of **26** over **180 s**, then staying. At full size it covers the corner down to about y 34, out of the middle lanes.
- Drawn as a **50% orange/navy checker**, so it reads as far-off scenery. Solid orange stays reserved for things that hurt you. Craters are sparser patches (one pixel in four) and the lit rim on the lower-left edge is a cream checker.
- The checker stays locked to the screen's pixel grid as the planet grows, so it never shimmers.

---

## 17. Out of scope (later ideas)

- Palette changes as you progress (unlock new three-color palettes).
- Dithered asteroid style as a palette or level variant.
- Online leaderboards, achievements (Game Center via Capacitor).
- Play Store build (the Capacitor Android platform). TestFlight and App Store submission for iOS.
- A bitmap font to keep text strictly within the palette.
