import { insertionSort } from 'internal/array';

export function sort<T>(data: Array<T>, comparator: (a: T, b: T) => i32): Array<T> {
  var length = data.length_;
  if (length <= 1) return data;
  var buffer = data.buffer_;

  // TODO impement TimSort stable sort
  insertionSort<T>(buffer, 0, length, comparator);
  return data;
}
