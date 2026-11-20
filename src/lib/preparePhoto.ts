/**
 * Turns a product photo into the shop's photo format before it uploads: a square, the piece centred with even space
 * around it, on pure white, as a small WebP (or JPEG where the browser can't make WebP). Square suits every frame on
 * the site, from the wide phone shop grid to the tall Considered Pieces cards, and white blends into the white cards.
 *
 * It only reshapes photos on a plain white background, which is how the shop's AI product photos are made. Any other
 * photo (a model, a table, a dark or shaded backdrop) keeps its shape, because there's no safe way to tell the piece
 * from its surroundings; it is only made smaller when that saves space.
 *
 * Everything happens in the browser; the photo is never sent anywhere else.
 */

export type PhotoOutcome =
  /** Squared and centred on pure white. */
  | 'squared'
  /** Its shape kept, because the background isn't plain white; made smaller when that saves space. */
  | 'kept'
  /** Left exactly as it was: the browser couldn't read it. */
  | 'unreadable';

export interface PreparedPhoto {
  file: File;
  outcome: PhotoOutcome;
}

/** The piece's longer side fills this share of the square, leaving even space around it. */
const PIECE_FILL = 0.8;
/** The square is at most this many pixels across; a smaller photo is never enlarged. */
const MAX_SIDE = 2048;
/** The photo is read at this size to find the piece, which is quick and ignores fine grain. */
const ANALYSIS_SIDE = 480;
/** How far a colour may stray from the background's and still count as background, not piece (0 to 255 per channel). */
const PIECE_TOLERANCE = 22;
/** A plain background: at least this share of the photo's border is within this distance of one colour. */
const PLAIN_TOLERANCE = 12;
const PLAIN_BORDER_SHARE = 0.92;
/** A background at least this light in every channel counts as white, and is lifted to pure white. */
const NEAR_WHITE = 232;

type Rgb = [number, number, number];
interface Box { left: number; top: number; right: number; bottom: number }

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let image: HTMLImageElement;
  try { image = await loadImage(file); } catch { return { file, outcome: 'unreadable' }; }
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return { file, outcome: 'unreadable' };

  // A small copy on white (so see-through PNG areas read as white) to find the background and the piece.
  const scale = Math.min(1, ANALYSIS_SIDE / Math.max(width, height));
  const small = drawOnCanvas(image, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  if (!small) return { file, outcome: 'unreadable' };
  const pixels = small.context.getImageData(0, 0, small.canvas.width, small.canvas.height);

  const background = borderBackground(pixels);
  const piece = background && background.every((channel) => channel >= NEAR_WHITE) ? pieceBounds(pixels, background) : null;
  if (!background || !piece) return keepShape(file, image);

  // The piece's box in the full-size photo, one analysis pixel larger on each side to be safe.
  const toFull = (value: number) => value / scale;
  const box: Box = {
    left: Math.max(0, toFull(piece.left - 1)),
    top: Math.max(0, toFull(piece.top - 1)),
    right: Math.min(width, toFull(piece.right + 2)),
    bottom: Math.min(height, toFull(piece.bottom + 2)),
  };
  const pieceSide = Math.max(box.right - box.left, box.bottom - box.top);
  const square = pieceSide / PIECE_FILL;
  const originX = (box.left + box.right) / 2 - square / 2;
  const originY = (box.top + box.bottom) / 2 - square / 2;
  const side = Math.max(1, Math.min(MAX_SIDE, Math.round(square)));
  const ratio = side / square;

  const output = drawOnCanvas(null, side, side);
  if (!output) return { file, outcome: 'unreadable' };
  const { canvas, context } = output;
  context.fillStyle = `rgb(${background.join(',')})`;
  context.fillRect(0, 0, side, side);
  // The photo, placed so the piece sits in the middle of the square.
  const photoX = -originX * ratio;
  const photoY = -originY * ratio;
  const photoW = width * ratio;
  const photoH = height * ratio;
  context.drawImage(image, photoX, photoY, photoW, photoH);
  // Where the photo stops short of the square, its edge melts into the background, so no line shows.
  featherEdges(context, background, { left: photoX, top: photoY, right: photoX + photoW, bottom: photoY + photoH },
    { left: photoX + box.left * ratio, top: photoY + box.top * ratio, right: photoX + box.right * ratio, bottom: photoY + box.bottom * ratio }, side);

  liftToWhite(context, side, background);

  const prepared = await encode(canvas);
  if (!prepared) return { file, outcome: 'unreadable' };
  return { file: renamed(file, prepared), outcome: 'squared' };
}

/** A photo that can't be squared keeps its shape; a smaller copy (at most MAX_SIDE across) replaces it only when that
 * saves at least a fifth, so a photo that's already light isn't re-saved for nothing. */
