import { Duration, Interval } from 'luxon';
import { AwsStackTiming } from './fetchAwsTimings.js';
import { StackDependencies } from './buildDependencyGraph.js';
import { Context } from './utils/context.js';

export type CriticalPath = {
  totalDuration: Duration;
  stack: AwsStackTiming;
  stackDependencies: AwsStackTiming[];
};

export function findCriticalPath(
  ctx: Context,
  awsTimings: AwsStackTiming[],
  stackDependencies: StackDependencies[]
): CriticalPath {
  const criticalPath = awsTimings.reduce((acc, next) => {
    return next.endTime > acc.endTime ? next : acc;
  });
  const criticalStackDependency = stackDependencies.find((s) => s.name === criticalPath.name);
  if (!criticalStackDependency) {
    ctx.log.error(`Not found stack dependency for: ${criticalPath.name}`);
  }
  const dependencyTimings = criticalStackDependency.dependencyNames.map((depName) => {
    const depTiming = awsTimings.find((t) => t.name === depName);
    if (!depTiming) {
      ctx.log.error(`AWS stack timing not found for: ${depName}`);
    }
    return depTiming;
  });
  const total = Interval.fromDateTimes(
    dependencyTimings.reduce((a, b) => (a.startTime < b.startTime ? a : b)).startTime,
    criticalPath.endTime
  ).toDuration();
  return {
    stack: criticalPath,
    stackDependencies: dependencyTimings,
    totalDuration: total,
  };
}
