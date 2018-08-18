import 'allocator/arena';

import { earcutCore } from './earcut';

/*
@inline
function unboxArray<T>(ptr: usize, length: i32): T[] {
  var array = new Array<T>();
  store<i32>(ptr, length * sizeof<T>(), offsetof<ArrayBuffer>("byteLength"));
  array.buffer_ = changetype<ArrayBuffer>(ptr);
  array.length_ = length;
  return array;
}
*/

export function allocF64Array(length: i32): f64[] {
  return new Array<f64>(length);
}

export function allocU32Array(length: i32): u32[] {
  return new Array<u32>(length);
}

export function earcut(
  // dataOffset:  usize, dataLength:  i32,
  // holesOffset: usize, holesLength: i32
  data: Array<f64>,
  holes: Array<u32>
): i32[] {
  // var data  = unboxArray<f64>(dataOffset,  dataLength);
  // var holes = unboxArray<i32>(holesOffset, holesLength);
  return earcutCore(data, holes);
}
