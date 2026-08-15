import { Edges, Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { Color, DoubleSide, type Group, type Mesh } from 'three';
import { areas, machines } from '../facilityData';
import { cameraLerp, emissivePulse, growAt, liftScaleAt, pinBobOffset } from '../lib/motion';
import { markerForStatus } from '../lib/statusMark';
import type { FacilityArea, FacilityAsset, VerificationState } from '../types/facility';
import { rectToWorld, schematicFor, unmappedSchematic } from './layout';

const STATUS_HEX: Record<string, string> = {
  COMPLETE: '#2dd4bf',
  IN_PROGRESS: '#fbbf24',
  REVIEW: '#fbbf24',
  DRAFT: '#fbbf24',
  NOT_STARTED: '#94a3b8',
  VERIFIED: '#2dd4bf',
  FIELD_VERIFY: '#fbbf24',
  INFERRED: '#818cf8',
  DISPUTED: '#f87171',
  RETIRED: '#94a3b8',
};

export default function FacilityMap3D({
  selectedArea,
  selectedAsset,
  filters,
  onArea,
  onAsset,
}: {
  selectedArea: FacilityArea | null;
  selectedAsset: FacilityAsset | null;
  filters: Set<VerificationState>;
  onArea: (area: FacilityArea) => void;
  onAsset: (asset: FacilityAsset) => void;
}) {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const mapHost = useRef<HTMLDivElement>(null);
  const host = mapHost as RefObject<HTMLElement>;
  return (
    <div ref={mapHost} className="map3d-root" data-testid="map-stage-3d" role="group" aria-label="Interactive 3D J. Lieb facility layout">
      <Canvas
        camera={{ position: [52, 36, 88], fov: 40, near: 0.1, far: 500 }}
        dpr={[1, 1.75]}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#e8eef5']} />
        <fog attach="fog" args={['#dce6f0', 180, 420]} />
        <hemisphereLight args={['#f8fafc', '#94a3b8', 0.85]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[40, 70, 20]} intensity={1.15} color="#fff7ed" />
        <directionalLight position={[-30, 24, -20]} intensity={0.35} color="#99f6e4" />
        <Ground selectedArea={selectedArea} reduced={reduced} />
        <UnmappedBlock />
        {areas.map((area, index) => (
          <AreaBlock
            key={area.id}
            area={area}
            index={index}
            selected={selectedArea?.id === area.id}
            dimmed={Boolean(selectedArea && selectedArea.id !== area.id)}
            reduced={reduced}
            onArea={onArea}
            host={host}
          />
        ))}
        {machines.map((asset) => (
          filters.has(asset.verificationStatus)
            ? <AssetPin key={asset.id} asset={asset} selected={selectedAsset?.id === asset.id} reduced={reduced} onAsset={onAsset} host={host} />
            : null
        ))}
        <FocusCamera selectedArea={selectedArea} reduced={reduced} />
        <OrbitControls
          makeDefault
          enableDamping={!reduced}
          dampingFactor={0.08}
          minPolarAngle={0.35}
          maxPolarAngle={1.25}
          minDistance={22}
          maxDistance={160}
          target={[48, 1, 46]}
          autoRotate={!reduced && !selectedArea}
          autoRotateSpeed={0.35}
        />
      </Canvas>
      <div className="map3d-hud">
        <span>Drag to orbit · scroll to zoom · click a building</span>
        <small>Schematic extrusion · not a surveyed 3D scan</small>
      </div>
    </div>
  );
}

function Ground({ selectedArea, reduced }: { selectedArea: FacilityArea | null; reduced: boolean }) {
  const ring = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const pulse = reduced ? 0.18 : 0.12 + (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.4)) * 0.12;
    const material = ring.current.material as { opacity: number };
    material.opacity = selectedArea ? pulse + 0.08 : pulse;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, -0.04, 50]} receiveShadow>
        <planeGeometry args={[130, 130]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.92} metalness={0.04} />
      </mesh>
      <gridHelper args={[120, 24, '#94a3b8', '#cbd5e1']} position={[50, 0.01, 50]} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[50, 0.02, 50]}>
        <ringGeometry args={[68, 69.2, 80]} />
        <meshBasicMaterial color="#0d9488" transparent opacity={0.18} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function UnmappedBlock() {
  const world = rectToWorld(unmappedSchematic);
  return (
    <mesh position={[world.x, world.height / 2, world.z]}>
      <boxGeometry args={[world.width, world.height, world.depth]} />
      <meshStandardMaterial color="#cbd5e1" transparent opacity={0.28} wireframe />
    </mesh>
  );
}

