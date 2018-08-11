
import { Node, removeNode, insertNode } from './list';
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

export function earcut(data: f64[], holeIndices: i32[], dim: i32 = 2): i32[] {
  var hasHoles  = holeIndices && holeIndices.length,
      outerLen  = hasHoles ? holeIndices[0] * dim : data.length,
      outerNode = linkedList(data, 0, outerLen, dim, true),
      triangles: i32[] = [];

  if (!outerNode) return triangles;

  var minX, minY, maxX, maxY, x, y, invSize;

  if (hasHoles) {
    outerNode = eliminateHoles(data, holeIndices, outerNode, dim);
  }

  // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
  if (data.length > 80 * dim) {
    minX = maxX = data[0];
    minY = maxY = data[1];

    for (let i = dim; i < outerLen; i += dim) {
      x    = data[i + 0];
      y    = data[i + 1];
      minX = Math.min(x, minX);
      minY = Math.min(x, minY);
      maxX = Math.max(x, maxX);
      maxY = Math.max(x, maxY);
    }

    // minX, minY and invSize are later used to transform coords into integers for z-order calculation
    invSize = Math.max(maxX - minX, maxY - minY);
    if (invSize != 0.0) invSize = 1.0 / invSize;
  }
  earcutLinked(outerNode, triangles, dim, minX, minY, invSize);
  return triangles;
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(data: f64[], start: i32, end: i32, dim: i32, clockwise: bool = false): Node {
  var last: Node;

  if (clockwise == (signedArea(data, start, end, dim) > 0)) {
    for (let i = start; i < end; i += dim) {
      last = insertNode(i, data[i], data[i + 1], last);
    }
  } else {
    for (let i = end - dim; i >= start; i -= dim) {
      last = insertNode(i, data[i], data[i + 1], last);
    }
  }

  if (last && last == last.next) {
    removeNode(last);
    last = last.next;
  }

  return last;
}


// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(data: f64[], holeIndices: i32[], outerNode: Node, dim: i32 = 2): Node {
  var holeLength = holeIndices.length;
  var dataLength = data.length;
  var queue      = new Array<Node>(holeLength);

  var start: i32, end: i32, list: Node;

  for (let i = 0; i < holeLength; ++i) {
    start = holeIndices[i] * dim;
    end   = i < holeLength - 1 ? holeIndices[i + 1] * dim : dataLength;
    list  = linkedList(data, start, end, dim);

    if (list === list.next) list.steiner = true;
    queue[i] = getLeftmost(list);
  }

  // TODO need TimSort implementation
  queue.sort((a: Node, b: Node): i32 => {
    var ax = a.x;
    var bx = b.x;
    return <i32>(ax > bx) - <i32>(ax < bx);
  });

  // process holes from left to right
  for (let i = 0; i < holeLength; ++i) {
    eliminateHole(queue[i], outerNode);
    outerNode = filterPoints(outerNode, outerNode.next);
  }

  return outerNode;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
@inline
function eliminateHole(hole: Node, outerNode: Node): void {
  outerNode = findHoleBridge(hole, outerNode);
  if (outerNode) {
    var b = splitPolygon(outerNode, hole);
    filterPoints(b, b.next);
  }
}

// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole: Node, outerNode: Node): Node | null {
  var p  = outerNode,
      hx = hole.x,
      hy = hole.y,
      qx =-Infinity,
      m: Node | null = null;

  // find a segment intersected by a ray from the hole's leftmost point to the left;
  // segment's endpoint with lesser x will be potential connection point
  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      let x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
      if (x <= hx && x > qx) {
        qx = x;
        if (x == hx) {
          if (hy == p.y)      return p;
          if (hy == p.next.y) return p.next;
        }
        m = p.x < p.next.x ? p : p.next;
      }
    }
    p = p.next;
  } while (p !== outerNode);

  if (!m) return null;
  if (hx == qx) return m.prev; // hole touches outer segment; pick lower endpoint

  // look for points inside the triangle of hole point, segment intersection and endpoint;
  // if there are no points found, we have a valid connection;
  // otherwise choose the point of the minimum angle with the ray as connection point

  var stop   = m,
      mx     = m.x,
      my     = m.y,
      tanMin = Infinity,
      tan    = 0.0;

  p = m.next;
  while (p !== stop) {
    if (
      hx >= p.x && p.x >= mx && hx != p.x &&
      pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)
    ) {
      tan = Math.abs(hy - p.y) / (hx - p.x); // tangential
      if ((tan < tanMin || (tan == tanMin && p.x > m.x)) && locallyInside(p, hole)) {
        m = p;
        tanMin = tan;
      }
    }

    p = p.next;
  }

  return m;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start: Node, triangles: i32[], dim: i32): Node {
  var p = start;
  do {
    let a = p.prev;
    let n = p.next;
    let b = p.next.next;

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
    p = p.next;
  } while (p !== start);

  return p;
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(start: Node, triangles: i32[], dim: i32, minX: f64, minY: f64, invSize: f64): void {
  // look for a valid diagonal that divides the polygon into two
  var a = start;
  do {
    let b = a.next.next;
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
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(ear: Node, triangles: i32[], dim: i32, minX: f64, minY: f64, invSize: f64 = 0.0, pass: i32 = 0): void {
  if (!ear) return;

  // interlink polygon nodes in z-order
  if (!pass && invSize != 0.0) {
    indexCurve(ear, minX, minY, invSize);
  }

  var stop = ear, prev: Node, next: Node;

  // iterate through ears, slicing them one by one
  while (ear.prev !== ear.next) {
    prev = ear.prev;
    next = ear.next;

    if (invSize != 0.0 ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      // cut off the triangle
      triangles.push(prev.index / dim);
      triangles.push(ear.index  / dim);
      triangles.push(next.index / dim);

      removeNode(ear);

      // skipping the next vertex leads to less sliver triangles
      ear = stop = next.next;
      continue;
    }

    ear = next;

    // if we looped through the whole remaining polygon and can't find any more ears
    if (ear === stop) {
      switch (pass) {
        // try filtering points and slicing again
        case 0: {
          earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);
          break;
        }
        // if this didn't work, try curing all small self-intersections locally
        case 1: {
          ear = cureLocalIntersections(ear, triangles, dim);
          earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);
          break;
        }
        // as a last resort, try splitting the remaining polygon into two
        case 2: {
          splitEarcut(ear, triangles, dim, minX, minY, invSize);
          break;
        }
      }

      break;
    }
  }
}
