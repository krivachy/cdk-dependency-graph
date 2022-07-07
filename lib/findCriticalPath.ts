import { Duration, Interval } from 'luxon';
import { AwsStackTiming } from './fetchAwsTimings.js';

export type CriticalPath = {
  totalDuration: Duration;
  stack: AwsStackTiming;
};

export function findCriticalPath(awsTimings: AwsStackTiming[]): CriticalPath {
  const criticalPath = awsTimings.reduce((acc, next) => {
    // const accSum = acc.duration.plus(
    //   acc.dependencies.reduce((a, b) => a.plus(b.duration), Duration.fromMillis(0))
    // );
    // const nextSum = next.duration.plus(
    //   next.dependencies.reduce((a, b) => a.plus(b.duration), Duration.fromMillis(0))
    // );
    // return nextSum.as('millisecond') > accSum.as('millisecond') ? next : acc;
    return next.endTime > acc.endTime ? next : acc;
  });
  const total = Interval.fromDateTimes(
    criticalPath.dependencies.reduce((a, b) => (a.startTime < b.startTime ? a : b)).startTime,
    criticalPath.endTime
  ).toDuration();
  return {
    stack: criticalPath,
    totalDuration: total,
  };
}
