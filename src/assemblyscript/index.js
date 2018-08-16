'use strict';

const fs   = require('fs');
const path = require('path');

const compiled = new WebAssembly.Module(fs.readFileSync(
    path.resolve(__dirname, '../../build/release/earcut.as.wasm')
));

const memory = new WebAssembly.Memory({initial: 20});

const imports = {
    memory,
    env: {
        abort(msgPtr, filePtr, line, column) {
            console.error(`[AssemblyScript]: abort at [${line}:${column}]`);
        }
    }
};

const {earcut} = new WebAssembly.Instance(compiled, imports).exports;

function earcutFlat() {
    console.log(earcut, memory.buffer);
}

earcutFlat();

module.exports = {earcutFlat};
