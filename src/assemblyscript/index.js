'use strict';

const instance = require('./loader');

const earcut   = instance.earcut;
const allocF64 = instance.allocF64Array;
const allocU32 = instance.allocU32Array;
const buffer   = instance.memory.buffer;

var mem, F64, U32;
var cached = new WeakMap();

function refreshMemory() {
    if (mem !== buffer) {
        U32 = new Uint32Array(buffer);
        F64 = new Float64Array(buffer);
        mem = buffer;
    }
}

function newF64Array(typedArray) {
    if (!cached.has(typedArray)) {
        const ptr = allocF64(typedArray.length);
        refreshMemory();
        const dataStart = (U32[ptr >>> 2] >>> 2) + 2;
        F64.set(typedArray, dataStart >>> 1);
        cached.set(typedArray, ptr);
        console.count('new array');
        return ptr;
    } else {
        return cached.get(typedArray);
    }
}

function newU32Array(typedArray) {
    if (!cached.has(typedArray)) {
        const ptr = allocU32(typedArray.length);
        refreshMemory();
        const dataStart = (U32[ptr >>> 2] >>> 2) + 2;
        U32.set(typedArray, dataStart);
        cached.set(typedArray, ptr);
        return ptr;
    } else {
        return cached.get(typedArray);
    }
}

function earcutFlat(vertices, holes) {

    const verticesArray = newF64Array(vertices);
    const holesArray    = newU32Array(holes);

    const triangles = earcut(verticesArray, holesArray);
    if (!triangles) return [];
    return triangles;
}

module.exports = {earcutFlat};
