const INTRO_SECONDS = 5;

export function advanceIntro(elapsed, speed, dt) {
  const next = elapsed + (speed > 1.2 ? dt : 0);
  return { elapsed: next, ready: next >= INTRO_SECONDS };
}
