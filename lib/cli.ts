#!/usr/bin/env node

import yargs from 'yargs/yargs';
import fs from 'node:fs';
import path from 'node:path';
import * as process from 'process';
import { parseManifest } from './parseManifest.js';
import { buildDependencyGraph } from './buildDependencyGraph.js';
import { printStackDependencies } from './printStackDependencies.js';
import { Options } from './options.js';
import { fetchAwsTimings } from './fetchAwsTimings.js';
import { outputMermaidDiagram } from './outputMermaidDiagram.js';
import { findCriticalPath } from './findCriticalPath.js';
import { printCriticalPath } from './printCriticalPath.js';

interface Arguments {
  [x: string]: unknown;
  prefix: string | undefined;
  region: string | undefined;
  timings: boolean;
  output: string | undefined;
  _: (string | number)[];
}
const yargConfig = yargs(process.argv.slice(2))
  .scriptName('cdk-dependency-graph')
  .options({
    prefix: {
      type: 'string',
      alias: 'p',
      description: 'to strip a prefix, for example a stage',
      demandOption: false,
    },
    timings: {
      type: 'boolean',
      default: false,
      alias: 't',
      description: 'to fetch timings from aws',
      demandOption: false,
    },
    region: {
      type: 'string',
      alias: 'r',
      description: 'aws region to fetch timings from',
      demandOption: false,
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'output file path',
      demandOption: false,
    },
  })
  .command('cdkout', 'the path to the synthesized CDK output directory (cdk.out)')
  .demandCommand(1)
  .help();
const argv: Arguments = yargConfig.parseSync();

console.log(JSON.stringify(argv, null, 2));

const options: Options = {
  prefix: argv.prefix,
  region: argv.region,
  timings: argv.timings,
  output: argv.output,
};

const cdkout = argv._[0];

function error(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(0);
  throw new Error();
}

if (typeof cdkout !== 'string') {
  error('Invalid input type');
}
if (!fs.existsSync(cdkout)) {
  error(`cdkout option doesn't exist: ${cdkout}`);
}
const cdkOutPath = path.resolve(cdkout);
if (!fs.lstatSync(cdkOutPath).isDirectory) {
  error(`cdkout option not a directory: ${cdkout}`);
}
const manifestJsonPath = `${cdkOutPath}/manifest.json`;
if (!fs.lstatSync(manifestJsonPath).isFile()) {
  error(`manifest not found: ${manifestJsonPath}`);
}

let manifestJson: unknown;
try {
  manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath).toString('utf8'));
} catch (e) {
  error(`Failed to read: ${manifestJsonPath}`);
}

const manifest = parseManifest(manifestJson, options);
if (manifest.isErr === true) {
  error(`Failed to parse manifest.json: ${manifest.error}`);
}

const dependencies = buildDependencyGraph(manifest.value);
printStackDependencies(dependencies);

if (options.timings) {
  fetchAwsTimings(dependencies, options).then((awsTimings) => {
    const criticalPath = findCriticalPath(awsTimings);
    printCriticalPath(criticalPath);
    if (options.output) {
      outputMermaidDiagram(awsTimings, criticalPath, options);
    }
  });
}
