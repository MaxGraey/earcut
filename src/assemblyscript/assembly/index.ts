import 'allocator/tlsf';

import { earcutCore } from './earcut';

export function allocF64Array(length: i32): f64[] {
  return new Array<f64>(length);
}

export function allocU32Array(length: i32): u32[] {
  return new Array<u32>(length);
}

export function earcut(data: Array<f64>, holes: Array<u32>): i32[] {
  return earcutCore(data, holes);
}
