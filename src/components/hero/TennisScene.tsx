// SILVORA | The hero's 3D scene: the double-row tennis bracelet floating over the red velvet, turning slowly.
// Loaded on demand (see Hero.tsx), so the shop's other pages never download Three.js. Everything that moves
// changes inside useFrame on refs, so React never re-renders per frame.

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshRefractionMaterial } from '@react-three/drei';
import {
  CanvasTexture, Color, CubeCamera, DoubleSide, HalfFloatType, MathUtils, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  NeutralToneMapping, PlaneGeometry, SRGBColorSpace, Scene, WebGLCubeRenderTarget,
  type BufferGeometry, type Group, type InstancedMesh, type Matrix4,
} from 'three';
import {
  BRACELET_REACH, CHAIN_LINKS, STONE_COUNT, VISUAL_CENTRE, ballEnd, ballMatrices, boxLink, boxSetting, brilliantStone,
  chainLinkMatrices, endCap, endCapMatrices, settingMatrices, sliderBead, sliderMatrix,
} from './tennisBraceletGeometry';

/** The visitor's turning: how far they have dragged it, and how fast it was going when they let go. */
export interface SpinState {
  dragging: boolean;
  /** Radians added by dragging sideways so far (turning it round). */
  offset: number;
  /** Radians per second it was turning when let go; the scene carries that on, slowing to a stop. */
  glide: number;
  /** Radians added by dragging up and down so far (tipping it over, all the way round if they like). */
  tilt: number;
  /** Radians per second it was tipping when let go. */
  tiltGlide: number;
  /** performance.now() when it was last let go, so the scene picks up each new glide once. */
  releasedAt: number;
  /** performance.now() of the last drag. */
  lastInteraction: number;
}

export interface TennisSceneProps {
  /** False while the hero is off screen or the tab is hidden, which stops rendering. */
  active: boolean;
  reducedMotion: boolean;
  /** Phones and tablets: lighter shapes and a lower pixel ratio. */
  lowPower: boolean;
  spin: RefObject<SpinState>;
  /** The pointer across the window, -1..1 on each axis; stays at 0 on touch screens. */
  pointer: RefObject<{ x: number; y: number }>;
  /**
   * The space the bracelet rests in, in pixels in from each edge of the canvas: between the header and Discover.
   * The canvas itself fills the whole hero, so the bracelet is never cut off when it is turned to any angle.
   */
  safeArea: RefObject<{ top: number; right: number; bottom: number; left: number }>;
}

const { damp } = MathUtils;
const step = (delta: number) => Math.min(delta, 1 / 20);
/** Seen from above at about the angle of the product photographs: the loop looks a little over half as deep as wide. */
const TILT = 0.64;
/** Half the bracelet's height on screen at that angle, in its own units, with the band's own height. */
const HALF_HEIGHT = BRACELET_REACH * Math.sin(TILT) + 0.16;

/** Polished, rhodium-plated sterling silver: bright and cool, but a mirror with a little softness, not chrome. */
const silver = () => new MeshPhysicalMaterial({ color: '#e9ebee', metalness: 1, roughness: 0.13, envMapIntensity: 1.55 });

