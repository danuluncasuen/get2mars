# Get2Mars

@../game-kit/PLAYBOOK.md

## This game

- A retro pixel arcade dodger. Steer a rocket to Mars past asteroids (lethal), chickens (they cost hearts) and timed unlocks: bouncers, divers, egg layers, debris, black holes and comets.
- The palette is navy, cream and orange only. The logical screen is 72×144.
- **The spec is rocket-dodge-mvp.md.** Keep it in sync with every gameplay or visual change.
- **Tunables live in src/config.ts.** `TESTING.unlockScale` must be 1 for release (it is now).
- Balance bar: a good player should reach 3:00. Dan reaching it means the balance is right.
- Bundle ID `com.get2mars.app`. Dev server: `npm run dev` on port 5180 (see .claude/launch.json).
- Tried and removed, so don't re-add without asking:
  - hit-stop (it felt like a freeze)
  - reversed-controls egg (it felt like a bug)
  - orange eggs, debris and comets (Dan prefers cream)
  - cream background stars (they read as collectibles)
- Next up: playtesting at real speed, then TestFlight plus Game Center leaderboards.
