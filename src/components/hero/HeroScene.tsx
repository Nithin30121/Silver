// SILVORA | The hero's 3D scene: one Cuban-link silver bracelet with a box clasp, turning in a dark studio.
// Loaded on demand (see Hero.tsx), so the shop's other pages never download Three.js.
// Everything that moves is changed inside useFrame on refs, so React never re-renders per frame.

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { MathUtils, MeshPhysicalMaterial, NeutralToneMapping, type Group, type InstancedMesh, type Mesh } from 'three';
import { CHAIN, CHAIN_EXTENT, boxClasp, claspMatrix, curbLink, curbLinkMatrices } from './braceletGeometry';

/** Where the bracelet goes: the centre and size of the free space above the lettering, as fractions of the hero. */
export interface SceneAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneMotion {
  /** The pointer across the window, -1..1 on each axis; stays at 0 on touch screens. */
  pointer: RefObject<{ x: number; y: number }>;
  /** How far the hero has scrolled out of view, 0..1. */
  scroll: RefObject<number>;
  anchor: RefObject<SceneAnchor>;
}

export interface HeroSceneProps {
  /** performance.now() when the hero began revealing, or null while the first-visit intro still shows. */
  revealAt: number | null;
  /** False while the hero is off screen or the tab is hidden, which stops rendering. */
  active: boolean;
  reducedMotion: boolean;
  /** Phones and tablets: a lighter mesh and a lower pixel ratio. */
  lowPower: boolean;
  motion: SceneMotion;
}

const { damp } = MathUtils;
/** Long pauses (a hidden tab) must not make anything jump when rendering resumes. */
const step = (delta: number) => Math.min(delta, 1 / 20);

/** Resting tilt: seen from a little above, like a bracelet held up to the light. */
const TILT = 1.14;
/** How far it rocks forward and back around that tilt. */
const ROCK = 0.06;
/**
 * How big the tilted bracelet looks, in its own units, with room for its rocking. The oval's long
 * side turns round as the bracelet spins, so both directions allow for it.
 */
const APPARENT_HEIGHT = 2 * CHAIN_EXTENT.x * Math.cos(TILT - ROCK) + 2 * CHAIN_EXTENT.band * Math.sin(TILT);
const APPARENT_WIDTH = 2 * CHAIN_EXTENT.x;
const ENTER_DELAY = 500;

/**
 * Satin-polished silver: bright, but soft enough that the cut faces and the shading between links
 * stay readable instead of turning into one white glare. The links carry their own face tones.
 */
const satinSilver = (roughness: number, extra: Partial<ConstructorParameters<typeof MeshPhysicalMaterial>[0]> = {}) =>
  new MeshPhysicalMaterial({
    color: '#dedfe1', metalness: 1, roughness, envMapIntensity: 1.15, transparent: true, opacity: 0, ...extra,
  });

function CubanBracelet({ revealAt, reducedMotion, lowPower, motion }: Omit<HeroSceneProps, 'active'>) {
  const holder = useRef<Group>(null);
  const body = useRef<Group>(null);
  const chain = useRef<InstancedMesh>(null);
  const clasp = useRef<Mesh>(null);
  const entered = useRef(0);
  const turned = useRef(0);
  const parts = useMemo(() => ({
    link: curbLink(lowPower ? 0.6 : 1),
    claspShape: boxClasp(),
    linkMetal: satinSilver(0.3, { vertexColors: true }),
    // The clasp is a touch more matte, so it reads as a separate, finely finished piece.
    claspMetal: satinSilver(0.32, { color: '#e0e3e8' }),
  }), [lowPower]);
  const placements = useMemo(() => ({ links: curbLinkMatrices(), clasp: claspMatrix() }), []);
  useEffect(() => () => Object.values(parts).forEach((part) => part.dispose()), [parts]);

  useLayoutEffect(() => {
    const mesh = chain.current;
    const claspMesh = clasp.current;
    if (!mesh || !claspMesh) return;
    placements.links.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    claspMesh.matrix.copy(placements.clasp);
    claspMesh.matrixWorldNeedsUpdate = true;
  }, [placements, parts]);

  useFrame(({ clock, viewport }, rawDelta) => {
    const delta = step(rawDelta);
    const group = holder.current;
    const turning = body.current;
    if (!group || !turning) return;
    const due = revealAt !== null && performance.now() >= revealAt + ENTER_DELAY;
    // Exponential easing: it glides in and settles, with no overshoot or bounce.
    entered.current = reducedMotion ? (due ? 1 : 0) : damp(entered.current, due ? 1 : 0, 1.7, delta);
    const e = entered.current;
    const rest = 1 - e;
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const away = reducedMotion ? 0 : motion.scroll.current;

    group.visible = e > 0.002;
    for (const material of [parts.linkMetal, parts.claspMetal]) {
      material.opacity = e;
      if (e > 0.997 && material.transparent) {
        // Fully opaque once settled, so it sorts and shades like any solid object.
        material.transparent = false;
        material.needsUpdate = true;
      }
    }

    // Fit the bracelet into the space the page leaves for it, as large as that space allows.
    const anchor = motion.anchor.current;
    const fit = Math.min(
      (anchor.height * viewport.height) / APPARENT_HEIGHT,
      (anchor.width * viewport.width * 0.94) / APPARENT_WIDTH,
      2,
    );
    group.position.set(
      (anchor.x - 0.5) * viewport.width,
      // On wide screens the near side looks larger, so sitting a touch low centres it by eye.
      (0.5 - anchor.y) * viewport.height - (viewport.aspect > 1 ? 0.035 * viewport.height : 0)
        + Math.sin(t * 0.55) * 0.06 * fit - rest * 1.2 + away * 0.9,
      -rest * 3 + away * 0.6,
    );
    group.scale.setScalar(fit * (0.75 + 0.25 * e) * (1 - 0.1 * away));

    // A slow turn around the bracelet's own axis carries the links and clasp round; gentle sway on the others.
    // It starts with the clasp at the front right, where it is easy to see.
    if (!reducedMotion) turned.current += 0.12 * delta * (1 + away * 2.5);
    turning.rotation.set(
      TILT + Math.sin(t * 0.23) * ROCK + rest * 0.7,
      Math.sin(t * 0.17 + 1.3) * 0.16 - rest * 0.5,
      -0.9 + turned.current,
    );
  });

  return (
    <group ref={holder} visible={false}>
      <group ref={body}>
        <instancedMesh ref={chain} args={[parts.link, parts.linkMetal, CHAIN.links]} />
        <mesh ref={clasp} geometry={parts.claspShape} material={parts.claspMetal} matrixAutoUpdate={false} />
      </group>
    </group>
  );
}

