'use strict';

const fs   = require('fs');
const path = require('path');

const compiled = new WebAssembly.Module(fs.readFileSync(
    path.resolve(__dirname, '../../build/debug/earcut.as.wasm')
));

const memory = new WebAssembly.Memory({initial: (0x8000000 >>> 16) + 4});

const imports = {
    env: {
        memory,
        abort(msgPtr, filePtr, line, column) {
            console.error(`[AssemblyScript]: abort at [${line}:${column}]`);
        }
    }
};

const {earcut} = new WebAssembly.Instance(compiled, imports).exports;
module.exports = {earcut, memory};
