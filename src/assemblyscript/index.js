'use strict';

const instance = require('./loader');

function earcutFlat(vertices, holes) {
    const earcut = instance.earcut;
    const buffer = instance.memory.buffer;

    const F64 = new Float64Array(buffer);
    const U32 = new Uint32Array(buffer);

    const verticesOffset = 0;
    const holesOffset    = (((vertices.length + 1) * 8) / 4);

    F64.set(vertices, verticesOffset + 1);
    U32.set(holes,    holesOffset    + 2);

    // console.log(holes);
    // console.log(U32.subarray(holesOffset + 2, holesOffset + 2 + holes.length));

    return earcut(verticesOffset, vertices.length, holesOffset, holes.length);
}

module.exports = {earcutFlat};
