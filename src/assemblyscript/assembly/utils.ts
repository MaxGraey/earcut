
import { Node, removeNode, sortLinked }  from './list';
// import { Point } from './point';

@inline // z-order of a point given coords and inverse of the longer side of data bbox
export function zOrder32(px: f64, py: f64, minX: f64, minY: f64, invSize: f64): u32 {
  // coords are transformed into non-negative 15-bit integer range
  var x = (32767.0 * (px - minX) * invSize) as u32;
  var y = (32767.0 * (py - minY) * invSize) as u32;

  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

@inline // check if a point lies within a convex triangle
export function pointInTriangle(ax: f64, ay: f64, bx: f64, by: f64, cx: f64, cy: f64, px: f64, py: f64): bool {
  return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
         (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
         (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
}

@inline // signed area of a triangle
export function area(p: Node, q: Node, r: Node): f64 {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

@inline
export function signedArea(data: f64[], start: i32, end: i32, dim: i32): f64 {
  var sum = 0.0;
  for (let i = start, j = end - dim; i < end; i += dim) {
    sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
    j = i;
  }
  return sum;
}

@inline // check if two segments intersect
export function intersects(p1: Node, q1: Node, p2: Node, q2: Node): bool {
  if ((p1 == q1 && p2 == q2) || (p1 == q2 && p2 == q1)) return true;
  return area(p1, q1, p2) > 0 != area(p1, q1, q2) > 0 &&
         area(p2, q2, p1) > 0 != area(p2, q2, q1) > 0;
}

@inline // check if a polygon diagonal is locally inside the polygon
export function locallyInside(a: Node, b: Node) {
  var ap = a.prev;
  var an = a.next;
  return area(ap, a, an) < 0 ?
      area(a, b, an) >= 0 && area(a, ap, b) >= 0 :
      area(a, b, ap) <  0 || area(a, an, b) <  0;
}

@inline // check if the middle point of a polygon diagonal is inside the polygon
export function middleInside(a: Node, b: Node): bool {
  var p = a,
      inside = false,
      cx = (a.x + b.x) * 0.5,
      cy = (a.y + b.y) * 0.5;
  do {
    let nextP = p.next;

    let px  = p.x;
    let py  = p.y;
    let pnx = nextP.x;
    let pny = nextP.y;
    if (
      pny != py && ((py > cy) != (pny > cy)) &&
      (cx < (pnx - px) * (cy - py) / (pny - py) + px)
    ) {
      inside = !inside;
    }
    p = nextP;
  } while (p !== a);

  return inside;
}

@inline // check if a polygon diagonal intersects any polygon segments
export function intersectsPolygon(a: Node, b: Node): bool {
  var p = a;
  var indexA = a.index;
  var indexB = b.index;
  do {
    let nextP     = p.next;
    let currIndex = p.index;
    let nextIndex = nextP.index;
    if (
      currIndex != indexA && nextIndex != indexA &&
      currIndex != indexB && nextIndex != indexB &&
      intersects(p, nextP, a, b)
    ) return true;
    p = nextP;
  } while (p !== a);

  return false;
}

@inline // check if a diagonal between two polygon nodes is valid (lies in polygon interior)
export function isValidDiagonal(a: Node, b: Node): bool {
  var indexB = b.index;
  return (
    a.next.index != indexB &&
    a.prev.index != indexB &&
    !intersectsPolygon(a, b) &&
    locallyInside(a, b) &&
    locallyInside(b, a) &&
    middleInside(a, b)
  );
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
@inline
export function splitPolygon(a: Node, b: Node): Node {
  var a2 = new Node(a.index, a.x, a.y),
      b2 = new Node(b.index, b.x, b.y),
      an = a.next,
      bp = b.prev;

  a.next = b;
  b.prev = a;

  a2.next = an;
  an.prev = a2;

  b2.next = a2;
  a2.prev = b2;

  bp.next = b2;
  b2.prev = bp;

  return b2;
}

@inline // find the leftmost node of a polygon ring
export function getLeftmost(start: Node): Node {
  var p = start, leftmost = start;
  do {
    if (p.x < leftmost.x) leftmost = p;
    p = p.next;
  } while (p !== start);
  return leftmost;
}

@inline // interlink polygon nodes in z-order
export function indexCurve(start: Node, minX: f64, minY: f64, invSize: f64): void {
  var p = start;
  do {
    if (!p.z) p.z = zOrder32(p.x, p.y, minX, minY, invSize);
    p.prevZ = p.prev;
    p.nextZ = p.next;
    p       = p.next;
  } while (p !== start);

  p.prevZ.nextZ = null;
  p.prevZ       = null;

  sortLinked(p);
}

// check whether a polygon node forms a valid ear with adjacent nodes
export function isEar(ear: Node): bool {
  var a = ear.prev,
      b = ear,
      c = ear.next;

  if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

  // now make sure we don't have other points inside the potential ear
  var p = ear.next.next;
  while (p != ear.prev) {
    if (
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    ) return false;
    p = p.next;
  }

  return true;
}


export function isEarHashed(ear: Node, minX: f64, minY: f64, invSize: f64): bool {
  var a = ear.prev,
      b = ear,
      c = ear.next;

  if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

  // triangle bbox; min & max are calculated like this for speed
  var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
      minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
      maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
      maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

  // z-order range for the current triangle bbox;
  var minZ = zOrder32(minTX, minTY, minX, minY, invSize),
      maxZ = zOrder32(maxTX, maxTY, minX, minY, invSize);

  var p = ear.prevZ,
      n = ear.nextZ;

  // look for points inside the triangle in both directions
  while (p && p.z >= minZ && n && n.z <= maxZ) {
    if (
      p !== ear.prev && p !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    ) return false;
    p = p.prevZ;

    if (
      n !== ear.prev && n !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    ) return false;
    n = n.nextZ;
  }

  // look for remaining points in decreasing z-order
  while (p && p.z >= minZ) {
    if (
      p !== ear.prev && p !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
      area(p.prev, p, p.next) >= 0
    ) return false;
    p = p.prevZ;
  }

  // look for remaining points in increasing z-order
  while (n && n.z <= maxZ) {
    if (
      n !== ear.prev && n !== ear.next &&
      pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
      area(n.prev, n, n.next) >= 0
    ) return false;
    n = n.nextZ;
  }

  return true;
}

// eliminate colinear or duplicate points
export function filterPoints(start: Node, end: Node | null = null): Node {
  if (!start) return start;
  if (!end)   end = start;

  var p = start, again = false;
  do {
    again = false;

    if (!p.steiner && ((p == p.next) || area(p.prev, p, p.next) == 0.0)) {
      removeNode(p);
      p = end = p.prev;
      if (p === p.next) break;
      again = true;
    } else {
      p = p.next;
    }
  } while (again || p !== end);
  return end;
}