/** A soft, round shadow on the velvet under the floating bracelet. */
function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(30, 0, 4, 0.55)');
    gradient.addColorStop(0.55, 'rgba(30, 0, 4, 0.22)');
    gradient.addColorStop(1, 'rgba(30, 0, 4, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function TennisBracelet({ reducedMotion, lowPower, spin, pointer, safeArea }: Omit<TennisSceneProps, 'active'>) {
  const holder = useRef<Group>(null);
  const body = useRef<Group>(null);
  const settings = useRef<InstancedMesh>(null);
  const chain = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const balls = useRef<InstancedMesh>(null);
  const slider = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const entered = useRef(0);
  const turned = useRef(0);
  const tipped = useRef(0);
  const lean = useRef({ x: 0, y: 0 });
  // How much of the visitor's turning the scene has applied, and the glides it is still carrying.
  const applied = useRef({ offset: 0, tilt: 0, releasedAt: 0, glide: 0, tiltGlide: 0 });
  const detail = lowPower ? 0.6 : 1;

  const parts = useMemo(() => ({
    setting: boxSetting(detail),
    stone: brilliantStone(),
    link: boxLink(),
    cap: endCap(),
    ball: ballEnd(detail),
    bead: sliderBead(detail),
    metal: silver(),
    shadowMaterial: new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0 }),
  }), [detail]);
  useEffect(() => () => {
    Object.values(parts).forEach((part) => part.dispose());
    parts.shadowMaterial.map?.dispose();
  }, [parts]);

  const placements = useMemo(() => ({
    settings: settingMatrices(), chain: chainLinkMatrices(), caps: endCapMatrices(), balls: ballMatrices(), slider: sliderMatrix(),
  }), []);

  useLayoutEffect(() => {
    const fill = (mesh: InstancedMesh | null, matrices: typeof placements.chain) => {
      if (!mesh) return;
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    fill(settings.current, placements.settings);
    fill(chain.current, placements.chain);
    fill(caps.current, placements.caps);
    fill(balls.current, placements.balls);
    if (slider.current) {
      slider.current.matrix.copy(placements.slider);
      slider.current.matrixWorldNeedsUpdate = true;
    }
  }, [placements, parts]);

  useFrame(({ clock, viewport, size }, rawDelta) => {
    const delta = step(rawDelta);
    const group = holder.current;
    const turning = body.current;
    if (!group || !turning) return;
    entered.current = reducedMotion ? 1 : damp(entered.current, 1, 1.6, delta);
    const e = entered.current;
    const t = reducedMotion ? 0 : clock.elapsedTime;

    // As large as its resting space allows (its full width as it turns, its height seen from above), and centred
    // in that space. The canvas reaches past it on every side, so turned any way it still shows whole.
    const perPixel = viewport.width / Math.max(1, size.width);
    const room = safeArea.current;
    const roomWidth = Math.max(1, size.width - room.left - room.right) * perPixel;
    const roomHeight = Math.max(1, size.height - room.top - room.bottom) * perPixel;
    const fit = Math.min((roomWidth * 0.96) / (2 * BRACELET_REACH), (roomHeight * 0.92) / (2 * HALF_HEIGHT + 0.2), 2.6);
    const centreX = ((room.left - room.right) / 2) * perPixel;
    const centreY = ((room.bottom - room.top) / 2) * perPixel;
    // Floating: a slow rise and fall, a touch higher as it first appears.
    const lift = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.055 * fit;
    group.position.set(centreX, centreY + lift + (1 - e) * -0.4, 0);
    group.scale.setScalar(fit * (0.86 + 0.14 * e));

    // The visitor's turning, then any glide left when they let go, then the slow turn of its own.
    const state = spin.current;
    const done = applied.current;
    if (state.releasedAt !== done.releasedAt) {
      done.releasedAt = state.releasedAt;
      done.glide = state.glide;
      done.tiltGlide = state.tiltGlide;
    }
    if (state.dragging) {
      done.glide = 0;
      done.tiltGlide = 0;
    }
    // Up and down tips it over, towards or away from the visitor, as far as they like: all the way round.
    tipped.current += state.tilt - done.tilt;
    done.tilt = state.tilt;
    if (!reducedMotion) {
      tipped.current += done.tiltGlide * delta;
      done.tiltGlide *= Math.exp(-2.4 * delta);
    }
    // Sideways turns it round about its own centre, like a turntable. Once it is tipped upside down that centre
    // points the other way, so the turn is reversed to keep following the hand.
    const upright = Math.cos(tipped.current + TILT) >= 0 ? 1 : -1;
    turned.current += (state.offset - done.offset) * upright;
    done.offset = state.offset;
    if (!reducedMotion) {
      turned.current += done.glide * upright * delta;
      done.glide *= Math.exp(-2.4 * delta);
    }
    const idle = performance.now() - state.lastInteraction;
    // Left alone for a moment, it settles back to its resting angle (whichever whole turn is nearest).
    if (!reducedMotion && !state.dragging && idle > 2400) {
      const rest = Math.round(tipped.current / (Math.PI * 2)) * Math.PI * 2;
      tipped.current = damp(tipped.current, rest, 1.3, delta);
    }
    group.rotation.set(tipped.current, 0, 0);
    const autoTurn = state.dragging ? 0 : MathUtils.smoothstep(idle, 1200, 3200);
    if (!reducedMotion) turned.current += 0.22 * delta * autoTurn;
    // It leans a little towards the pointer, except while being dragged.
    const target = state.dragging || reducedMotion ? { x: 0, y: 0 } : pointer.current;
    lean.current.x = damp(lean.current.x, target.x, 2.2, delta);
    lean.current.y = damp(lean.current.y, target.y, 2.2, delta);
    turning.rotation.set(
      TILT + Math.sin(t * 0.37) * 0.05 - lean.current.y * 0.12,
      turned.current - 0.35,
      Math.sin(t * 0.29 + 0.8) * 0.05 + lean.current.x * 0.1,
    );

    // The shadow stays on the velvet, softening and spreading as the bracelet rises.
    const glow = shadow.current;
    if (glow) {
      const height = (Math.sin(t * 0.9) + 1) / 2;
      glow.position.set(centreX, centreY - (HALF_HEIGHT + 0.12) * fit - lift * 0.3, -1.5);
      glow.scale.set(2.5 * fit * (1 + height * 0.06), 0.42 * fit * (1 + height * 0.06), 1);
      (glow.material as MeshBasicMaterial).opacity = e * (reducedMotion ? 0.8 : 0.85 - height * 0.2);
    }

  });

  return (
    <>
      <mesh ref={shadow} material={parts.shadowMaterial} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={holder}>
        <group ref={body}>
          <group position={[-VISUAL_CENTRE.x, -VISUAL_CENTRE.y, -VISUAL_CENTRE.z]}>
            <instancedMesh ref={settings} args={[parts.setting, parts.metal, STONE_COUNT]} />
            <Stones geometry={parts.stone} matrices={placements.settings} lowPower={lowPower} />
            <instancedMesh ref={chain} args={[parts.link, parts.metal, CHAIN_LINKS]} />
            <instancedMesh ref={caps} args={[parts.cap, parts.metal, 2]} />
            <instancedMesh ref={balls} args={[parts.ball, parts.metal, 2]} />
            <mesh ref={slider} geometry={parts.bead} material={parts.metal} matrixAutoUpdate={false} />
          </group>
        </group>
      </group>
    </>
  );
}

