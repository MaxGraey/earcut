'use strict';

const fs   = require('fs');
const path = require('path');

const compiled = new WebAssembly.Module(fs.readFileSync(path.resolve(__dirname, '../build/optimized.wasm')));
const imports = {};

Object.defineProperty(module, 'exports', {
    get: () => new WebAssembly.Instance(compiled, imports).exports
});
