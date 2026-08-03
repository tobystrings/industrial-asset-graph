import { Billboard, OrbitControls, Text } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Asset, colorFor, connectedAssetIds, Dependency } from './graph';
import { StreetPath, UtilityPath } from './osm';
import { OnlineBuildingModel } from './reconstruction';

type ViewPreset = 'recenter' | 'aerial' | 'operator';
interface SceneProps { assets: Asset[]; dependencies: Dependency[]; streets: StreetPath[]; utilities: UtilityPath[]; buildingModel: OnlineBuildingModel | null; aerialUrl: string | null; origin: [number, number]; contextRadius: number; viewPreset: ViewPreset; viewRevision: number; viewOffsetX: number; viewOffsetZ: number; selectedId: string | null; selectedUtilityId: string | null; isolate: boolean; onSelect: (asset: Asset) => void; onSelectUtility: (utility: UtilityPath) => void; onSelectStreet: (street: StreetPath) => void; }

function NavigationControls({ preset, revision, contextRadius, offsetX, offsetZ }: { preset: ViewPreset; revision: number; contextRadius: number; offsetX: number; offsetZ: number }) {
  const controls = useRef<any>(null);
  const { camera } = useThree();
  useEffect(() => {
    const distance = Math.min(Math.max(contextRadius / 10, 18), 95);
    const positions: Record<ViewPreset, [number, number, number]> = {
      recenter: [distance * 0.72, distance * 0.58, distance * 0.82],
      aerial: [0.01, Math.max(distance, 30), 0.01],
      operator: [0, 2.1, Math.min(distance * 0.72, 28)],
    };
    const [x, y, z] = positions[preset];
    camera.position.set(x + offsetX, y, z + offsetZ);
    camera.up.set(0, 1, 0);
    controls.current?.target.set(offsetX, 0, offsetZ);
    controls.current?.update();
  }, [camera, contextRadius, offsetX, offsetZ, preset, revision]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={3} maxDistance={Math.max(120, contextRadius / 8)} maxPolarAngle={Math.PI / 2.01} />;
}

function AssetNode({ asset, selected, dimmed, onSelect }: { asset: Asset; selected: boolean; dimmed: boolean; onSelect: () => void }) {
  const color = colorFor[asset.kind];
  const isZone = asset.kind === 'ZONE';
  return <group position={asset.position} onClick={(event) => { event.stopPropagation(); onSelect(); }} renderOrder={2}>
    <mesh castShadow receiveShadow renderOrder={2}>
      {isZone ? <cylinderGeometry args={[1.35, 1.35, 0.12, 48]} /> : <boxGeometry args={[0.72, 0.72, 0.72]} />}
      <meshStandardMaterial color={color} emissive={selected ? color : '#000000'} emissiveIntensity={selected ? 0.65 : 0} transparent opacity={dimmed ? 0.16 : 1} />
    </mesh>
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, isZone ? 0.12 : -0.37, 0]} renderOrder={3}><ringGeometry args={[isZone ? 1.55 : 0.62, isZone ? 1.66 : 0.7, 40]} /><meshBasicMaterial color="#ffffff" depthTest={false} /></mesh>}
    <Text position={[0, isZone ? 0.32 : 0.58, 0]} fontSize={0.22} color="#dce6e8" anchorX="center" maxWidth={2.2} textAlign="center">{asset.label}</Text>
  </group>;
}

function DependencyLine({ source, target, active, dimmed }: { source: Asset; target: Asset; active: boolean; dimmed: boolean }) {
  const points = useMemo(() => [new THREE.Vector3(...source.position), new THREE.Vector3(...target.position)], [source, target]);
  return <line><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(points.flatMap((p) => p.toArray())), 3]} /></bufferGeometry><lineBasicMaterial color={active ? '#ffffff' : '#52727a'} transparent opacity={dimmed ? 0.08 : active ? 1 : 0.35} /></line>;
}