/**
 * The light the stones see: a dark room hung with white panels and strips, the way jewellery is photographed.
 * A stone bends and bounces that light through its facets, so each facet shows either a crisp white panel or the
 * dark room, the black-and-white mosaic of a real cut stone (a plain grey room only gave flat grey patches).
 * Drawn once into a cube of six pictures when the scene starts.
 */
function useStoneStudio(resolution: number) {
  const gl = useThree((state) => state.gl);
  const studio = useMemo(() => {
    const target = new WebGLCubeRenderTarget(resolution, { type: HalfFloatType });
    const camera = new CubeCamera(0.1, 100, target);
    const room = new Scene();
    room.background = new Color('#3d4046');
    const panel = (width: number, height: number, [x, y, z]: [number, number, number], brightness: number) => {
      const light = new Mesh(
        new PlaneGeometry(width, height),
        new MeshBasicMaterial({ color: new Color(brightness, brightness, brightness), side: DoubleSide, toneMapped: false }),
      );
      light.position.set(x, y, z);
      light.lookAt(0, 0, 0);
      room.add(light);
    };
    // A big softbox overhead, a white sweep below as on a photographer's table, two in front and one behind.
    panel(12, 12, [0, 8, 0], 3.4);
    panel(12, 12, [0, -8, 0], 2);
    panel(6, 7, [-5, 2, 6], 3);
    panel(6, 6, [5.5, 0.5, 5], 2.6);
    panel(8, 4, [0, -1, -8], 1.8);
    // Strips all round at different heights, so facets turned any way find an edge of light.
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.2;
      panel(0.9, 6, [Math.cos(angle) * 8, ((i % 3) - 1) * 2.2, Math.sin(angle) * 8], i % 2 ? 3.8 : 2.2);
    }
    // Small bright cards close in, for the pin-points of light in the middle of a stone.
    panel(0.9, 0.9, [1.6, 3, 4], 4.5);
    panel(0.8, 0.8, [-2.4, 2.6, 3.4], 4);
    panel(0.7, 0.7, [0.4, -2.8, 4.2], 3);
    panel(0.7, 0.7, [-3.6, -1.2, 2.4], 3);
    return { target, camera, room };
  }, [resolution]);
  useEffect(() => {
    studio.camera.update(gl, studio.room);
    return () => {
      studio.target.dispose();
      studio.room.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          (object.material as MeshBasicMaterial).dispose();
        }
      });
    };
  }, [gl, studio]);
  return studio.target.texture;
}

