// SILVORA | Procedural Cuban-link (curb chain) bracelet for the 3D hero
// Built from code rather than a downloaded model, so there is nothing to fetch and nothing to go
// missing. One oval link is modelled once and repeated round an oval wrist shape that is closed by
// a box clasp. Like a real curb chain, each link is twisted so its ends lie flat against the wrist,
// and neighbours overlap by half a link, so the chain reads as one dense band.
//
// Detail comes from the cut faces: every face of a link has its own crisp edges, and faces that look
// into the link or down at the wrist are toned darker (as the crevices of a real chain are), so the
// diamond-cut tops stand out instead of everything shining equally.

import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

/** The bracelet's size, shared by the geometry and the scene that frames it. */
export const CHAIN = {
  /** Half-widths of the oval wrist shape, through the middle of the links: wider than it is deep. */
  radiusX: 1.34,
  radiusY: 1.06,
  /** An even number, so the alternating tilt pairs up on both sides of the clasp. */
  links: 26,
  /** Half the length and half the width of one oval link: short and wide, like a Cuban link. */
  linkLength: 0.245,
  linkWidth: 0.2,
  /** How far each link tips to either side, alternately, so neighbours sit over and under each other. */
  tilt: 0.08,
  /** How far each end of a link is turned, in opposite directions: the curb twist. */
  twist: 0.36,
  /** The box clasp: its length along the chain, its width across the wrist, its thickness. */
  clasp: { length: 0.64, width: 0.44, thickness: 0.13 },
};

/**
 * The bracelet's size for fitting it on screen: the oval's outer half-widths (links lie flat, so
 * they add only their thickness), and half the band's width across the wrist (the clasp is widest).
 */
export const CHAIN_EXTENT = {
  x: CHAIN.radiusX + 0.09,
  y: CHAIN.radiusY + 0.09,
  band: CHAIN.clasp.width / 2 + 0.02,
};

/**
 * One oval link: a stout bar bent into an oval, with a flattened six-sided section so it has a flat
 * top and bottom and bevelled edges, then twisted along its length. The oval lies in the XY plane
 * with its length along X; +Z is the face that looks out from the wrist. Carries a per-vertex tone
 * (the "color" attribute) that darkens the faces turned inwards and downwards.
 */
