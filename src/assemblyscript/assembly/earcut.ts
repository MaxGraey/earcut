
import { Node, removeNode, insertNode } from './list';
import {
  isEar,
  isEarHashed,
  getLeftmost,
  signedArea,
  splitPolygon,
  filterPoints,
} from './utils';

export function earcut(data: f64[], holeIndices: i32[], dim: i32 = 2) {
  var hasHoles  = holeIndices && holeIndices.length,
      outerLen  = hasHoles ? holeIndices[0] * dim : data.length,
      outerNode = linkedList(data, 0, outerLen, dim, true),
      triangles = [];

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
    invSize = invSize != 0 ? 1.0 / invSize : 0.0;
  }
  // earcutLinked(outerNode, triangles, dim, minX, minY, invSize);
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
  var queue = new Array<Node>(32), start: i32, end: i32, list: Node;
  var dataLength = data.length;

  for (let i = 0, len = holeIndices.length; i < len; ++i) {
    start = holeIndices[i] * dim;
    end   = i < len - 1 ? holeIndices[i + 1] * dim : dataLength;
    list  = linkedList(data, start, end, dim);

    if (list === list.next) list.steiner = true;
    queue.push(getLeftmost(list));
  }

  // TODO need TimSort implementation
  queue.sort((a: Node, b: Node): i32 => {
    var ax = a.x;
    var bx = b.x;
    return <i32>(ax > bx) - <i32>(ax < bx);
  });

  // process holes from left to right
  for (let i = 0, len = queue.length; i < len; ++i) {
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

function findHoleBridge(hole: Node, outerNode: Node): Node {
  // TODO
  return null;
  //
}
