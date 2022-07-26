import { CriticalPath } from './findCriticalPath.js';
import { Context } from './utils/context.js';
import { stripPrefix } from './utils/stripPrefix.js';

export function printCriticalPath(ctx: Context, criticalPath: CriticalPath): void {
  console.log(`CRITICAL PATH (${criticalPath.totalDuration.toFormat(`m 'min' s 'sec'`)}):`);
  console.log(
    `${stripPrefix(ctx, criticalPath.stack.name)} (${criticalPath.stack.duration.toFormat(
      `m 'min' s 'sec'`
    )})`
  );
  criticalPath.stackDependencies.forEach((dep) => {
    console.log(`${stripPrefix(ctx, dep.name)} (${dep.duration.toFormat(`m 'min' s 'sec'`)})`);
  });
}
