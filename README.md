# FirstDrive.io

**[Open the free simulator](https://shalaka003.github.io/firstdrive-io/)**

**Practice the decisions you make from the driver's seat.** FirstDrive.io is a free, browser-based California driving practice simulator. You steer through short, fictional San Francisco-inspired routes while an instructor gives simple directions such as “turn right at the next intersection.” You decide when to signal, where to look, how to respond to signs and traffic, and when to stop. Short multiple-choice checkpoints explain important decisions without taking away the driving practice.

This is an independent learning tool, **not an official California DMV test**, a copy of a field-office route, or a substitute for lessons and the [California Driver's Handbook](https://www.dmv.ca.gov/portal/handbook/california-driver-handbook/).

## Why I built it

When I took my California driving test, I had already driven and held a license in another state. That experience made the test feel more familiar. If I had been learning for the first time, I would have wanted an easy way to see the road from the driver's seat and practice the decisions before the real test. Many practice materials focus on memorizing answers, while realistic interactive driving practice can be paid or difficult to access. I built FirstDrive.io to make that practice free and easy to start.

## Who it is for

- Someone preparing for their **first California behind-the-wheel test** who wants to rehearse road signs, turns, lane changes, stopping, and traffic checks.
- Someone studying for the **California knowledge test** who wants to see familiar rules and signs in a driving context. This simulator does not cover every knowledge-test topic.
- Friends, family, or instructors who want a simple practice tool to discuss what a new driver noticed and why a decision mattered.

## What you can practice today

| Lesson | Scenarios |
| --- | --- |
| **First Drive** | Residential and school-zone speeds, left turn, stop line, right of way, railroad signs and crossing. |
| **City Skills** | Lane change, right turn by a bike lane, legal U-turn at a signalized intersection. |
| **Freeway** | Merge, traffic gap, overhead exit guidance, exit lane, and advisory ramp speed. This is supplemental practice; the DMV's [driving evaluation criteria](https://www.dmv.ca.gov/portal/handbook/driving-test-criteria/driving-performance-evaluation-dpe-scoring-criteria/) place freeway/highway scoring in supplemental tests. |

The view uses a daytime, left-hand-drive cockpit with keyboard controls, mirrors, blind-spot and cross-traffic checks, moving cars, and an instructor voice. The car keeps moving between questions. Warnings and critical errors appear in a drive log, with a review at the end. Scores stay in your browser; there is no account or server-side progress storage.

The routes are deliberately short and fictional. Visuals and behavior are a practice approximation, so always follow real signs, conditions, your instructor, and current DMV guidance when driving.

## Controls

| Key | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / ←, D / → | Steer |
| Q / E | Left / right signal |
| L | Headlights |
| 1 / 2 / 3 | Rearview / left / right mirror |
| 4 / 5 | Left / right shoulder check |
| 6 / 7 | Look left / right for cross traffic |

The same view controls can be clicked on screen.

## Run locally

Requires Node.js 22 and pnpm. From this directory:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the address printed by Vite. Check the rule tests and production build with:

```bash
pnpm test
pnpm build
```

## Hosting

GitHub Pages builds the site from this repository using the workflow in `.github/workflows/deploy-pages.yml`. The workflow sets `GITHUB_PAGES_BASE=/firstdrive-io/` so Vite's assets and instructor audio work at the repository path. The site is static, uses no paid API, and can run on GitHub Pages' free public-repository plan. The product name **FirstDrive.io** does not imply ownership of the `firstdrive.io` domain.

## Sources and credits

- [California DMV Driver's Handbook](https://www.dmv.ca.gov/portal/handbook/california-driver-handbook/) and [Driving Performance Evaluation criteria](https://www.dmv.ca.gov/portal/handbook/driving-test-criteria/driving-performance-evaluation-dpe-scoring-criteria/) informed the driving scenarios and feedback.
- [California MUTCD](https://dot.ca.gov/programs/safety-programs/camutcd) informed the sign designs. Signs and fictional streets are rendered in code; they are not a current map of a DMV route.
- [Three.js](https://threejs.org/) (MIT license) renders the scene.
- [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0 license) was used to render the Fenrir instructor voice clips. [Voice-Generator.com](https://voice-generator.com/) provided the voice reference.
- This [driving simulator video](https://www.youtube.com/watch?v=RuOO_fIsmuY) inspired the cockpit perspective. No video assets or code were copied.
