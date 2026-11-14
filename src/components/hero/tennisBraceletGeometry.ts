// SILVORA | The hero's double-row tennis bracelet with a slider clasp, built from code (no downloaded model).
//
// The bracelet lies in the X–Z plane and its band runs along Y. Two strands of round stones run round the
// front, side by side at the ends and crossing once at the front, each stone in its own open square four-prong
// box setting and facing outwards, as on the real bracelet. Each end of the rows closes in a rectangular cap; from each cap a fine box chain runs
// into a round slider bead at the back, and on through it to a tail ending in a polished ball.
// Units: about 1 = 2 cm.

import {
  BufferGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, LatheGeometry, Matrix4,
  Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** The loop: an oval, about half as wide again as it is deep. */
const LOOP = { a: 1.17, b: 0.79 };
/** The stones run from the right end, round the front, to the left end (angles on the oval). */
const ROWS_FROM = -0.36;
const ROWS_TO = Math.PI + 0.36;
/** Centre to centre across the band (the two rows) and along each row. */
const ROW_GAP = 0.108;
const PITCH = 0.104;
/** A stone's girdle radius, and half the width of its square box setting. */
const STONE_R = 0.043;
const BOX = 0.049;

const UP = new Vector3(0, 1, 0);
/** Shapes made of separate triangles, ready to merge (Three warns if one already is). */
const flat = (geometry: BufferGeometry) => (geometry.index ? geometry.toNonIndexed() : geometry);

const ovalPoint = (angle: number, y = 0) => new Vector3(LOOP.a * Math.cos(angle), y, LOOP.b * Math.sin(angle));
const ovalTangent = (angle: number) => new Vector3(-LOOP.a * Math.sin(angle), 0, LOOP.b * Math.cos(angle)).normalize();
/** Outwards from the middle of the loop, square to the oval. */
const ovalOutward = (angle: number) => new Vector3(LOOP.b * Math.cos(angle), 0, LOOP.a * Math.sin(angle)).normalize();

/** A transform whose local X follows `along`, local Y points along `up`, and local Z completes the set. */
function frame(position: Vector3, along: Vector3, up: Vector3, scale = 1): Matrix4 {
  const x = along.clone().normalize();
  const z = new Vector3().crossVectors(x, up).normalize();
  const y = new Vector3().crossVectors(z, x).normalize();
  return new Matrix4().makeBasis(x, y, z).scale(new Vector3(scale, scale, scale)).setPosition(position);
}

/** Angles along the oval at equal distances, `count` of them, between two angles. */
function evenAngles(from: number, to: number, count: number): number[] {
  const samples = 2000;
  const lengths = [0];
  let previous = ovalPoint(from);
  for (let i = 1; i <= samples; i++) {
    const point = ovalPoint(from + ((to - from) * i) / samples);
    lengths.push(lengths[i - 1] + point.distanceTo(previous));
    previous = point;
  }
  const total = lengths[samples];
  const angles: number[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = ((k + 0.5) / count) * total;
    while (j < samples && lengths[j + 1] < target) j++;
    const share = (target - lengths[j]) / Math.max(1e-9, lengths[j + 1] - lengths[j]);
    angles.push(from + ((to - from) * (j + share)) / samples);
  }
  return angles;
}

function arcLength(from: number, to: number): number {
  let length = 0;
  let previous = ovalPoint(from);
  for (let i = 1; i <= 800; i++) {
    const point = ovalPoint(from + ((to - from) * i) / 800);
    length += point.distanceTo(previous);
    previous = point;
  }
  return length;
}

const STONES_PER_ROW = Math.floor(arcLength(ROWS_FROM, ROWS_TO) / PITCH);

/* ---------- Stones ---------- */

/**
 * A round brilliant cut: an eight-sided table, a ring of crown facets down to a thin girdle, and a pavilion
 * narrowing to a point. Every facet is flat, so each one catches the light on its own and the stone sparkles.
 */
export function brilliantStone(radius = STONE_R): BufferGeometry {
  const crown = radius * 0.34;
  const table = radius * 0.56;
  const girdle = radius * 0.04;
  const pavilion = radius * 0.9;
  const ring = (count: number, r: number, y: number, turn = 0) =>
    Array.from({ length: count }, (_, i) => {
      const angle = turn + (i / count) * Math.PI * 2;
      return new Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    });
  const tableRing = ring(8, table, crown);
  const starRing = ring(8, radius * 0.8, crown * 0.52, Math.PI / 8);
  const girdleTop = ring(16, radius, 0);
  const girdleBottom = ring(16, radius, -girdle);
  const pavilionMid = ring(8, radius * 0.5, -pavilion * 0.52, Math.PI / 8);
  const top = new Vector3(0, crown, 0);
  const culet = new Vector3(0, -pavilion, 0);
  const middle = new Vector3(0, -pavilion * 0.2, 0);
  const positions: number[] = [];
  // Each facet faces out from the middle of the stone, whatever order its corners come in.
  const facet = (a: Vector3, b: Vector3, c: Vector3) => {
    const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    const centre = new Vector3().add(a).add(b).add(c).divideScalar(3);
    const [p, q] = normal.dot(centre.sub(middle)) < 0 ? [c, b] : [b, c];
    positions.push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
  };
  const at = <T,>(list: T[], i: number) => list[(i + list.length) % list.length];
  for (let i = 0; i < 8; i++) {
    facet(top, tableRing[i], at(tableRing, i + 1));
    // Star facets between the table and the upper girdle ring, then the girdle facets below them.
    facet(tableRing[i], at(tableRing, i + 1), starRing[i]);
    facet(tableRing[i], starRing[i], girdleTop[2 * i + 1]);
    facet(at(tableRing, i + 1), at(girdleTop, 2 * i + 1), starRing[i]);
    facet(tableRing[i], at(starRing, i - 1), girdleTop[2 * i]);
    facet(tableRing[i], girdleTop[2 * i], at(starRing, i - 1));
    facet(starRing[i], girdleTop[2 * i + 1], at(girdleTop, 2 * i + 2));
    facet(starRing[i], at(girdleTop, 2 * i + 2), at(tableRing, i + 1));
    facet(at(starRing, i - 1), girdleTop[2 * i], girdleTop[(2 * i + 15) % 16]);
  }
  for (let i = 0; i < 16; i++) {
    facet(girdleTop[i], at(girdleTop, i + 1), girdleBottom[i]);
    facet(at(girdleTop, i + 1), at(girdleBottom, i + 1), girdleBottom[i]);
  }
  for (let i = 0; i < 8; i++) {
    // Pavilion: main facets down to the culet, with half facets between them at the girdle.
    facet(girdleBottom[2 * i], at(girdleBottom, 2 * i + 1), pavilionMid[i]);
    facet(at(girdleBottom, 2 * i + 1), at(girdleBottom, 2 * i + 2), pavilionMid[i]);
    facet(pavilionMid[i], at(girdleBottom, 2 * i + 2), at(pavilionMid, i + 1));
    facet(pavilionMid[i], at(pavilionMid, i + 1), culet);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/* ---------- Settings ---------- */

/**
 * One square basket setting, as a jeweller makes it: a thin square collar just under the stone's girdle for the
 * stone to rest on, a smaller collar at the bottom, a post at each corner joining them (leaving open windows on
 * every side and underneath), and from the top of each post a claw reaching in over the edge of the stone.
 * The stone sits with its girdle at y = 0.
 */
export function boxSetting(detail = 1): BufferGeometry {
  const corner = 0.007;
  const square = (half: number) => {
    const shape = new Shape();
    shape.moveTo(-half + corner, -half);
    shape.lineTo(half - corner, -half);
    shape.quadraticCurveTo(half, -half, half, -half + corner);
    shape.lineTo(half, half - corner);
    shape.quadraticCurveTo(half, half, half - corner, half);
    shape.lineTo(-half + corner, half);
    shape.quadraticCurveTo(-half, half, -half, half - corner);
    shape.lineTo(-half, -half + corner);
    shape.quadraticCurveTo(-half, -half, -half + corner, -half);
    return shape;
  };
  const bevel = { bevelEnabled: true, bevelSegments: detail > 0.7 ? 2 : 1, curveSegments: 3 };
  /** A square frame, `height` tall, lying flat with its top at `top`. */
  const collar = (outer: number, inner: number, top: number, height: number) => {
    const shape = square(outer);
    shape.holes.push(square(inner));
    const ring = new ExtrudeGeometry(shape, { ...bevel, depth: height, bevelThickness: 0.0016, bevelSize: 0.0014 });
    // Extruded along Z; turn it to lie flat (its height along Y), with its top where asked.
    ring.rotateX(-Math.PI / 2);
    ring.translate(0, top - height, 0);
    return flat(ring);
  };
  const TOP = -0.0035;
  const BOTTOM = -0.052;
  const parts: BufferGeometry[] = [
    // Thin polished walls all round, their top rim just under the stone's girdle, so the stone sits proud.
    collar(BOX, BOX - 0.0075, TOP, TOP - BOTTOM),
    // A lip at the bottom, leaving a square window under the stone, as on the back of the real bracelet.
    collar(BOX - 0.002, BOX - 0.024, BOTTOM + 0.0055, 0.0055),
  ];
  const segments = detail > 0.7 ? 10 : 6;
  const post = BOX - 0.0045;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    // A rounded rib down each corner, standing just proud of the walls, which the claw grows out of.
    const upright = new RoundedBoxGeometry(0.012, TOP - BOTTOM, 0.012, 2, 0.004);
    upright.translate(sx * post, (TOP + BOTTOM) / 2, sz * post);
    // The claw: from the top of the post, in over the edge of the stone's crown, ending in a rounded tip.
    const from = new Vector3(sx * post, TOP - 0.002, sz * post);
    const reach = (STONE_R * 0.94) / Math.SQRT2;
    const to = new Vector3(sx * reach, 0.0068, sz * reach);
    const span = to.clone().sub(from);
    const claw = new CylinderGeometry(0.0056, 0.0066, span.length(), segments, 1);
    claw.applyQuaternion(new Quaternion().setFromUnitVectors(UP, span.clone().normalize()));
    claw.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    const tip = new SphereGeometry(0.0064, segments, Math.max(4, segments - 4));
    tip.translate(to.x, to.y, to.z);
    const knuckle = new SphereGeometry(0.0066, segments, Math.max(4, segments - 4));
    knuckle.translate(from.x, from.y, from.z);
    parts.push(flat(upright), flat(claw), flat(tip), flat(knuckle));
  }
  for (const part of parts) {
    part.deleteAttribute('uv');
  }
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('Could not build the box setting.');
  merged.computeVertexNormals();
  return merged;
}

/* ---------- The two strands ---------- */

/**
 * As in the photographs, the rows are two separate strands: side by side where they meet the end caps, a little
 * apart along the sides, and crossing once at the front, where one strand passes over the other.
 * Positions along the rows run from 0 at the right-hand end cap to 1 at the left.
 */
const CROSS_AT = 0.42;
/** How far along the rows the strands take to change sides. */
const CROSS_SPAN = 0.1;
/** Half the distance between the strands' centres: at the end caps, and along the sides. */
const STRANDS_AT_ENDS = ROW_GAP / 2;
const STRANDS_APART = 0.082;
/** How far the upper strand rises over the other where they cross, enough to clear its prongs. */
const CROSS_LIFT = 0.095;

/** Smooth 0-to-1 step between two positions (or 1-to-0 when the first is the larger). */
const ease = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** The centre line of one strand (side -1 or 1) at an angle on the oval. */
function strandPoint(angle: number, side: number): Vector3 {
  const s = (angle - ROWS_FROM) / (ROWS_TO - ROWS_FROM);
  const spread = STRANDS_AT_ENDS + (STRANDS_APART - STRANDS_AT_ENDS) * ease(0, 0.22, s) * ease(1, 0.78, s);
  const swap = Math.cos(Math.PI * ease(CROSS_AT - CROSS_SPAN, CROSS_AT + CROSS_SPAN, s));
  const over = side > 0 ? CROSS_LIFT * Math.exp(-(((s - CROSS_AT) / (CROSS_SPAN * 0.75)) ** 2)) : 0;
  return ovalPoint(angle, side * spread * swap).addScaledVector(ovalOutward(angle), over);
}

/** Where each stone and its setting sit: one after another along each strand, facing outwards. */
export function settingMatrices(): Matrix4[] {
  const matrices: Matrix4[] = [];
  const step = 0.002;
  for (const angle of evenAngles(ROWS_FROM, ROWS_TO, STONES_PER_ROW)) {
    for (const side of [-1, 1]) {
      // Follow the strand itself, so settings tip with it as it drifts apart and rises over the other.
      const along = strandPoint(angle + step, side).sub(strandPoint(angle - step, side));
      matrices.push(frame(strandPoint(angle, side), along, ovalOutward(angle)));
    }
  }
  return matrices;
}

export const STONE_COUNT = STONES_PER_ROW * 2;

/* ---------- End caps, slider and balls ---------- */

/** The rectangular cap closing each end of the two rows, where the chain is fixed. */
export function endCap(): BufferGeometry {
  // Along the row (local X), outwards (local Y, its top level with the stones' girdles) and across both rows (local Z).
  const cap = new RoundedBoxGeometry(0.058, 0.062, ROW_GAP + 2 * BOX + 0.01, 3, 0.014);
  cap.translate(0, -0.031, 0);
  return cap;
}

export function endCapMatrices(): Matrix4[] {
  // Just beyond the last setting at each end.
  return [ROWS_FROM - 0.012, ROWS_TO + 0.012].map((angle) => frame(ovalPoint(angle), ovalTangent(angle), ovalOutward(angle)));
}

/** The round slider bead the two chains pass through: a polished, slightly barrel-shaped bead. */
export function sliderBead(detail = 1): BufferGeometry {
  const profile = [
    [0.018, -0.068], [0.04, -0.066], [0.058, -0.052], [0.068, -0.026], [0.071, 0], [0.068, 0.026], [0.058, 0.052], [0.04, 0.066], [0.018, 0.068],
  ].map(([x, y]) => new Vector2(x, y));
  const bead = new LatheGeometry(profile, detail > 0.7 ? 56 : 32);
  bead.computeVertexNormals();
  return bead;
}

/** A polished ball with a short collar where the chain goes in. */
export function ballEnd(detail = 1): BufferGeometry {
  const ball = flat(new SphereGeometry(0.048, detail > 0.7 ? 40 : 24, detail > 0.7 ? 28 : 16));
  const collar = flat(new CylinderGeometry(0.014, 0.017, 0.03, 16));
  collar.translate(0, 0.058, 0);
  for (const part of [ball, collar]) part.deleteAttribute('uv');
  const merged = mergeGeometries([ball, collar], false);
  if (!merged) throw new Error('Could not build the ball end.');
  merged.computeVertexNormals();
  return merged;
}

/* ---------- Box chain ---------- */

/** One box-chain link: a small square ring with a square section, stretched a little along the chain. */
export function boxLink(): BufferGeometry {
  // A torus with four sides is a diamond; turn it square to the chain and stretch it a little along it.
  const link = new TorusGeometry(0.0118, 0.0034, 4, 4);
  link.rotateZ(Math.PI / 4);
  link.scale(1.2, 1, 1);
  const square = flat(link);
  square.computeVertexNormals();
  return square;
}

const LINK_STEP = 0.0205;

/** The slider sits at the back of the loop; the chains leave it towards the tails along this direction. */
const SLIDER = new Vector3(0.03, 0, -LOOP.b - 0.02);
const SLIDER_AXIS = new Vector3(0.32, 0.04, -1).normalize();

function chainCurves() {
  const capRight = ovalPoint(ROWS_FROM - 0.03);
  const capLeft = ovalPoint(ROWS_TO + 0.03);
  const into = SLIDER.clone().addScaledVector(SLIDER_AXIS, -0.075);
  const outOf = SLIDER.clone().addScaledVector(SLIDER_AXIS, 0.075);
  // The chains run up the back of the loop into the slider, and on out of it as two tails.
  const tailA = SLIDER.clone().add(new Vector3(0.1, 0.06, -0.5));
  const tailB = SLIDER.clone().add(new Vector3(0.38, 0.03, -0.39));
  const right = new CatmullRomCurve3([
    capRight, ovalPoint(-0.85).multiplyScalar(0.985), ovalPoint(-1.25).multiplyScalar(0.96), into, SLIDER.clone(), outOf,
    outOf.clone().lerp(tailB, 0.5).add(new Vector3(0, 0.015, 0)), tailB,
  ], false, 'centripetal');
  const left = new CatmullRomCurve3([
    capLeft, ovalPoint(Math.PI + 0.85).multiplyScalar(0.985), ovalPoint(Math.PI + 1.25).multiplyScalar(0.96), into, SLIDER.clone(), outOf,
    outOf.clone().lerp(tailA, 0.5).add(new Vector3(0, 0.02, 0)), tailA,
  ], false, 'centripetal');
  return { right, left, tailA, tailB };
}

/** Every link of both chains, alternately turned a quarter turn about the chain, as box chain is made. */
export function chainLinkMatrices(): Matrix4[] {
  const { right, left } = chainCurves();
  const matrices: Matrix4[] = [];
  for (const curve of [right, left]) {
    const count = Math.floor(curve.getLength() / LINK_STEP);
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const along = curve.getTangentAt(u);
      const side = Math.abs(along.dot(UP)) > 0.95 ? new Vector3(1, 0, 0) : UP;
      const matrix = frame(curve.getPointAt(u), along, side);
      if (i % 2 === 1) matrix.multiply(new Matrix4().makeRotationX(Math.PI / 2));
      matrices.push(matrix);
    }
  }
  return matrices;
}

export const CHAIN_LINKS = chainLinkMatrices().length;

/** The slider bead stands along the chains where they pass through it; the balls hang at the tail ends. */
export function sliderMatrix(): Matrix4 {
  return new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(UP, SLIDER_AXIS)).setPosition(SLIDER);
}

export function ballMatrices(): Matrix4[] {
  const { right, left, tailA, tailB } = chainCurves();
  return [[right, tailB], [left, tailA]].map(([curve, end]) => {
    const direction = (curve as CatmullRomCurve3).getTangentAt(1);
    // The collar points back along the chain; the ball sits just past the last link.
    const rotation = new Quaternion().setFromUnitVectors(UP, direction.clone().negate());
    return new Matrix4().makeRotationFromQuaternion(rotation)
      .setPosition((end as Vector3).clone().addScaledVector(direction, 0.05));
  });
}

/** Half the bracelet's size across its widest direction, including the tails, for fitting it on screen. */
export const BRACELET_REACH = 1.27;
/** The middle of the bracelet as it is seen, with the tails, so it turns about its visual centre. */
export const VISUAL_CENTRE = new Vector3(0.02, 0, -0.24);
