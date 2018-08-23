'use strict';

const fs   = require('fs');
const path = require('path');

const DEBUG = false;

const compiled = new WebAssembly.Module(fs.readFileSync(
    path.resolve(__dirname, `../../build/${ DEBUG ? 'debug' : 'release' }/earcut.as.wasm`)
));

const memory = new WebAssembly.Memory({initial: 10000});

const imports = {
    env: {
        memory,
        abort(msgPtr, filePtr, line, column) {
            console.error(`[AssemblyScript]: abort at [${line}:${column}]`);
        },
        logf(value) {
            console.log('F64: ' + value);
        },
        logi(value) {
            console.log('U32: ' + value);
        },
        logU32Array(ptr) {
            console.log(getU32Array(ptr));
        }
    }
};

const wasm = new WebAssembly.Instance(compiled, imports).exports;

const allocF64 = wasm.allocF64Array;
const allocU32 = wasm.allocU32Array;

var mem, F64, U32;
var cached = new WeakMap();

function refreshMemory() {
    if (mem !== memory.buffer) {
        mem = memory.buffer;
        U32 = new Uint32Array(mem);
        F64 = new Float64Array(mem);
    }
}

function newF64Array(typedArray) {
    if (!cached.has(typedArray)) {
        const ptr = allocF64(typedArray.length);
        refreshMemory();
        const dataStart = (U32[ptr >>> 2] >>> 2) + 2;
        F64.set(typedArray, dataStart >>> 1);
        cached.set(typedArray, ptr);
        return ptr;
    } else {
        refreshMemory();
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
        refreshMemory();
        return cached.get(typedArray);
    }
}

function getU32Array(ptr) {
    refreshMemory();
    ptr >>>= 2;

    const offset = (U32[ptr] >>> 2) + 2;
    const len    = U32[ptr + 1];

    return U32.subarray(offset, offset + len);
}

module.exports = {
  memory,
  getU32Array,
  newU32Array,
  newF64Array,
  ...wasm
};
