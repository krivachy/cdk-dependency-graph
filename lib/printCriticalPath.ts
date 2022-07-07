import { CriticalPath } from './findCriticalPath.js';

export function printCriticalPath(criticalPath: CriticalPath): void {
  console.log(`CRITICAL PATH (${criticalPath.totalDuration.toFormat(`m 'min' s 'sec'`)}):`);
  console.log(
    `${criticalPath.stack.name} (${criticalPath.stack.duration.toFormat(`m 'min' s 'sec'`)})`
  );
  criticalPath.stack.dependencies.forEach((dep) => {
    console.log(`${dep.name} (${dep.duration.toFormat(`m 'min' s 'sec'`)})`);
  });
}
