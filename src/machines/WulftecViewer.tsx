import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { assemblyInfo, createWulftec } from './wulftecModel';
import './wulftec-viewer.css';

type Settings = { explosion: number; rotate: boolean; scope: string; selected: string; guards: boolean };
type Actions = { fit: (direction?: string) => void; download: () => Promise<void> };
export default function WulftecViewer() {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const [settings, setSettings] = useState<Settings>({ explosion: 0, rotate: false, scope: 'machine', selected: '', guards: true });
  const live = useRef(settings); live.current = settings;
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const selected = assemblyInfo.find(([id]) => id === settings.selected);
  useEffect(() => {
    const container = host.current!;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
    catch { setError('The 3D viewer needs WebGL. Try opening this page in Chrome or Edge with graphics acceleration enabled.'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor('#e4ecee'); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', 'WCRT-200 3D model. Drag to rotate; pinch or scroll to zoom.');
    renderer.domElement.tabIndex = 0; container.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, 1, .1, 4000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 25; controls.maxDistance = 1800; controls.autoRotateSpeed = 1;
    scene.add(new T.HemisphereLight('#ffffff', '#798c94', 2.5));
    const light = new T.DirectionalLight('#ffffff', 3.2); light.position.set(-180, 420, -210);
    light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, far: 1100 }); light.shadow.bias = -.0005; scene.add(light);
    const fill = new T.DirectionalLight('#d3eaff', 1.8); fill.position.set(200, 180, 180); scene.add(fill);
    const model = createWulftec(); scene.add(model.root);
    const floor = new T.Mesh(new T.PlaneGeometry(2400, 2400), new T.ShadowMaterial({ opacity: .16 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -12; floor.receiveShadow = true; scene.add(floor);
    function apply() {
      const state = live.current;
      for (const part of model.assemblies) {
        const isCarriage = ['carriage', 'drive', 'rollers', 'door', 'cover'].includes(part.id);
        part.group.visible = (state.scope === 'machine' || isCarriage) && (state.guards || part.id !== 'guards');
        part.group.position.copy(part.base).addScaledVector(part.offset, state.explosion / 100);
        part.group.traverse(object => {
          if (object instanceof T.Mesh) {
            // Each mesh gets its own highlight material on first use.
            if (!object.userData.ownMaterial) { object.material = (object.material as T.MeshStandardMaterial).clone(); object.userData.ownMaterial = true; }
            (object.material as T.MeshStandardMaterial).emissive.set(part.id === state.selected ? '#235d67' : '#000000');
          }
        });
      }
      controls.autoRotate = state.rotate;
    }
    function fit(direction = 'iso') {
      apply(); const bounds = new T.Box3();
      for (const part of model.assemblies) if (part.group.visible) bounds.union(new T.Box3().setFromObject(part.group));
      const center = bounds.getCenter(new T.Vector3());
      const vector = (direction === 'top' ? new T.Vector3(0, 1, .001) : direction === 'front' ? new T.Vector3(0, .12, -1) : new T.Vector3(1.1, .85, -1.25)).normalize();
      const right = new T.Vector3().crossVectors(camera.up, vector).normalize();
      const up = new T.Vector3().crossVectors(vector, right).normalize();
      const tangent = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      let distance = 25;
      for (const part of model.assemblies.filter(p => p.group.visible)) {
      const extent = new T.Box3().setFromObject(part.group);
      for (const x of [extent.min.x, extent.max.x]) for (const y of [extent.min.y, extent.max.y]) for (const z of [extent.min.z, extent.max.z]) {
        const point = new T.Vector3(x, y, z).sub(center);
        distance = Math.max(distance, Math.max(Math.abs(point.dot(right)) / (tangent * camera.aspect), Math.abs(point.dot(up)) / tangent) + point.dot(vector));
      }
      }
      distance *= 1.12;
      controls.target.copy(center); camera.position.copy(center).add(vector.normalize().multiplyScalar(distance)); controls.update();
    }
    async function download() {
      apply();
      const glb = await new GLTFExporter().parseAsync(model.root, { binary: true, onlyVisible: true });
      const blob = new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      a.download = `wcrt-200-${live.current.scope}-${live.current.explosion ? 'exploded' : 'assembled'}.glb`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    actions.current = { fit, download };
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); fit();
    }); resize.observe(container);
    const raycaster = new T.Raycaster(); const start = new T.Vector2();
    const down = (event: PointerEvent) => start.set(event.clientX, event.clientY);
    const pick = (event: PointerEvent) => {
      if (start.distanceTo(new T.Vector2(event.clientX, event.clientY)) > 5) return;
      const r = renderer.domElement.getBoundingClientRect(); raycaster.setFromCamera(new T.Vector2((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1), camera);
      const hits = raycaster.intersectObjects(model.assemblies.filter(p => p.group.visible).map(p => p.group), true);
      if (hits[0]) { let obj = hits[0].object; while (obj.parent && obj.parent !== model.root) obj = obj.parent; setSettings(s => ({ ...s, selected: obj.name })); }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '0'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === '0') { fit(); return; }
      const spherical = new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      if (event.key === 'ArrowLeft') spherical.theta -= .15; if (event.key === 'ArrowRight') spherical.theta += .15;
      if (event.key === 'ArrowUp') spherical.phi -= .12; if (event.key === 'ArrowDown') spherical.phi += .12;
      if (event.key === '+') spherical.radius *= .9; if (event.key === '-') spherical.radius *= 1.1;
      spherical.makeSafe(); camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical)); controls.update();
    };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', pick); renderer.domElement.addEventListener('keydown', keyboard);
    let frame = 0, last = 0;
    const render = (time: number) => { apply(); controls.update(Math.min((time - last) / 1000, .1)); last = time; renderer.render(scene, camera); container.dataset.ready = 'true'; frame = requestAnimationFrame(render); };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); actions.current = null;
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', pick); renderer.domElement.removeEventListener('keydown', keyboard);
      const materials = new Set<T.Material>(); scene.traverse(object => { if (object instanceof T.Mesh || object instanceof T.LineSegments) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); } }); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => { actions.current?.fit(); }, [settings.scope]);
  return <main className="wulftec-viewer">
    <section className="wulftec-main" aria-label="Interactive machine model">
      <div className="wulftec-toolbar">
        <label>View<select aria-label="View" value={settings.scope} onChange={e => setSettings(s => ({ ...s, scope: e.target.value, selected: '' }))}><option value="machine">Complete machine</option><option value="carriage">NTPS 30 carriage</option></select></label>
        <button aria-pressed={settings.rotate} onClick={() => setSettings(s => ({ ...s, rotate: !s.rotate }))}>{settings.rotate ? 'Pause rotation' : 'Auto-rotate'}</button>
        <button onClick={() => actions.current?.fit()}>Fit</button>
        <button onClick={() => actions.current?.fit('front')}>Front</button><button onClick={() => actions.current?.fit('top')}>Top</button>
      </div>
      <div className="wulftec-canvas" ref={host} data-explosion={settings.explosion} data-scope={settings.scope}>{error && <p role="alert">{error}</p>}</div>
      <p className="wulftec-hint">Drag to rotate 360° · Scroll / pinch to zoom · Right-drag / two fingers to pan · Click a part to identify it</p>
      <div className="wulftec-explode"><label htmlFor="explosion">Exploded view <strong>{settings.explosion}%</strong></label><input id="explosion" type="range" min="0" max="100" value={settings.explosion} onChange={e => setSettings(s => ({ ...s, explosion: Number(e.target.value) }))}/><div><button onClick={() => { live.current = { ...live.current, explosion: 0 }; setSettings(s => ({ ...s, explosion: 0 })); actions.current?.fit(); }}>Assemble</button><button onClick={() => { live.current = { ...live.current, explosion: 100 }; setSettings(s => ({ ...s, explosion: 100 })); actions.current?.fit(); }}>Explode</button></div></div>
    </section>
    <aside className="wulftec-details"><span className="page-eyebrow">REFERENCE RECONSTRUCTION</span><h2>Wulftec WCRT-200</h2><p>Based on your general arrangement and NTPS 30 carriage drawings.</p><dl><div><dt>Overall conveyor</dt><dd>386 in</dd></div><div><dt>Machine height</dt><dd>142 in</dd></div><div><dt>Conveyor height</dt><dd>20 in</dd></div></dl>
      <label className="wulftec-check"><input type="checkbox" checked={settings.guards} onChange={e => setSettings(s => ({ ...s, guards: e.target.checked }))}/> Show guarding</label>
      <label className="wulftec-parts">Inspect assembly<select aria-label="Inspect assembly" value={settings.selected} onChange={e => setSettings(s => ({ ...s, selected: e.target.value }))}><option value="">Select a part</option>{assemblyInfo.filter((_, i) => settings.scope === 'machine' || i >= 5).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <div className="wulftec-selection" aria-live="polite"><strong>{selected?.[1] ?? 'Explore the assemblies'}</strong><p>{selected?.[2] ?? 'Select from the list or click the model. Use the carriage view for a closer look at the rollers, drive, gate, and cover.'}</p></div>
      <button disabled={exporting || !!error} onClick={async () => { setExporting(true); try { await actions.current?.download(); } catch { setError('Model export failed. Please try again.'); } finally { setExporting(false); } }}>{exporting ? 'Preparing model…' : 'Download current view (.glb)'}</button>
      <p className="wulftec-note">Illustrative geometry: unseen details and undimensioned parts are approximate. Exploded spacing is for viewing, not a disassembly sequence. GLB coordinates use inches.</p>
      <details><summary>Keyboard controls</summary><p>Focus the model, then use arrow keys to orbit, + / − to zoom, and 0 to fit.</p></details>
    </aside>
  </main>;
}
