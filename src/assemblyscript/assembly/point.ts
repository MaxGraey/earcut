export interface IPoint {
  x: f64;
  y: f64;
}

export class Point implements IPoint {
  constructor(
    public x: f64 = 0,
    public y: f64 = 0
  ) {}

  @inline @operator('==')
  static eq(a: Point, b: Point): bool {
    return a.x == b.x && a.y == b.y;
  }
}