function AreaBlock({
  area,
  index,
  selected,
  dimmed,
  reduced,
  onArea,
  host,
}: {
  area: FacilityArea;
  index: number;
  selected: boolean;
  dimmed: boolean;
  reduced: boolean;
  onArea: (area: FacilityArea) => void;
  host: RefObject<HTMLElement>;
}) {
  const mesh = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const appear = useRef(reduced ? 1 : 0);
  const world = rectToWorld(schematicFor(area.id));
  const hex = STATUS_HEX[area.status] ?? '#94a3b8';
  const color = useMemo(() => new Color(hex), [hex]);
  useFrame((state, delta) => {
    if (!mesh.current) return;
    if (appear.current < 1) appear.current = Math.min(1, appear.current + delta / (0.45 + index * 0.04));
    const grown = growAt(appear.current, reduced);
    const lift = liftScaleAt(hovered, selected, reduced);
    const goal = grown * lift;
    const next = reduced ? goal : mesh.current.scale.y + (goal - mesh.current.scale.y) * Math.min(1, delta * 8);
    mesh.current.scale.y = next;
    mesh.current.position.y = (world.height * next) / 2;
    const material = mesh.current.material as unknown as { emissiveIntensity: number };
    material.emissiveIntensity = emissivePulse(state.clock.elapsedTime, selected, reduced) + (hovered && !selected ? 0.1 : 0);
    if (halo.current) {
      const show = selected || hovered ? 1 : 0;
      halo.current.scale.x += (show - halo.current.scale.x) * (reduced ? 1 : 0.12);
      halo.current.scale.z = halo.current.scale.x;
      (halo.current.material as { opacity: number }).opacity = halo.current.scale.x * 0.45;
    }
  });
  return (
    <group>
      <mesh
        ref={halo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[world.x, 0.06, world.z]}
        scale={[0, 1, 0]}
      >
        <ringGeometry args={[Math.max(world.width, world.depth) * 0.42, Math.max(world.width, world.depth) * 0.55, 32]} />
        <meshBasicMaterial color={hex} transparent opacity={0} side={DoubleSide} />
      </mesh>
      <mesh
        ref={mesh}
        position={[world.x, world.height / 2, world.z]}
        onClick={(event) => {
          event.stopPropagation();
          onArea(area);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[world.width, world.height, world.depth]} />
        <meshStandardMaterial
          color={color}
          emissive={hex}
          emissiveIntensity={0}
          transparent
          opacity={dimmed ? 0.45 : selected ? 1 : 0.96}
          roughness={0.38}
          metalness={0.12}
        />
        <Edges color={selected ? '#0f766e' : '#334155'} threshold={15} />
      </mesh>
      <Html position={[world.x, world.height + 1.2, world.z]} center portal={host} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`map3d-label ${selected ? 'is-selected' : ''} ${hovered ? 'is-hover' : ''}`}>{area.shortName}</div>
      </Html>
    </group>
  );
}

function AssetPin({
  asset,
  selected,
  reduced,
  onAsset,
  host,
}: {
  asset: FacilityAsset;
  selected: boolean;
  reduced: boolean;
  onAsset: (asset: FacilityAsset) => void;
  host: RefObject<HTMLElement>;
}) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const world = rectToWorld(schematicFor(asset.areaId));
  const offset = asset.id === 'L2-CC-001' ? 11 : -11;
  const { tone } = markerForStatus(asset.verificationStatus);
  const hex = STATUS_HEX[asset.verificationStatus] ?? '#fbbf24';
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.y = world.height + 2.4 + pinBobOffset(state.clock.elapsedTime + offset, reduced);
    if (!reduced) group.current.rotation.y += selected ? 0.025 : 0.01;
    const scale = selected ? 1.18 : 1;
    group.current.scale.setScalar(reduced ? scale : group.current.scale.x + (scale - group.current.scale.x) * 0.12);
  });
  return (
    <group
      ref={group}
      position={[world.x + offset, world.height + 2.4, world.z + 2]}
      onClick={(event) => {
        event.stopPropagation();
        onAsset(asset);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = '';
      }}
    >
      <mesh>
        <octahedronGeometry args={[selected ? 1.2 : 0.95, 0]} />
        <meshStandardMaterial color={hex} emissive={hex} emissiveIntensity={selected ? 0.6 : 0.25} />
      </mesh>
      {(selected || hovered) && (
        <Html position={[0, 2.2, 0]} center portal={host} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`map3d-pin ${tone} ${selected ? 'is-selected' : ''}`}>{asset.id}</div>
        </Html>
      )}
    </group>
  );
}

function FocusCamera({ selectedArea, reduced }: { selectedArea: FacilityArea | null; reduced: boolean }) {
  const { camera, controls } = useThree();
  useFrame(() => {
    if (!selectedArea || !controls) return;
    const world = rectToWorld(schematicFor(selectedArea.id));
    const orbit = controls as unknown as { target?: { x: number; y: number; z: number } };
    if (!orbit.target) return;
    orbit.target.x = cameraLerp(orbit.target.x, world.x, reduced, 0.06);
    orbit.target.y = cameraLerp(orbit.target.y, 0.4, reduced, 0.06);
    orbit.target.z = cameraLerp(orbit.target.z, world.z, reduced, 0.06);
    camera.position.x = cameraLerp(camera.position.x, world.x + 18, reduced, 0.035);
    camera.position.y = cameraLerp(camera.position.y, 32, reduced, 0.035);
    camera.position.z = cameraLerp(camera.position.z, world.z + 26, reduced, 0.035);
  });
  return null;
}
