import * as T from 'three';

export const assemblyInfo = [
  ['frame', '01 · Gantry frame', 'Four-post overhead support; overall height 142 inches.'],
  ['conveyor', '02 · Through conveyor', '386-inch overall line, 20-inch pass height. Chain and cross-shaft details are approximate.'],
  ['rotor', '03 · Rotary arm & mast', 'Overhead rotary-arm arrangement reconstructed from the general assembly views.'],
  ['guards', '04 · Guards & gates', 'Perimeter geometry follows the drawings; mesh and hardware are illustrative.'],
  ['cabinet', '05 · Control cabinet', 'Exterior only. Internal electrical equipment is not shown in these references.'],
  ['carriage', '06 · Carriage chassis', 'NTPS 30 support plates and vertical supports, based on photo 2.'],
  ['drive', '07 · Carriage drive', 'Illustrative motor, pulleys and belt; exact dimensions are not supplied.'],
  ['rollers', '08 · Prestretch rollers', 'Two separate rollers and shafts, following the exploded reference.'],
  ['door', '09 · Roller gate', 'Front roller/gate assembly separated from the carriage chassis.'],
  ['cover', '10 · Carriage cover', 'Removable upper cover shown separately in the reference.'],
] as const;
export type AssemblyId = typeof assemblyInfo[number][0];
export type Assembly = { id: AssemblyId; group: T.Group; base: T.Vector3; offset: T.Vector3 };