/**
 * The stones, cut and clear like the photographs: each one bends the studio's light through its facets and
 * bounces it inside, so the stones show bright and dark facets and a little colour, as real cut stones do.
 */
function Stones({ geometry, matrices, lowPower }: { geometry: BufferGeometry; matrices: Matrix4[]; lowPower: boolean }) {
  const studio = useStoneStudio(lowPower ? 128 : 256);
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const stones = mesh.current;
    if (!stones) return;
    matrices.forEach((matrix, index) => stones.setMatrixAt(index, matrix));
    stones.instanceMatrix.needsUpdate = true;
    stones.computeBoundingSphere();
  }, [matrices]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, matrices.length]}>
      <MeshRefractionMaterial
        envMap={studio} bounces={lowPower ? 2 : 3} ior={2.4} fresnel={0.3}
        aberrationStrength={lowPower ? 0 : 0.012} fastChroma color="#ffffff"
      />
    </instancedMesh>
  );
}

/**
 * A jeweller's studio made of soft light panels, like a product photographer's: long strips give the silver its
 * bright streaks, and a few round lights give the stones' facets something to catch.
 */
function Studio() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[-4, 6, 6]} intensity={2.2} />
      <directionalLight position={[5, -2, 3]} intensity={0.6} color="#ffd9dc" />
      <Environment resolution={256} frames={1}>
        {/* A light grey studio, so silver turned away from the lights still reads as bright metal, not black. */}
        <color attach="background" args={['#6a6b70']} />
        <Lightformer form="rect" intensity={3} position={[0, 5, 0]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-4, 2, 6]} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[4, -1, 6]} scale={[6, 3.5, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 1, -6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={2.6} position={[-6, 0.5, 1]} scale={[0.4, 9, 1]} />
        <Lightformer form="rect" intensity={2} position={[6, -0.8, 2]} scale={[0.3, 7, 1]} />
        <Lightformer form="ring" intensity={3} position={[1.5, 2.5, 6]} scale={0.6} />
        <Lightformer form="ring" intensity={2.5} position={[-2.5, 1, 6]} scale={0.45} />
        <Lightformer form="circle" intensity={3.5} position={[3, 3.5, 4]} scale={0.35} />
        <Lightformer form="circle" intensity={3} position={[-3.5, -1.5, 5]} scale={0.3} />
        {/* Soft white light from below as well, so the insides of the box settings read as bright silver. */}
        <Lightformer form="rect" intensity={1.6} position={[0, -5, 2]} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, -5, -3]} scale={[8, 3, 1]} />
      </Environment>
    </>
  );
}

/** With reduced motion nothing animates, so draw a few frames (the studio lighting needs one) and stop. */
function DrawStill({ reducedMotion }: { reducedMotion: boolean }) {
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
  }, [reducedMotion, invalidate]);
  return null;
}

export default function TennisScene({ active, reducedMotion, lowPower, spin, pointer, safeArea }: TennisSceneProps) {
  return (
    <Canvas
      className="lux-hero-canvas"
      dpr={[1, lowPower ? 1.5 : 2]}
      camera={{ position: [0, 0, 7], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      // Neutral tone mapping keeps polished silver bright and colour-true, as in product photography.
      onCreated={({ gl }) => { gl.toneMapping = NeutralToneMapping; gl.toneMappingExposure = 1.05; }}
      frameloop={!active ? 'never' : reducedMotion ? 'demand' : 'always'}
    >
      <Studio />
      <TennisBracelet reducedMotion={reducedMotion} lowPower={lowPower} spin={spin} pointer={pointer} safeArea={safeArea} />
      <DrawStill reducedMotion={reducedMotion} />
    </Canvas>
  );
}
