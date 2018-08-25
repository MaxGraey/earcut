import 'allocator/arena';

import { earcutCore } from './earcut';

export function allocF64Array(length: i32): f64[] {
  return new Array<f64>(length);
}

export function allocU32Array(length: i32): u32[] {
  return new Array<u32>(length);
}

@inline
function deallocArray<T>(arr: T[]): void {
  memory.free(changetype<usize>(arr.buffer_));
  memory.free(changetype<usize>(arr));
}

export function earcut(data: f64[], holes: u32[]): u32[] {
  var res = earcutCore(data, holes);

  // deallocArray<f64>(data);
  // deallocArray<u32>(holes);

  return res;
}
