// Two compact, fictional California practice corridors. Their origins keep the
// scenes apart so only the active lesson is inside the camera's view distance.
export const CITY_X = 900;
export const FREEWAY_X = 1800;

export function buildLessonWorlds({ THREE, scene, box, cylinder, plane, mat, canvasTexture, makeTrafficCar }) {
  const asphalt = mat(0x555e60), pavement = mat(0xd3d7d0), grass = mat(0xa6bc91);
  const white = mat(0xf8f6e9), yellow = mat(0xf2bf58), curb = mat(0xe4ded0);
  const steel = mat(0x7e999a), windowMat = mat(0x4d7c8b, .2);

  function sign(group, x, z, lines, color = '#f9faf6', ink = '#202b2d', rotation = 0, width = 2.7) {
    cylinder(.07, .09, 4, steel, x, 2, z, group);
    const texture = canvasTexture(640, 640, (c, w, h) => {
      c.fillStyle = color; c.fillRect(0, 0, w, h);
      c.strokeStyle = ink; c.lineWidth = 20; c.strokeRect(18, 18, w - 36, h - 36);
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (lines[0] === 'SPEED' && lines[1] === 'LIMIT') {
        c.font = '900 92px Arial';
        c.fillText('SPEED', w / 2, 105);
        c.fillText('LIMIT', w / 2, 205);
        c.font = '900 310px Arial';
        c.fillText(lines[2], w / 2, 440);
      } else {
        const size = lines.length > 2 ? 87 : 112;
        c.font = `900 ${size}px Arial`;
        lines.forEach((line, i) => c.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (size + 24), w - 60));
      }
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, width), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    // Keep the readable face slightly ahead of its pole for side-facing signs.
    panel.position.set(x + (rotation === -Math.PI / 2 ? -.13 : rotation === Math.PI / 2 ? .13 : 0), 4.2, z + (rotation === 0 ? .13 : 0));
    panel.rotation.y = rotation; group.add(panel);
  }
  function guideSign(group, x, z, lines, width = 6.7, height = 2.7, y = 5.2, color = '#23734d', ink = '#fffdf0') {
    const texture = canvasTexture(1024, 420, (c, w, h) => {
      c.fillStyle = color; c.fillRect(0, 0, w, h);
      c.strokeStyle = ink; c.lineWidth = 12; c.strokeRect(18, 18, w - 36, h - 36);
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      const size = lines.length > 2 ? 99 : 130;
      c.font = `800 ${size}px Arial`;
      lines.forEach((line, i) => c.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (size + 16), w - 70));
    });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    panel.position.set(x, y, z); group.add(panel);
  }
  function roadRibbon(group, stations, width, material, y) {
    const positions = [], indices = [];
    stations.forEach(([z, x]) => positions.push(x - width / 2, y, z, x + width / 2, y, z));
    for (let i = 0; i < stations.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry, material));
  }
  function tree(group, x, z, height = 5) {
    cylinder(.23, .31, height * .58, mat(0x795e42), x, height * .29, z, group);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(height * .37, 1), mat(0x5d9568));
    crown.position.set(x, height * .76, z); group.add(crown);
  }
  function building(group, x, z, width, depth, height, color) {
    box(width + 1, .18, depth + 1, pavement, x, .03, z, group);
    box(width, height, depth, mat(color), x, height / 2 + .1, z, group);
    box(width + .4, .35, depth + .4, mat(0x546b6b), x, height + .28, z, group);
    for (let level = 1; level < height / 3; level++) {
      for (const dx of [-width / 4, width / 4]) box(1.65, 1.65, .12, windowMat, x + dx, level * 3, z - depth / 2 - .07, group);
    }
  }
  function car(color, x, z, heading = -Math.PI / 2, speed = 0) {
    const model = makeTrafficCar(color);
    model.position.set(x, 0, z); model.rotation.y = heading;
    return { car: model, x, z, speed, heading, initialZ: z, initialX: x };
  }
  function trafficSignal(group, x, poleZ, headZ, face = -1) {
    const housing = mat(0x263238), dim = mat(0x455151);
    const green = new THREE.MeshBasicMaterial({ color: 0x42ec73 });
    cylinder(.1, .13, 5.7, steel, x, 2.85, poleZ, group);
    box(.17, .17, Math.abs(poleZ - headZ), steel, x, 5.65, (poleZ + headZ) / 2, group);
    box(.8, 2.05, .7, housing, x, 5.13, headZ, group);
    for (const [y, material] of [[5.72, dim], [5.13, dim], [4.54, green]]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(.27, 14, 10), material);
      lamp.position.set(x + face * .43, y, headZ); group.add(lamp);
    }
  }

  const city = new THREE.Group(); city.position.x = CITY_X; scene.add(city);
  plane(500, 500, grass, 40, -.18, 25, city);
  plane(21, 310, asphalt, 0, .01, 110, city);
  plane(260, 21, asphalt, 80, .014, 0, city);
  plane(21, 130, asphalt, 118, .018, 0, city);
  // First signalized junction: the restriction makes the driver continue to
  // the second, clearly separated intersection for the requested U-turn.
  plane(21, 94, asphalt, 62, .019, 0, city);
  for (const x of [48, 76]) {
    for (const z of [-29, 29]) {
      box(6.5, .15, 36, pavement, x, .025, z, city);
      box(.26, .3, 36, curb, x + (x < 62 ? 3.3 : -3.3), .13, z, city);
    }
  }
  for (const x of [61.83, 62.17]) for (const z of [-29, 29]) plane(.12, 36, yellow, x, .066, z, city);
  for (const x of [53.5, 55.3, 68.7, 70.5]) plane(.85, 18, white, x, .07, 0, city);
  for (const x of [-14, 14]) {
    box(6.5, .15, 305, pavement, x, .02, 110, city);
    box(.26, .3, 305, curb, x > 0 ? 10.7 : -10.7, .12, 110, city);
  }
  for (const z of [-14, 14]) {
    box(250, .15, 6.5, pavement, 80, .02, z, city);
    box(250, .3, .26, curb, 80, .12, z > 0 ? 10.7 : -10.7, city);
  }
  for (let z = 20; z < 255; z += 16) plane(.16, 7.8, white, 4.55, .055, z, city);
  for (const dx of [-.17, .17]) plane(.12, 225, yellow, dx, .054, 140, city);
  for (const dz of [-.19, .19]) {
    plane(92, .12, yellow, 58, .059, dz, city);
    plane(52, .12, yellow, 150, .059, dz, city);
  }
  for (const side of [-1, 1]) plane(.15, 300, white, side * 9.65, .055, 110, city);
  for (let x = 20; x < 210; x += 17) {
    if (x > 104 && x < 130) continue;
    plane(7.5, .13, white, x, .057, 9.55, city);
  }
  for (let x = -8; x <= 8; x += 2.6) {
    plane(1.25, 5, white, x, .07, 5.5, city);
    plane(1.25, 5, white, x, .07, -5.5, city);
  }
  for (let z = -8; z <= 8; z += 2.6) {
    plane(5, 1.25, white, 5.5, .072, z, city);
    plane(5, 1.25, white, 112.5, .072, z, city);
  }
  // Bike lane on the right turn approach and a person waiting beyond the curb.
  plane(.14, 90, white, 8.5, .059, 65, city);
  for (let z = 32; z < 85; z += 20) plane(1.15, 3.2, mat(0x6baf92), 9.1, .06, z, city);
  for (let i = 0; i < 10; i++) {
    const z = 28 + i * 23;
    if (i < 7) {
      building(city, -29, z, 15, 16, 8 + (i % 3) * 2, [0xd8c2aa, 0xb2cbd0, 0xe3d5bd][i % 3]);
      building(city, 30, z, 15, 16, 8 + ((i + 1) % 3) * 2, [0xe1b7a5, 0xcbd7bf, 0xc1c9d9][i % 3]);
    }
    tree(city, -18, z + 9); tree(city, 19, z - 6, 4.5);
  }
  for (let x = 30; x < 205; x += 27) {
    if ((x > 49 && x < 76) || (x > 100 && x < 140)) continue;
    building(city, x, -31, 16, 17, 8 + (x % 3), 0xdac5b4);
    building(city, x, 31, 16, 17, 9 + (x % 4), 0xb9cecc);
    tree(city, x - 10, -18); tree(city, x + 9, 18);
  }
  sign(city, 12, 160, ['SPEED', 'LIMIT', '25']);
  sign(city, 48, 12.8, ['NO', 'U-TURN'], '#fffefa', '#a62028', -Math.PI / 2, 2.45);
  sign(city, 104, 12.8, ['U-TURN', 'PERMITTED'], '#fffefa', '#243c3c', -Math.PI / 2, 2.45);
  sign(city, 105, -13, ['OCTAVIA', 'ST'], '#176246', '#f5fff5', -Math.PI / 2);
  trafficSignal(city, 71, 13, 3.7);
  trafficSignal(city, 53, -13, -3.7, 1);
  trafficSignal(city, 127, 13, 3.7);
  trafficSignal(city, 109, -13, -3.7, 1);
  const green = new THREE.MeshBasicMaterial({ color: 0x37e980 });
  cylinder(.12, .13, 5.9, steel, 11, 2.95, 13, city);
  box(2.6, .22, .22, steel, 9.8, 5.8, 13, city);
  box(.7, 1.9, .65, mat(0x263238), 8.55, 5.1, 13, city);
  for (const [y, material] of [[5.7,mat(0x374342)],[5.08,mat(0x374342)],[4.47,green]]) cylinder(.23,.23,.09,material,8.55,y,12.61,city);
  // A cyclist at the curb is visible during the right turn; the driver must
  // check the bike lane and shoulder, even while the signal is green.
  for (const bx of [12.8, 14.1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.45, .08, 5, 12), mat(0x213038));
    wheel.position.set(bx, .55, 10.3); wheel.rotation.y = Math.PI / 2; city.add(wheel);
  }
  box(1.4,.12,.12,mat(0x354c55),13.5,.7,10.3,city);
  cylinder(.22,.22,.65,mat(0xdb904d),13.5,1.45,10.3,city);
  cylinder(.17,.19,.35,mat(0x5e4739),13.5,2.0,10.3,city);

  const cityTraffic = [
    car(0xb7c4ce, CITY_X - 3.5, 146, Math.PI / 2, 5.2),
    car(0xc77654, CITY_X - 3.5, 54, Math.PI / 2, 5.6),
    car(0x537b7c, CITY_X + 162, -3.6, 0, 5.5)
  ];

  const freeway = new THREE.Group(); freeway.position.x = FREEWAY_X; scene.add(freeway);
  plane(380, 800, mat(0xb3c5a1), 14, -.18, 0, freeway);
  plane(16, 680, asphalt, 5.5, .01, 0, freeway);
  plane(7, 170, asphalt, 15.3, .014, 175, freeway);
  const exitPath = [[50,16.4],[-75,16.4],[-125,16.8],[-190,18.1],[-260,19.8],[-345,20.4]];
  roadRibbon(freeway, exitPath, 7, asphalt, .02);
  roadRibbon(freeway, exitPath.map(([z,x])=>[z,x+3.34]), .15, white, .065);
  plane(.24, 680, yellow, -2.2, .06, 0, freeway);
  plane(.2, 240, white, 13.2, .06, 205, freeway);
  plane(.2, 30, white, 13.2, .06, 50, freeway);
  plane(.2, 255, white, 13.2, .06, -217.5, freeway);
  for (let z = 85; z > 65; z -= 10) plane(.2, 5, white, 13.2, .067, z, freeway);
  for (let z = 30; z > -75; z -= 12) plane(.2, 6, white, 13.2, .067, z, freeway);
  for (let z = -325; z < 325; z += 17) plane(.18, 7.7, white, 5.5, .06, z, freeway);
  for (let z = 100; z < 250; z += 15) plane(.18, 7.5, white, 18.1, .06, z, freeway);
  // A painted exit lane leads into a long, gently diverging deceleration ramp.
  // Entrance and exit gore areas use diagonal white hatch marks.
  for (let z = 84; z <= 114; z += 5) {
    const hatch = plane(6, .18, white, 14.5, .07, z, freeway); hatch.rotation.z = -.36;
  }
  for (let z = -105; z >= -220; z -= 8) {
    const rampLeft = z > -125 ? 13.3 + (-z - 75) * .008 : z > -190 ? 13.7 + (-z - 125) * .02 : 15 + (-z - 190) * .024;
    const width = Math.max(.7, rampLeft - 13.45);
    const hatch = plane(width, .17, white, 13.45 + width / 2, .07, z, freeway); hatch.rotation.z = .36;
  }
  for (let z = -315; z < 320; z += 11) {
    box(.18, .85, 10, steel, -4.9, .43, z, freeway);
    if (z > 250 || (z < 75 && z > -75)) box(.18,.85,10,steel,21.4,.43,z,freeway);
    if (z % 3 === 0) tree(freeway, 30, z, 4.8);
  }
  for (let z = -90; z > -345; z -= 11) {
    const center = z > -125 ? 16.4 + (-z - 75) * .008 : z > -190 ? 16.8 + (-z - 125) * .02 : z > -260 ? 18.1 + (-z - 190) * .024 : 19.8 + (-z - 260) * .007;
    box(.18,.85,10,steel,center+5.4,.43,z,freeway);
  }
  sign(freeway, 22, 208, ['SPEED', 'LIMIT', '35']);
  sign(freeway, 23, 175, ['MERGE', 'LEFT'], '#ffe49c', '#282d27', 0, 2.9);
  sign(freeway, 23, 82, ['SPEED', 'LIMIT', '65']);
  guideSign(freeway, 17.7, 45, ['DOWNTOWN', 'EXIT RIGHT ↗'], 7.2, 2.8, 5.25);
  cylinder(.13, .15, 5.5, steel, 23, 2.75, 45, freeway);
  box(5.4, .2, .2, steel, 20.3, 5.4, 45, freeway);
  guideSign(freeway, 22, -110, ['EXIT', '35 MPH'], 4.5, 2.8, 4.55, '#f5cf56', '#1f292d');
  cylinder(.11, .13, 3.25, steel, 22, 1.625, -110, freeway);
  guideSign(freeway, 14.3, -220, ['EXIT ↗'], 1.5, .8, 1.8);
  cylinder(.07, .09, 1.7, steel, 14.3, .85, -220, freeway);
  sign(freeway, 26, -220, ['CURVE', 'AHEAD'], '#f5cf56', '#1f292d', 0, 2.7);
  // Readable overhead guide panels replace the former blank gantry.
  box(.25, 6.3, .25, steel, -3, 3.15, -20, freeway);
  box(.25, 6.3, .25, steel, 23, 3.15, -20, freeway);
  box(26, .28, .28, steel, 10, 6.3, -20, freeway);
  guideSign(freeway, 4.9, -20, ['THROUGH LANES', '↑   ↑'], 10.4, 2.15, 6.25);
  guideSign(freeway, 17.1, -20, ['DOWNTOWN', 'EXIT ↗'], 7.1, 2.15, 6.25);
  guideSign(freeway, 17.1, -20, ['EXIT ONLY'], 4.2, .72, 4.7, '#f5cf56', '#1f292d');
  for (let z = -260; z < 260; z += 16) box(.25, 4, 16, mat(0xb9b7aa), -11, 2.0, z, freeway);
  const freewayTraffic = [
    car(0x475e83, FREEWAY_X + 2, 105, -Math.PI / 2, 27),
    car(0xc9beb3, FREEWAY_X + 8.3, -30, -Math.PI / 2, 26),
    car(0x973f37, FREEWAY_X + 2, -145, -Math.PI / 2, 28)
  ];
  return { cityTraffic, freewayTraffic };
}