function OnlineBuildingShell({ model, origin }: { model: OnlineBuildingModel; origin: [number, number] }) {
  const metersPerLatitude = 111_320;
  const metersPerLongitude = metersPerLatitude * Math.cos(origin[0] * Math.PI / 180);
  const shape = useMemo(() => new THREE.Shape(model.footprint.geometry.map(([lat, lon]) => new THREE.Vector2(
    (lon - origin[1]) * metersPerLongitude / 12,
    (lat - origin[0]) * metersPerLatitude / 12,
  ))), [metersPerLatitude, metersPerLongitude, model.footprint.geometry, origin]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.31, 0]} receiveShadow castShadow renderOrder={1}>
    <extrudeGeometry args={[shape, { depth: Math.max(model.heightMeters / 12, 0.25), bevelEnabled: false }]} />
    <meshStandardMaterial color="#80949a" emissive="#17282c" emissiveIntensity={0.18} transparent opacity={0.58} roughness={0.82} metalness={0.05} />
  </mesh>;
}

function StreetLayer({ streets, origin, onSelect }: { streets: StreetPath[]; origin: [number, number]; onSelect: (street: StreetPath) => void }) {
  const metersPerLatitude = 111_320;
  const metersPerLongitude = metersPerLatitude * Math.cos(origin[0] * Math.PI / 180);
  const [distance, setDistance] = useState(0);
  useFrame(({ camera }) => { const next = camera.position.length(); setDistance((current) => Math.abs(current - next) > 2 ? next : current); });
  const labelLimit = distance > 65 ? 9 : distance > 35 ? 13 : 18;
  const labelKinds = distance > 35 ? ['primary', 'secondary', 'tertiary'] : ['primary', 'secondary', 'tertiary', 'residential'];
  const labels = streets.filter((street) => street.name !== 'Unnamed street' && labelKinds.includes(street.kind)).filter((street, index, all) => all.findIndex((candidate) => candidate.name === street.name) === index).sort((a, b) => {
    const point = (street: StreetPath) => street.geometry[Math.floor(street.geometry.length / 2)];
    const [aLat, aLon] = point(a); const [bLat, bLon] = point(b);
    return Math.hypot(aLat - origin[0], aLon - origin[1]) - Math.hypot(bLat - origin[0], bLon - origin[1]);
  }).reduce<StreetPath[]>((chosen, street) => {
    const point = street.geometry[Math.floor(street.geometry.length / 2)];
    const [x, z] = [(point[1] - origin[1]) * metersPerLongitude / 12, -(point[0] - origin[0]) * metersPerLatitude / 12];
    const spacing = distance > 65 ? 6 : distance > 35 ? 4 : 2.5;
    return chosen.length >= labelLimit || chosen.some((candidate) => { const other = candidate.geometry[Math.floor(candidate.geometry.length / 2)]; return Math.hypot(x - (other[1] - origin[1]) * metersPerLongitude / 12, z + (other[0] - origin[0]) * metersPerLatitude / 12) < spacing; }) ? chosen : [...chosen, street];
  }, []);
  const project = ([lat, lon]: [number, number]) => [(lon - origin[1]) * metersPerLongitude / 12, -(lat - origin[0]) * metersPerLatitude / 12] as const;
  return <group>{streets.map((street) => {
    const positions = new Float32Array(street.geometry.flatMap(([lat, lon]) => [(lon - origin[1]) * metersPerLongitude / 12, -0.3, -(lat - origin[0]) * metersPerLatitude / 12]));
    return <line key={street.id} onClick={(event) => { event.stopPropagation(); onSelect(street); }}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><lineBasicMaterial color={street.kind === 'primary' ? '#667e83' : '#526d72'} transparent opacity={distance > 65 ? 0.42 : 0.65} /></line>;
  })}{labels.map((street) => { const [x, z] = project(street.geometry[Math.floor(street.geometry.length / 2)]); return <Billboard key={`label-${street.id}`} position={[x, 0.34, z]} renderOrder={5}><Text renderOrder={5} fontSize={distance > 65 ? 0.24 : 0.28} color="#fff6c7" outlineColor="#071114" outlineWidth={0.028} anchorX="center" material-depthTest={false}>{street.name}</Text></Billboard>; })}</group>;
}

