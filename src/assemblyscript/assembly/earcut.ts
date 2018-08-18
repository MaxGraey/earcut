
import { Node, removeNode, insertNode } from './list';
import { sort } from './timsort';
import {
  isEar,
  isEarHashed,
  getLeftmost,
  indexCurve,
  signedArea,
  intersects,
  pointInTriangle,
  locallyInside,
  isValidDiagonal,
  splitPolygon,
  filterPoints,
} from './utils';

/*
@external("env", "logf")
declare function logf(value: f64): void;

@external("env", "logi")
declare function logi(value: u32): void;

@external("env", "logU32Array")
declare function logU32Array(arr: Array<u32>): void;
*/

export function earcutCore(data: f64[], holeIndices: u32[], dim: u32 = 2): u32[] {
  var hasHoles  = holeIndices ? holeIndices.length : 0,
      outerLen  = hasHoles ? unchecked(holeIndices[0]) * dim : data.length,
      outerNode = linkedList(data, 0, outerLen, dim, true);

  if (!outerNode) return null;

  if (hasHoles) {
    outerNode = eliminateHoles(data, holeIndices, outerNode as Node, dim);
  }

  var minX: f64, minY: f64;
  var maxX: f64, maxY: f64;
  var invSize: f64;

  // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
  if (data.length > 80 * dim) {
    minX = maxX = unchecked(data[0]);
    minY = maxY = unchecked(data[1]);

    for (let i: u32 = dim; i < outerLen; i += dim) {
      let x = unchecked(data[i + 0]);
      let y = unchecked(data[i + 1]);
      minX  = Math.min(x, minX);
      minY  = Math.min(y, minY);
      maxX  = Math.max(x, maxX);
      maxY  = Math.max(y, maxY);
    }

    // minX, minY and invSize are later used to transform coords into integers for z-order calculation
    invSize = Math.max(maxX - minX, maxY - minY);
    if (invSize != 0.0) invSize = 1.0 / invSize;
  }

  var triangles: u32[] = [];
  earcutLinked(outerNode as Node, triangles, dim, minX, minY, invSize);
  return triangles;
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(data: f64[], start: u32, end: u32, dim: u32, clockwise: bool = false): Node {
  var last: Node | null = null;

  if (clockwise == (signedArea(data, start, end, dim) > 0)) {
    for (let i: u32 = start; i < end; i += dim) {
      last = insertNode(i, unchecked(data[i]), unchecked(data[i + 1]), last);
    }
  } else {
    for (let i: i32 = end - dim; i >= <i32>start; i -= dim) {
      last = insertNode(i, unchecked(data[i]), unchecked(data[i + 1]), last);
    }
  }

  if (last !== null && <Node>last == <Node>last.next) {
    removeNode(last as Node);
    last = last.next;
  }

  return last as Node;
}


// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(data: f64[], holeIndices: u32[], outerNode: Node, dim: u32 = 2): Node {
  var holeLength = holeIndices.length;
  var dataLength = data.length as u32;
  var queue      = new Array<Node>(holeLength);

  var start: u32, end: u32, list: Node;

  for (let i = 0; i < holeLength; ++i) {
    start = unchecked(holeIndices[i]) * dim;
    end   = i < holeLength - 1 ? unchecked(holeIndices[i + 1]) * dim : dataLength;
    list  = linkedList(data, start, end, dim);

    if (list === list.next) list.steiner = true;
    queue[i] = unchecked(getLeftmost(list as Node));
  }

  sort<Node>(queue, (a: Node, b: Node): i32 => <i32>(a.x > b.x) - <i32>(a.x < b.x));

  // process holes from left to right
  for (let i = 0; i < holeLength; ++i) {
    eliminateHole(unchecked(queue[i]), outerNode);
    outerNode = filterPoints(outerNode, outerNode.next);
  }

  return outerNode;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
@inline
function eliminateHole(hole: Node, outerNode: Node): void {
  var outer = findHoleBridge(hole, outerNode);
  if (outer) {
    let b = splitPolygon(<Node>outer, hole);
    filterPoints(b, b.next);
  }
}


// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole: Node, outerNode: Node): Node | null {
  var p: Node | null = outerNode,
      hx = hole.x,
      hy = hole.y,
      qx =-Infinity,
      m: Node | null = null;

  // find a segment intersected by a ray from the hole's leftmost point to the left;
  // segment's endpoint with lesser x will be potential connection point
  do {
    let py  = p.y;
    let pny = p.next.y;
    if (hy <= py && hy >= pny && pny != py) {
      let px  = p.x;
      let pnx = p.next.x;
      let x = px + (hy - py) * (pnx - px) / (pny - py);
      if (x <= hx && x > qx) {
        qx = x;
        if (x == hx) {
          if (hy == py)  return p;
          if (hy == pny) return p.next;
        }
        m = select<Node | null>(p, p.next, px < pnx);
      }
    }
    p = p.next;
  } while (p !== outerNode);

  if (!m) return null;
  if (hx == qx) return m.prev; // hole touches outer segment; pick lower endpoint

  // look for points inside the triangle of hole point, segment intersection and endpoint;
  // if there are no points found, we have a valid connection;
  // otherwise choose the point of the minimum angle with the ray as connection point

  var stop   = <Node>m,
      mx     = m.x,
      my     = m.y,
      tanMin = Infinity,
      tan    = 0.0;

  p = m.next;
  while (p !== stop) {
    let px = p.x;
    if (hx >= px && px >= mx && hx != px) {
      let py = p.y;
      let a  = hy < my ? hx : qx;
      let c  = hy < my ? qx : hx;
      if (pointInTriangle(a, hy, mx, my, c, hy, px, py)) {
        tan = Math.abs(hy - py) / (hx - px); // tangential
        if ((tan < tanMin || ((tan == tanMin) && (px > m.x))) && locallyInside(p as Node, hole)) {
          m = p;
          tanMin = tan;
        }
      }
    }

    p = p.next;
  }

  return m;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start: Node, triangles: u32[], dim: u32): Node {
  var p = start;
  do {
    let a = <Node>p.prev;
    let n = <Node>p.next;
    let b = <Node>p.next.next;

    if (
      a != b &&
      intersects(a, p, n, b) &&
      locallyInside(a, b) &&
      locallyInside(b, a)
    ) {

      triangles.push(a.index / dim);
      triangles.push(p.index / dim);
      triangles.push(b.index / dim);

      // remove two nodes involved
      removeNode(p);
      removeNode(n);

      p = start = b;
    }
    p = <Node>p.next;
  } while (p !== start);

  return p;
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(start: Node, triangles: u32[], dim: u32, minX: f64, minY: f64, invSize: f64): void {
  // look for a valid diagonal that divides the polygon into two
  var a = start;
  do {
    let b = <Node>a.next.next;
    while (b !== a.prev) {
      if (a.index !== b.index && isValidDiagonal(a, b)) {
        // split the polygon in two by the diagonal
        let c = splitPolygon(a, b);

        // filter colinear points around the cuts
        a = filterPoints(a, a.next);
        c = filterPoints(c, c.next);

        // run earcut on each half
        earcutLinked(a, triangles, dim, minX, minY, invSize);
        earcutLinked(c, triangles, dim, minX, minY, invSize);
        return;
      }
      b = <Node>b.next;
    }
    a = <Node>a.next;
  } while (a !== start);
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(
  ear: Node | null,
  triangles: u32[],
  dim: u32,
  minX: f64, minY: f64,
  invSize: f64 = 0.0,
  pass: i32 = 0
): void {
  if (!ear) return;

  // interlink polygon nodes in z-order
  if (!pass && invSize != 0.0) {
    indexCurve(<Node>ear, minX, minY, invSize);
  }

  var stop = ear, prev: Node, next: Node;

  // iterate through ears, slicing them one by one
  while (<Node>ear.prev !== <Node>ear.next) {
    prev = <Node>ear.prev;
    next = <Node>ear.next;

    if (invSize ? isEarHashed(<Node>ear, minX, minY, invSize) : isEar(<Node>ear)) {
      // cut off the triangle
      triangles.push(prev.index / dim);
      triangles.push(ear.index  / dim);
      triangles.push(next.index / dim);

      removeNode(<Node>ear);

      // skipping the next vertex leads to less sliver triangles
      ear = stop = <Node>next.next;
      continue;
    }

    ear = next;

    // if we looped through the whole remaining polygon and can't find any more ears
    if (ear === stop) {
      switch (pass) {
        // try filtering points and slicing again
        case 0: {
          earcutLinked(filterPoints(<Node>ear), triangles, dim, minX, minY, invSize, 1);
          break;
        }
        // if this didn't work, try curing all small self-intersections locally
        case 1: {
          ear = cureLocalIntersections(<Node>ear, triangles, dim);
          earcutLinked(<Node>ear, triangles, dim, minX, minY, invSize, 2);
          break;
        }
        // as a last resort, try splitting the remaining polygon into two
        case 2: {
          splitEarcut(<Node>ear, triangles, dim, minX, minY, invSize);
          break;
        }
      }

      break;
    }
  }
}
