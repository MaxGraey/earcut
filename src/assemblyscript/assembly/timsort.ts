import {
  loadUnsafe,
  storeUnsafe,
} from 'internal/arraybuffer';

import { insertionSort } from 'internal/array';

// workaround with this issue: https://github.com/AssemblyScript/assemblyscript/issues/219
export class Sorter<T> {
  sort(data: Array<T>, comparator: (a: T, b: T) => i32): Array<T> {
    var length = data.length_;
    if (length <= 1) return data;
    var buffer = data.buffer_;
    if (length == 2) {
      let a = loadUnsafe<T,T>(buffer, 1); // a = arr[1]
      let b = loadUnsafe<T,T>(buffer, 0); // b = arr[0]
      if (comparator(a, b) < 0) {
        storeUnsafe<T,T>(buffer, 1, b);   // arr[1] = b;
        storeUnsafe<T,T>(buffer, 0, a);   // arr[0] = a;
      }
      return data;
    }

    // TODO impement TimSort stable sort
    insertionSort<T>(buffer, 0, length, comparator);
    return data;
  }
}
