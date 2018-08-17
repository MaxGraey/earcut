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

    console.log(vertices);

    // console.log(earcut, buffer);
}

// earcutFlat();

module.exports = {earcutFlat};
