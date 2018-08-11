import { IPoint } from './point';

export class Node implements IPoint {
  prev:    Node | null = null  // previous vertex nodes in a polygon ring
  next:    Node | null = null  // next vertex nodes in a polygon ring
  prevZ:   Node | null = null  // previous nodes in z-order
  nextZ:   Node | null = null  // next nodes in z-order
  steiner: bool        = false // indicates whether this is a steiner point
  z:       u32                 // z-order curve value

  constructor(
    public index: i32, // vertex index in coordinates array
    public x:     f64, // vertex coordinate "x"
    public y:     f64, // vertex coordinate "y"
  ) {}

  @inline @operator('==')
  equals(other: Node): bool {
    return this === other || (this.x == other.x && this.y == other.y);
  }

  @inline @operator('!=')
  notEquals(other: Node): bool {
    return !this.equals(other);
  }
}

@inline
export function insertNode(index: i32, x: f64, y: f64, last: bool = false): Node {
  var node = new Node(index, x, y);
  if (!last) {
    node.prev = node;
    node.next = node;
  } else {
    node.next = last.next;
    node.prev = last;
    last.next.prev = node;
    last.next      = node;
  }
  return node;
}

@inline
export function removeNode(node: Node): void {
  var prevZ = node.prevZ;
  var nextZ = node.nextZ;
  var next  = node.next;
  var prev  = node.prev;
  next.prev = prev;
  prev.next = next;
  if (prevZ) prevZ.nextZ = nextZ;
  if (nextZ) nextZ.prevZ = prevZ;
}

// Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
export function sortLinked(list: Node): void {
  var p: Node, q: Node, e: Node, tail: Node;
  var numMerges: i32, pSize: i32, qSize: i32;
  var inSize = 1;

  do {
    p    = list;
    list = null;
    tail = null;
    numMerges = 0;

    while (p) {
      ++numMerges;
      q = p;
      pSize = 0;
      for (let i = 0; i < inSize; ++i) {
        ++pSize;
        q = q.nextZ;
        if (!q) break;
      }
      qSize = inSize;

      while (pSize > 0 || (q && qSize > 0)) {
        if (pSize && (!qSize || !q || p.z <= q.z)) {
          e = p;
          p = p.nextZ;
          --pSize;
        } else {
          e = q;
          q = q.nextZ;
          --qSize;
        }

        if (tail) tail.nextZ = e;
        else list = e;

        e.prevZ = tail;
        tail = e;
      }
      p = q;
    }

    tail.nextZ = null;
    inSize <<= 1;
  } while (numMerges > 1);
}
