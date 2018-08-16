import 'allocator/arena';

import { earcutCore } from './earcut';

export function earcut(data: f64[], holeIndices: i32[]): i32[] {
  return earcutCore(data, holeIndices);
}
