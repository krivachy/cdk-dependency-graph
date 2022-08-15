import { StackDependencies } from './buildDependencyGraph.js';
import chalk from 'chalk';
import { stripPrefix } from './utils/stripPrefix.js';
import { Context } from './utils/context.js';

export function printStackDependencies(ctx: Context, stackDependencies: StackDependencies[]): void {
  const longestName = stackDependencies.reduce(
    (currentMax, next) => Math.max(currentMax, stripPrefix(ctx, next.name).length),
    0
  );
  const longestLineLength =
    longestName +
    3 +
    stackDependencies.reduce(
      (currentMax, next) =>
        Math.max(
          currentMax,
          next.dependencyNames.map((name) => stripPrefix(ctx, name)).join(', ').length
        ),
      0
    );
  console.log(
    chalk.underline.green(
      `Stack dependencies${ctx.options.prefix ? ` for "${ctx.options.prefix}"` : ''}`
    )
  );
  console.log(chalk.bold(`${'Stack'.padEnd(longestName + 1)}| Dependencies`));
  console.log('-'.repeat(longestLineLength));
  stackDependencies.forEach((stackDependency) => {
    console.log(
      `${chalk.bold(
        stripPrefix(ctx, stackDependency.name).padEnd(longestName + 1)
      )}| ${stackDependency.dependencyNames.map((name) => stripPrefix(ctx, name)).join(', ')}`
    );
  });
}
