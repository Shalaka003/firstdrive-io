const FOLLOW_GAP = 8;

// A same-lane car approaching from behind must stay behind the player's car.
export function nextTrafficZ(vehicle, dt, player) {
  const candidate = vehicle.z + vehicle.speed * dt;
  const behindPlayer = vehicle.speed < 0 && vehicle.z > player.z;
  const sameLane = Math.abs(vehicle.x - player.x) < 2.6;
  return behindPlayer && sameLane ? Math.max(candidate, player.z + FOLLOW_GAP) : candidate;
}

export function overlapsPlayer(vehicle, player) {
  return Math.abs(vehicle.x - player.x) < 2.6 && Math.abs(vehicle.z - player.z) < 4.2;
}