async function keepShape(file: File, image: HTMLImageElement): Promise<PreparedPhoto> {
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const copy = drawOnCanvas(image, Math.max(1, Math.round(image.naturalWidth * scale)), Math.max(1, Math.round(image.naturalHeight * scale)));
  const smaller = copy ? await encode(copy.canvas) : null;
  return { file: smaller && smaller.size < file.size * 0.8 ? renamed(file, smaller) : file, outcome: 'kept' };
}

function renamed(file: File, blob: Blob): File {
  const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  return image.decode().then(() => image).finally(() => URL.revokeObjectURL(url));
}

function drawOnCanvas(image: HTMLImageElement | null, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  if (image) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  }
  return { canvas, context };
}

const channelGap = (data: Uint8ClampedArray, index: number, colour: Rgb) =>
  Math.max(Math.abs(data[index] - colour[0]), Math.abs(data[index + 1] - colour[1]), Math.abs(data[index + 2] - colour[2]));

/** The colour around the photo's edge, or null when the edge isn't one plain colour. */
export function borderBackground({ data, width, height }: ImageData): Rgb | null {
  const ring = Math.max(2, Math.round(Math.min(width, height) * 0.015));
  const indexes: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (y < ring || y >= height - ring || x < ring || x >= width - ring) indexes.push((y * width + x) * 4);
    }
  }
  if (!indexes.length) return null;
  const median = (offset: number) => {
    const values = indexes.map((index) => data[index + offset]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  };
  const colour: Rgb = [median(0), median(1), median(2)];
  const plain = indexes.filter((index) => channelGap(data, index, colour) <= PLAIN_TOLERANCE).length;
  return plain / indexes.length >= PLAIN_BORDER_SHARE ? colour : null;
}

/** The box around everything that stands out from the background, ignoring stray specks. */
export function pieceBounds({ data, width, height }: ImageData, background: Rgb): Box | null {
  const rows = new Array<number>(height).fill(0);
  const columns = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (channelGap(data, (y * width + x) * 4, background) > PIECE_TOLERANCE) {
        rows[y] += 1;
        columns[x] += 1;
      }
    }
  }
  const rowNeeds = Math.max(2, Math.round(width * 0.004));
  const columnNeeds = Math.max(2, Math.round(height * 0.004));
  const top = rows.findIndex((count) => count >= rowNeeds);
  const left = columns.findIndex((count) => count >= columnNeeds);
  if (top < 0 || left < 0) return null;
  const bottom = height - 1 - [...rows].reverse().findIndex((count) => count >= rowNeeds);
  const right = width - 1 - [...columns].reverse().findIndex((count) => count >= columnNeeds);
  return { left, top, right, bottom };
}

/** Fades each photo edge that lies inside the square into the background, never reaching the piece. */
function featherEdges(context: CanvasRenderingContext2D, background: Rgb, photo: Box, piece: Box, side: number) {
  const solid = `rgba(${background.join(',')},1)`;
  const clear = `rgba(${background.join(',')},0)`;
  const reach = side * 0.04;
  const fade = (x0: number, y0: number, x1: number, y1: number, rect: [number, number, number, number]) => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, solid);
    gradient.addColorStop(1, clear);
    context.fillStyle = gradient;
    context.fillRect(...rect);
  };
  if (photo.top > 0) {
    const size = Math.min(reach, piece.top - photo.top);
    if (size > 1) fade(0, photo.top, 0, photo.top + size, [photo.left, photo.top, photo.right - photo.left, size]);
  }
  if (photo.bottom < side) {
    const size = Math.min(reach, photo.bottom - piece.bottom);
    if (size > 1) fade(0, photo.bottom, 0, photo.bottom - size, [photo.left, photo.bottom - size, photo.right - photo.left, size]);
  }
  if (photo.left > 0) {
    const size = Math.min(reach, piece.left - photo.left);
    if (size > 1) fade(photo.left, 0, photo.left + size, 0, [photo.left, photo.top, size, photo.bottom - photo.top]);
  }
  if (photo.right < side) {
    const size = Math.min(reach, photo.right - piece.right);
    if (size > 1) fade(photo.right, 0, photo.right - size, 0, [photo.right - size, photo.top, size, photo.bottom - photo.top]);
  }
}

/** Brightens each channel so the nearly white background becomes pure white, matching the shop's white cards. */
function liftToWhite(context: CanvasRenderingContext2D, side: number, background: Rgb) {
  const image = context.getImageData(0, 0, side, side);
  const { data } = image;
  const gains = background.map((channel) => 255 / Math.max(1, channel));
  for (let index = 0; index < data.length; index += 4) {
    data[index] = data[index] * gains[0];
    data[index + 1] = data[index + 1] * gains[1];
    data[index + 2] = data[index + 2] * gains[2];
  }
  context.putImageData(image, 0, 0);
}

function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Browsers that can't make WebP hand back a PNG instead; those get a JPEG, which is far smaller.
  return toBlob('image/webp', 0.9).then((blob) => (blob && blob.type === 'image/webp' ? blob : toBlob('image/jpeg', 0.92)));
}
