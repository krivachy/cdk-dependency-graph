import { StackDependencies } from './buildDependencyGraph.js';
import chalk from 'chalk';

export function printStackDependencies(stackDependencies: StackDependencies[]): void {
  const longestName = stackDependencies.reduce(
    (currentMax, next) => Math.max(currentMax, next.name.length),
    0
  );
  stackDependencies.forEach((stackDependency) => {
    console.log(
      `${chalk.bold(
        stackDependency.name.padEnd(longestName + 1)
      )}| ${stackDependency.dependencyNames.join(', ')}`
    );
  });
}
