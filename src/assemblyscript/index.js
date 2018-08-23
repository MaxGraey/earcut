'use strict';
const {
    earcut,
    getU32Array,
    newU32Array,
    newF64Array
} = require('./loader');

function earcutFlat(vertices, holes) {
    const verticesArray = newF64Array(vertices);
    const holesArray    = newU32Array(holes);

    const triangles = earcut(verticesArray, holesArray);
    if (!triangles) return new Uint32Array();
    const result = getU32Array(triangles);
    return result;
}

module.exports = {earcutFlat};
