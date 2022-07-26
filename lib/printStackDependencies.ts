import { StackDependencies } from './buildDependencyGraph.js';
import chalk from 'chalk';
import { stripPrefix } from './utils/stripPrefix.js';
import { Context } from './utils/context.js';

export function printStackDependencies(ctx: Context, stackDependencies: StackDependencies[]): void {
  const longestName = stackDependencies.reduce(
    (currentMax, next) => Math.max(currentMax, stripPrefix(ctx, next.name).length),
    0
  );
  stackDependencies.forEach((stackDependency) => {
    console.log(
      `${chalk.bold(
        stripPrefix(ctx, stackDependency.name).padEnd(longestName + 1)
      )}| ${stackDependency.dependencyNames.map((name) => stripPrefix(ctx, name)).join(', ')}`
    );
  });
}
