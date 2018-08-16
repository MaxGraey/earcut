'use strict';

const Benchmark = require('benchmark');

const earcutJS       = require('./src/earcut');
const earcutRustWasm = require('./earcut').earcut_flat;
// const earcutAsWasm   = require('./src/assemblyscript').earcut;

const building = earcutJS.flatten(require('./test/fixtures/building.json'));
const dude     = earcutJS.flatten(require('./test/fixtures/dude.json'));
const water    = earcutJS.flatten(require('./test/fixtures/water.json'));

if (false) {
    const {vertices, holes} = building;

    const verticesArray   = Float64Array.from(vertices);
    const holesArray      = Uint32Array.from(holes);

    const triangles = earcutAsWasm(verticesArray, holesArray);
    console.log(triangles);
    return;
}

const samples = {
    'typical OSM building': building,
    'dude shape': dude,
    'complex OSM water': water,
};

for (const name in samples) {
    const {vertices, holes} = samples[name];

    const verticesArray   = Float64Array.from(vertices);
    const holesArray      = Uint32Array.from(holes);
    const verticesHalfLen = vertices.length / 2;

    new Benchmark.Suite()
        .add(`JS ${name} (${verticesHalfLen} vertices):`, () => {
            earcutJS(vertices, holes);
        })
        .add(`Rust WASM ${name} (${verticesHalfLen} vertices):`, () => {
            earcutRustWasm(verticesArray, holesArray);
        })
        .on('cycle', ({target}) => console.log(String(target)))
        .run();
}
