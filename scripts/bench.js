import benchmark from "benchmark";
import { parse as ultraflag } from "../dist/index.js";
import minimist from 'minimist';
import yargs from 'yargs-parser';
import mri from 'mri';

const bench = new benchmark.Suite();
const args = ['--a=1', '-b', '--bool', '--no-boop', '--multi=foo', '--multi=baz', '-xyz'];

bench
  .add('ultraflag    ', () => ultraflag(args))
  .add('mri          ', () => mri(args))
  .add('minimist     ', () => minimist(args))
  .add('yargs-parser ', () => yargs(args))
  .on('cycle', e => console.log(String(e.target)))
  .run();
