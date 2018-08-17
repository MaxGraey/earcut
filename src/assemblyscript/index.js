'use strict';

const instance = require('./loader');

function setF64Array(memory, array) {
    const F64 = new Float64Array(memory);
    const U32 = new Uint32Array(memory);
    U32[0] = array.length;
    F64.set(array, 1);
}

function earcutFlat(vertices, holes) {
    const earcut = instance.earcut;
    const buffer = instance.memory.buffer;

    const F64 = new Float64Array(buffer);
    const I32 = new Int32Array(buffer);

    const verticesOffset = 0;
    const holesOffset    = vertices.length * 2 + 16;

    F64.set(vertices, verticesOffset + 1);
    I32.set(holes,    holesOffset    + 2);

    earcut(verticesOffset, vertices.length, holesOffset, holes.length);
}

// earcutFlat();

module.exports = {earcutFlat};
