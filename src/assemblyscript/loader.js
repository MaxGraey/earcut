'use strict';

const fs   = require('fs');
const path = require('path');

const DEBUG = false;

const compiled = new WebAssembly.Module(fs.readFileSync(
    path.resolve(__dirname, `../../build/${ DEBUG ? 'debug' : 'release' }/earcut.as.wasm`)
));

const memory = new WebAssembly.Memory({initial: 40});

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
        }
    }
};

const wasmExports = new WebAssembly.Instance(compiled, imports).exports;
module.exports = Object.assign({}, memory, wasmExports);
