import benchmark from "benchmark";
import { parse as ultraflag } from "../dist/index.js";
import minimist from 'minimist';
import yargs from 'yargs-parser';

// @ts-ignore
const suite = new benchmark.Suite();

const args = `--a=1 --b=2 -c 3 -xyz -c 4`.split(' ');

suite
  .add("ultraflag", () => {
    ultraflag(args);
  })
  .add("minimist", () => {
    minimist(args);
  })
  .add("yargs-parser", () => {
    yargs(args)
  })
  .on("cycle", (event) => {
    console.log(String(event.target));
  });

suite.run();
