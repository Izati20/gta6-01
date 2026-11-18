# Izati20/gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Izati20/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Izati20/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Vice Harbor** — an original open-world crime game that plays offline in a desktop browser from static files. Explore a full city on foot and by car: steal cars, run traffic, fight or flee, draw Harbor Patrol heat (1–5 wanted stars), cool down out of sight, get busted or wasted and pay your way back in. A five-job story chain (First Wheels, Package Run, Hot Metal, Harbor Run, The Last Score) leads Marina Vale from a borrowed coupe to owning the harbor, then free roam. HUD with cash, health, wanted stars, mission timer, speedometer and a live minimap (police, objective marker); progress and best cash save in the browser. All art is drawn in code on canvas and all sound is synthesized with WebAudio — no assets, no network.

Controls: WASD/arrows move and drive · Shift run/handbrake · E/F enter or steal a car · J/Space/click punch · P/Esc pause · M mute.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

To hand the game in the way the scorer does: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` — it copies `game/` and `screenshots/` to `out/` and writes `out/dossier.json`.

Screenshots are staged deterministically: open `game/index.html?shot=start&seed=1`, `?shot=play&seed=1` or `?shot=end&seed=1` at 1280×800.

---

<sub>Entered on [make.fun](https://make.fun/?ref=izaati-izati&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
