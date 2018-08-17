import 'allocator/arena';

import { earcutCore } from './earcut';

@inline
function unboxArray<T>(ptr: usize, length: i32): T[] {
  store<i32>(ptr, length, offsetof<T[]>("length_"));
  return changetype<T[]>(ptr);
}

export function earcut(
  dataOffset:  usize, dataLength:  i32,
  holesOffset: usize, holesLength: i32
): i32[] {
  var data  = unboxArray<f64>(dataOffset,  dataLength);
  var holes = unboxArray<i32>(holesOffset, holesLength);
  return earcutCore(data, holes);
}
