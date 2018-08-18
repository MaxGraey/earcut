'use strict';

const Benchmark = require('benchmark');

const earcutJS       = require('./src/earcut');
const earcutRustWasm = require('./earcut').earcut_flat;
const earcutAsWasm   = require('./src/assemblyscript').earcutFlat;

const building  = earcutJS.flatten(require('./test/fixtures/building.json'));
const dude      = earcutJS.flatten(require('./test/fixtures/dude.json'));
const water     = earcutJS.flatten(require('./test/fixtures/water.json'));
const waterHuge = earcutJS.flatten(require('./test/fixtures/water-huge.json'));

const deepEqual = require('assert').deepEqual;

if (false) {
    const {vertices, holes} = waterHuge;

    const verticesArray = Float64Array.from(vertices);
    const holesArray    = Uint32Array.from(holes);

    console.time('earcutAsWasm');
    const triangles1 = earcutAsWasm(verticesArray, holesArray);
    console.timeEnd('earcutAsWasm');

    const triangles2 = earcutJS(verticesArray, holesArray);

    deepEqual(triangles1, triangles2);
    // console.log(triangles1);
} else {

    const samples = {
        // 'typical OSM building': building,
        // 'dude shape': dude,
        // 'complex OSM water': water,
        'huge complex water': waterHuge,
    };

    for (const name in samples) {
        const {vertices, holes} = samples[name];

        const verticesArray = Float64Array.from(vertices);
        const holesArray    = Uint32Array.from(holes);
        const verticesCount = vertices.length / 2;

        new Benchmark.Suite()
            .add(`JS ${name} (${verticesCount} vertices):`, () => {
                earcutJS(vertices, holes);
            })
            .add(`AssemblyScript WASM ${name} (${verticesCount} vertices):`, () => {
                earcutAsWasm(verticesArray, holesArray);
            })
            .add(`Rust WASM ${name} (${verticesCount} vertices):`, () => {
                earcutRustWasm(verticesArray, holesArray);
            })
            .on('cycle', ({target}) => console.log(String(target)))
            .run();
    }

}