// Drawing dimensions are inches. Unspecified geometry is illustrative, not fabrication CAD.
export function createWulftec() {
  const root = new T.Group(); root.name = 'WCRT-200_reference_reconstruction_inches';
  const assemblies: Assembly[] = [];
  const steel = new T.MeshStandardMaterial({ color: '#81969c', metalness: .65, roughness: .36 });
  const dark = new T.MeshStandardMaterial({ color: '#263d46', metalness: .45, roughness: .52 });
  const chrome = new T.MeshStandardMaterial({ color: '#d4e0e3', metalness: .85, roughness: .24 });
  const rubber = new T.MeshStandardMaterial({ color: '#30353b', roughness: .85 });
  const accent = new T.MeshStandardMaterial({ color: '#cfaa52', metalness: .45, roughness: .4 });
  const add = (id: AssemblyId, offset: number[], base = [0, 0, 0]) => {
    const group = new T.Group(); group.name = id; group.position.fromArray(base); root.add(group);
    assemblies.push({ id, group, base: group.position.clone(), offset: new T.Vector3(...offset) }); return group;
  };
  function box(g: T.Group, x: number, y: number, z: number, w: number, h: number, d: number, material = steel) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); g.add(mesh); return mesh;
  }
  function cyl(g: T.Group, x: number, y: number, z: number, r: number, h: number, material = chrome, axis = 'y') {
    const mesh = new T.Mesh(new T.CylinderGeometry(r, r, h, 24), material); mesh.position.set(x, y, z);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2; if (axis === 'z') mesh.rotation.x = Math.PI / 2; g.add(mesh); return mesh;
  }
  const frame = add('frame', [0, 42, 0]);
  for (const x of [-86, 52]) for (const z of [-74, 74]) {
    box(frame, x, 70, z, 5, 140, 5); box(frame, x, 1, z, 12, 2, 12);
    for (const dx of [-4, 4]) for (const dz of [-4, 4]) cyl(frame, x + dx, 2.3, z + dz, .65, .6, dark);
  }
  for (const z of [-74, 74]) box(frame, -17, 139, z, 143, 6, 5);
  for (const x of [-86, -40, 6, 52]) box(frame, x, 139, 0, 5, 6, 148);
  for (const x of [-86, 52]) for (const z of [-74, 74]) box(frame, x, 108, z * .79, 4, 4, 32);
  const conveyor = add('conveyor', [0, -10, 0]);
  const boundaries = [-150, -86, -22, 52, 112, 172, 236];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const left = boundaries[i], right = boundaries[i + 1], mid = (left + right) / 2;
    for (const z of [-23, 23]) {
      box(conveyor, mid, 17, z, right - left - 1, 6, 2.5);
      for (const x of [left + 5, right - 5]) { box(conveyor, x, 8, z, 2, 16, 2); box(conveyor, x, .5, z, 7, 1, 7); }
    }
    for (const z of [-15, 0, 15]) {
      box(conveyor, mid, 19.3, z, right - left - 3, 1.4, 1.5, dark);
      for (let x = left + 2; x < right - 2; x += 3) box(conveyor, x, 20.1, z, 1.1, .35, 1.8, chrome);
    }
    for (const x of [left + 3, right - 3]) {
      cyl(conveyor, x, 17.5, 0, 1.5, 48, chrome, 'z');
      for (const z of [-15, 0, 15]) cyl(conveyor, x, 17.5, z, 2.5, 1.8, dark, 'z');
    }
  }
  const rotor = add('rotor', [0, 68, 0]);
  cyl(rotor, -17, 133, 0, 13, 4, dark); cyl(rotor, -17, 136, 0, 5, 4);
  box(rotor, -17, 129, 23, 6, 6, 112); box(rotor, -17, 76, 76, 5, 106, 6);
  for (const x of [-21, -13]) box(rotor, x, 77, 72, 1, 103, 1, chrome);
  box(rotor, -17, 144, -30, 17, 8, 12, dark); cyl(rotor, -17, 149, -30, 4, 6, dark);
  const guards = add('guards', [0, 0, 65]);
  function fence(x: number, z: number, w: number, alongX: boolean) {
    const panel = new T.Group(); panel.position.set(x, 0, z); if (!alongX) panel.rotation.y = Math.PI / 2; guards.add(panel);
    for (const px of [-w / 2, w / 2]) { box(panel, px, 36, 0, 1.4, 72, 1.4, dark); box(panel, px, .5, 0, 5, 1, 5, dark); }
    for (const y of [7, 70]) box(panel, 0, y, 0, w, 1.3, 1.3, dark);
    const points: number[] = [];
    for (let px = -w / 2 + 3; px < w / 2; px += 4) points.push(px, 8, 0, px, 69, 0);
    for (let y = 9; y < 69; y += 4) points.push(-w / 2, y, 0, w / 2, y, 0);
    const mesh = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3)), new T.LineBasicMaterial({ color: '#53636a', transparent: true, opacity: .55 })); panel.add(mesh);
  }
  for (const z of [-82, 82]) { fence(-52, z, 65, true); fence(18, z, 65, true); }
  for (const x of [-92, 58]) for (const z of [-55, 55]) fence(x, z, 53, false);
  const cabinet = add('cabinet', [-40, 0, -65]);
  box(cabinet, -65, 43, -103, 30, 80, 18); box(cabinet, -65, 43, -112.5, 28, 77, 1, chrome);
  box(cabinet, -53, 39, -114, 1, 6, 1, dark);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) cyl(cabinet, -75 + col * 6, 64 - row * 7, -114, 1.2, 1, col === 0 ? accent : dark, 'z');
  const carriageBase = [-17, 43, 68];
  const chassis = add('carriage', [45, 0, 0], carriageBase);
  for (const y of [-16, 16]) box(chassis, 0, y, 0, 26, 1.3, 18);
  for (const x of [-11, 11]) box(chassis, x, 0, 7, 1.5, 32, 2);
  const drive = add('drive', [45, 25, 0], carriageBase);
  cyl(drive, 7, 11, 2, 4.5, 10, dark);
  for (const x of [-7, 6]) { cyl(drive, x, 18, 0, 4.5, 1, dark); cyl(drive, x, 19, 0, 1.3, 1); }
  for (const z of [-4, 4]) box(drive, -.5, 18, z, 13, .6, .5, rubber);
  const rollers = add('rollers', [45, 0, -27], carriageBase);
  for (const x of [-7, 5]) { cyl(rollers, x, 0, -1, 3.4, 28, rubber); cyl(rollers, x, 0, -1, .8, 37); }
  const door = add('door', [45, 0, -52], carriageBase);
  for (const x of [-12, 12]) cyl(door, x, 0, -11, 1.7, 29);
  for (const y of [-16, 16]) box(door, 0, y, -11, 28, 1, 5);
  box(door, 0, 0, -13, 20, 30, .7, steel);
  const cover = add('cover', [45, 48, 0], carriageBase);
  box(cover, 0, 23, 0, 29, 1.4, 21);
  for (const z of [-10, 10]) box(cover, 0, 20, z, 29, 6, 1);
  for (const x of [-14, 14]) box(cover, x, 20, 0, 1, 6, 21);
  root.traverse(object => { if (object instanceof T.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
  return { root, assemblies };
}
