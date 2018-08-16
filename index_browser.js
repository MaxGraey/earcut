import _ from 'lodash';
import process from 'process';

const earcutJS = require('./src/earcut');

import("./earcut").then((module) => {
    const earcutRustWasm = module.earcut_flat;

    const samples = {
        'typical OSM building': earcutJS.flatten(require('./test/fixtures/building.json')),
        'dude shape': earcutJS.flatten(require('./test/fixtures/dude.json')),
        'complex OSM water': earcutJS.flatten(require('./test/fixtures/water.json'))
    };

    const benchmark  = require('benchmark');
    const Benchmark  = benchmark.runInContext({ _, process });
    window.Benchmark = Benchmark;

    for (const name in samples) {
        const {vertices, holes} = samples[name];

        const verticesArray   = Float64Array.from(vertices);
        const holesArray      = Uint32Array.from(holes);
        const verticesHalfLen = vertices.length / 2;

        new Benchmark.Suite()
            .add(`JS ${name} (${verticesHalfLen} vertices):`, () => {
                earcutJS(vertices, holes);
            })
            .add(`WASM ${name} (${verticesHalfLen} vertices):`, () => {
                earcutRustWasm(verticesArray, holesArray);
            })
            .on('cycle', e => console.log(String(e.target)))
            .run();
    }
});