export function curbLink(detail: number): BufferGeometry {
  const segments = Math.max(36, Math.round(72 * detail));
  const sides = 6;
  // The bar is wider across the link than it is thick, like a pressed, diamond-cut link.
  const barWidth = 0.1;
  const barThickness = 0.062;

  // Corner points of the section at every step round the oval.
  const corners = new Float32Array(segments * sides * 3);
  let p = 0;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * TAU;
    const x = CHAIN.linkLength * Math.cos(t);
    const y = CHAIN.linkWidth * Math.sin(t);
    // The outward direction of the oval at this point (its normal), within the link's plane.
    const nx = CHAIN.linkWidth * Math.cos(t);
    const ny = CHAIN.linkLength * Math.sin(t);
    const length = Math.hypot(nx, ny);
    // The twist turns the link about its length, more towards each end and in opposite directions.
    const turn = CHAIN.twist * (x / CHAIN.linkLength);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    for (let j = 0; j < sides; j++) {
      const phi = (j / sides) * TAU;
      const across = barWidth * Math.cos(phi);
      const py = y + (ny / length) * across;
      const pz = barThickness * Math.sin(phi);
      corners[p++] = x + (nx / length) * across;
      corners[p++] = py * cos - pz * sin;
      corners[p++] = py * sin + pz * cos;
    }
  }

  // Each face is its own strip of vertices, so its shading is smooth along the link but the edge
  // to the next face stays sharp (shared vertices would round every edge off).
  const positions = new Float32Array(sides * segments * 2 * 3);
  const tones = new Float32Array(sides * segments * 2 * 3);
  const indices: number[] = [];
  let v = 0;
  for (let face = 0; face < sides; face++) {
    // The middle of this face round the section: up is out from the wrist, across is the link's outer edge.
    const middle = ((face + 0.5) / sides) * TAU;
    const tone = Math.min(1, Math.max(0.34, 0.58 + 0.38 * Math.sin(middle) + 0.1 * Math.cos(middle)));
    const start = v / 3;
    for (let i = 0; i < segments; i++) {
      for (const corner of [face, (face + 1) % sides]) {
        const from = (i * sides + corner) * 3;
        tones[v] = tone;
        tones[v + 1] = tone;
        tones[v + 2] = tone;
        positions[v++] = corners[from];
        positions[v++] = corners[from + 1];
        positions[v++] = corners[from + 2];
      }
    }
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const a = start + i * 2;
      const b = start + next * 2;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(tones, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The box clasp: a rounded block with a raised plate on top and a collar at each end where the
 * chain joins it. Same axes as a link: length along X, width across the wrist along Y, out along Z.
 */
export function boxClasp(): BufferGeometry {
  const { length, width, thickness } = CHAIN.clasp;
  const body = new RoundedBoxGeometry(length, width, thickness, 4, 0.035);
  const plate = new RoundedBoxGeometry(length * 0.7, width * 0.66, 0.05, 3, 0.018);
  plate.translate(0, 0, thickness / 2 + 0.012);
  const collars = [-1, 1].map((side) => {
    const collar = new RoundedBoxGeometry(0.085, width * 0.92, thickness * 1.15, 3, 0.025);
    collar.translate(side * (length / 2 + 0.03), 0, 0);
    return collar;
  });
  const parts = [body, plate, ...collars];
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Points round the oval at equal distances along it (not equal angles), so links space evenly. */
function ovalWalker() {
  const steps = 1440;
  const lengths = [0];
  let previousX = CHAIN.radiusX;
  let previousY = 0;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * TAU;
    const x = CHAIN.radiusX * Math.cos(t);
    const y = CHAIN.radiusY * Math.sin(t);
    lengths.push(lengths[i - 1] + Math.hypot(x - previousX, y - previousY));
    previousX = x;
    previousY = y;
  }
  const total = lengths[steps];
  /** The place `distance` along the oval, measured from its right-hand side, going anticlockwise. */
  const at = (distance: number) => {
    const target = ((distance % total) + total) % total;
    let low = 0;
    let high = steps;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (lengths[mid] < target) low = mid;
      else high = mid;
    }
    const t = ((low + (target - lengths[low]) / (lengths[high] - lengths[low] || 1)) / steps) * TAU;
    const along = new Vector3(-CHAIN.radiusX * Math.sin(t), CHAIN.radiusY * Math.cos(t), 0).normalize();
    const outward = new Vector3(CHAIN.radiusY * Math.cos(t), CHAIN.radiusX * Math.sin(t), 0).normalize();
    const position = new Vector3(CHAIN.radiusX * Math.cos(t), CHAIN.radiusY * Math.sin(t), 0);
    return { along, outward, position };
  };
  return { total, at };
}

const wrist = new Vector3(0, 0, 1);

/** X along the chain, Y across the wrist, Z out from the wrist, placed at that point of the oval. */
function placeAt(frame: { along: Vector3; outward: Vector3; position: Vector3 }) {
  return new Matrix4().makeBasis(frame.along, wrist, frame.outward).setPosition(frame.position);
}

/** Where the clasp sits: on the oval's right-hand side, before the bracelet turns. */
export function claspMatrix(): Matrix4 {
  return placeAt(ovalWalker().at(0));
}

/** Where each link sits: evenly along the oval from one side of the clasp round to the other. */
export function curbLinkMatrices(): Matrix4[] {
  const oval = ovalWalker();
  // Leave room for the clasp and its collars; the first and last links tuck under the collars.
  const gap = CHAIN.clasp.length / 2 + 0.12;
  const pitch = (oval.total - 2 * gap) / (CHAIN.links - 1);
  const tip = new Matrix4();
  return Array.from({ length: CHAIN.links }, (_, index) => {
    tip.makeRotationX(index % 2 === 0 ? CHAIN.tilt : -CHAIN.tilt);
    return placeAt(oval.at(gap + index * pitch)).multiply(tip);
  });
}