function UtilityLayer({ utilities, origin, selectedId, onSelect }: { utilities: UtilityPath[]; origin: [number, number]; selectedId: string | null; onSelect: (utility: UtilityPath) => void }) {
  const metersPerLatitude = 111_320;
  const metersPerLongitude = metersPerLatitude * Math.cos(origin[0] * Math.PI / 180);
  const selected = utilities.find((utility) => utility.id === selectedId);
  const midpoint = selected?.geometry[Math.floor(selected.geometry.length / 2)];
  return <group>{utilities.map((utility) => <line key={utility.id} onClick={(event) => { event.stopPropagation(); onSelect(utility); }}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(utility.geometry.flatMap(([lat, lon]) => [(lon - origin[1]) * metersPerLongitude / 12, -0.28, -(lat - origin[0]) * metersPerLatitude / 12])), 3]} /></bufferGeometry><lineBasicMaterial color={utility.id === selectedId ? '#ffffff' : utility.kind === 'water' ? '#4baed0' : '#b58971'} transparent opacity={utility.id === selectedId ? 1 : 0.5} depthTest={false} depthWrite={false} /></line>)}{selected && midpoint && <mesh position={[(midpoint[1] - origin[1]) * metersPerLongitude / 12, -0.275, -(midpoint[0] - origin[0]) * metersPerLatitude / 12]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.2, 0.3, 28]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} /></mesh>}</group>;
}

function RasterLayer({ url, radius, opacity }: { url: string; radius: number; opacity: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let current = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (next) => { if (current) { next.colorSpace = THREE.SRGBColorSpace; setTexture(next); } }, undefined, () => { if (current) setTexture(null); });
    return () => { current = false; };
  }, [url]);
  if (!texture) return null;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.36, 0]}><planeGeometry args={[radius / 6, radius / 6]} /><meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} /></mesh>;
}

function Scene({ assets, dependencies, streets, utilities, buildingModel, aerialUrl, origin, contextRadius, viewPreset, viewRevision, viewOffsetX, viewOffsetZ, selectedId, selectedUtilityId, isolate, onSelect, onSelectUtility, onSelectStreet }: SceneProps) {
  const linked = selectedId ? connectedAssetIds(selectedId, dependencies) : new Set<string>();
  return <>
    <color attach="background" args={['#101a1d']} />
    <ambientLight intensity={1.3} /><directionalLight position={[4, 8, 3]} intensity={2.6} castShadow />
    <gridHelper args={[Math.max(140, contextRadius / 6), Math.max(32, Math.round(contextRadius / 50)), '#1f3a40', '#14272c']} position={[0, -0.34, 0]} />
    {aerialUrl && <RasterLayer url={aerialUrl} radius={contextRadius} opacity={0.9} />}
    {buildingModel && <OnlineBuildingShell model={buildingModel} origin={origin} />}
    <StreetLayer streets={streets} origin={origin} onSelect={onSelectStreet} />
    <UtilityLayer utilities={utilities} origin={origin} selectedId={selectedUtilityId} onSelect={onSelectUtility} />
    {dependencies.map((edge) => { const source = assets.find((asset) => asset.id === edge.source)!; const target = assets.find((asset) => asset.id === edge.target)!; const active = selectedId === edge.source || selectedId === edge.target; return <DependencyLine key={edge.id} source={source} target={target} active={active} dimmed={isolate && !active} />; })}
    {assets.map((asset) => <AssetNode key={asset.id} asset={asset} selected={asset.id === selectedId} dimmed={isolate && selectedId !== null && !linked.has(asset.id)} onSelect={() => onSelect(asset)} />)}
    <NavigationControls preset={viewPreset} revision={viewRevision} contextRadius={contextRadius} offsetX={viewOffsetX} offsetZ={viewOffsetZ} />
  </>;
}

export function AssetScene(props: SceneProps) { return <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} raycaster={{ params: { Mesh: {}, Line: { threshold: 0.2 }, LOD: {}, Points: { threshold: 1 }, Sprite: {} } }} camera={{ position: [8.5, 7, 10], fov: 46 }}><Suspense fallback={null}><Scene {...props} /></Suspense></Canvas>; }
