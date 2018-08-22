import 'allocator/arena';

import { earcutCore } from './earcut';

// var inputArray1: Array<f64>;
// var inputArray2: Array<u32>;

export function allocF64Array(length: i32): f64[] {
  return new Array<f64>(length);
}

export function allocU32Array(length: i32): u32[] {
  return new Array<u32>(length);
}

export function earcut(data: Array<f64>, holes: Array<u32>): u32[] {
  var res = earcutCore(data, holes);
  return res;
}
