import { Context } from './utils/context.js';
import { readJsonFile, validateIfDirExists, validateIfFileExists } from './utils/fileUtils.js';
import { buildDependencyGraph, StackDependencies } from './buildDependencyGraph.js';
import { parseManifest } from './parseManifest.js';
import { printStackDependencies } from './printStackDependencies.js';
import { fetchStackNamesFromAws } from './fetchStackNamesFromAws.js';
import { fetchAwsTimings } from './fetchAwsTimings.js';
import { outputMermaidDiagram } from './outputMermaidDiagram.js';
import { CriticalPath, findCriticalPath } from './findCriticalPath.js';
import { printCriticalPath } from './printCriticalPath.js';

export async function main(ctx: Context) {
  const { options } = ctx;
  if (!options.cdkOut && !options.cloudformationTimings) {
    ctx.log.error(`Please provide one of --cdkOut or --cloudformationTimings to do something`);
  }
  let stackDependencies: StackDependencies[] | null = null;
  if (options.cdkOut) {
    validateIfDirExists(ctx, 'cdkOut', options.cdkOut);
    const manifestJsonPath = `${options.cdkOut}/manifest.json`;
    validateIfFileExists(ctx, 'manifest', manifestJsonPath);
    const manifestJson = readJsonFile(ctx, manifestJsonPath);
    const manifest = parseManifest(ctx, manifestJson);
    const dependencies = buildDependencyGraph(manifest);
    printStackDependencies(ctx, dependencies);
    stackDependencies = dependencies;
  }
  if (options.cloudformationTimings) {
    const stackNames =
      stackDependencies === null
        ? await fetchStackNamesFromAws(ctx)
        : [...new Set(stackDependencies.flatMap((s) => [s.name, ...s.dependencyNames]))];
    const awsTimings = await fetchAwsTimings(ctx, stackNames);
    let criticalPath: CriticalPath | null = null;
    if (stackDependencies) {
      criticalPath = findCriticalPath(ctx, awsTimings, stackDependencies);
      printCriticalPath(ctx, criticalPath);
    }

    if (options.output) {
      outputMermaidDiagram(ctx, options.output, awsTimings, stackDependencies, criticalPath);
    }
  }
}