/** Follows the pointer with the bracelet and the camera. */
function Rig({ children, reducedMotion, motion }: { children: ReactNode; reducedMotion: boolean; motion: SceneMotion }) {
  const rig = useRef<Group>(null);
  useFrame(({ camera }, rawDelta) => {
    const delta = step(rawDelta);
    const group = rig.current;
    if (!group || reducedMotion) return;
    const { x, y } = motion.pointer.current;
    group.rotation.y = damp(group.rotation.y, x * 0.24, 2.4, delta);
    group.rotation.x = damp(group.rotation.x, -y * 0.14, 2.4, delta);
    camera.position.x = damp(camera.position.x, x * 0.25, 1.8, delta);
    camera.position.y = damp(camera.position.y, -y * 0.15, 1.8, delta);
    camera.lookAt(0, 0, 0);
  });
  return <group ref={rig}>{children}</group>;
}

/**
 * A studio made of soft light panels rather than a downloaded photo: long strips give the silver
 * its bright streaks, a ring adds round catchlights, and graphite surroundings shade the curves.
 */
function Studio() {
  return (
    <>
      <ambientLight intensity={0.15} />
      {/* A clear key light from the upper left gives each cut face its own brightness. */}
      <directionalLight position={[-4, 6, 6]} intensity={2.4} />
      <directionalLight position={[6, -1, -4]} intensity={0.7} color="#d3d7dc" />
      <Environment resolution={256} frames={1}>
        {/* A grey studio, so the facets turned away from the lights still read as silver, not black. */}
        <color attach="background" args={['#242526']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} scale={[12, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-4, 2, 6]} scale={[5, 3.5, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[4, -1, 6]} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-6, 0.5, 1]} scale={[0.4, 9, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[6, -0.8, 2]} scale={[0.3, 7, 1]} />
        <Lightformer form="ring" intensity={1.1} position={[0, 1, 7]} scale={2.6} />
        <Lightformer form="rect" intensity={0.6} color="#b9bcc0" position={[0, -5, 1]} scale={[12, 4, 1]} />
      </Environment>
    </>
  );
}

/** With reduced motion nothing animates, so draw a few frames (the studio lighting needs one) and stop. */
function DrawStill({ reducedMotion, revealAt }: { reducedMotion: boolean; revealAt: number | null }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!reducedMotion) return;
    let frames = 0;
    let id = 0;
    const draw = () => {
      invalidate();
      if (++frames < 6) id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [reducedMotion, revealAt, invalidate]);
  return null;
}

export default function HeroScene({ revealAt, active, reducedMotion, lowPower, motion }: HeroSceneProps) {
  return (
    <Canvas
      className="lux-hero-canvas"
      dpr={[1, lowPower ? 1.5 : 2]}
      // A slightly closer camera adds depth: the front of the bracelet reads larger than the back.
      camera={{ position: [0, 0, 7.4], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // Neutral tone mapping keeps polished silver bright and colour-true, as in product photography.
      onCreated={({ gl }) => { gl.toneMapping = NeutralToneMapping; gl.toneMappingExposure = 1.02; }}
      frameloop={!active ? 'never' : reducedMotion ? 'demand' : 'always'}
    >
      <Studio />
      <Rig reducedMotion={reducedMotion} motion={motion}>
        <CubanBracelet revealAt={revealAt} reducedMotion={reducedMotion} lowPower={lowPower} motion={motion} />
      </Rig>
      <DrawStill reducedMotion={reducedMotion} revealAt={revealAt} />
    </Canvas>
  );
}
