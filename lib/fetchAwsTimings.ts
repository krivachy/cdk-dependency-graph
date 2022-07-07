import { DateTime, Duration, Interval } from 'luxon';
import { BasicStackDependency, StackDependencies } from './buildDependencyGraph.js';
import { CloudFormationClient, DescribeStackEventsCommand } from '@aws-sdk/client-cloudformation';
import { Options } from './options.js';
import { StackEvent } from '@aws-sdk/client-cloudformation/dist-types/models/models_0.js';
import chalk from 'chalk';
export type BasicStackDependencyWithTiming = BasicStackDependency & {
  startTime: DateTime;
  endTime: DateTime;
  duration: Duration;
};
export type AwsStackTiming = Omit<StackDependencies, 'dependencies'> & {
  startTime: DateTime;
  endTime: DateTime;
  duration: Duration;
  dependencies: BasicStackDependencyWithTiming[];
};

export async function fetchAwsTimings(
  stacks: StackDependencies[],
  options: Options
): Promise<AwsStackTiming[]> {
  const cfnClient = new CloudFormationClient({
    region: options.region,
  });
  const stackSummaries: StackEventSummary[] = [];
  for (const stack of stacks) {
    stackSummaries.push(await getStackEventSummary(cfnClient, stack, options));
  }
  return stackSummaries.map((sum) => {
    const startTime = DateTime.fromJSDate(sum.firstEvent.Timestamp);
    const endTime = DateTime.fromJSDate(sum.lastEvent.Timestamp);
    return {
      name: sum.name,
      dependencies: sum.dependencies.map((s) => {
        const depSum = stackSummaries.find((a) => a.name === s.name);
        const depStartTime = DateTime.fromJSDate(depSum.firstEvent.Timestamp);
        const depEndTime = DateTime.fromJSDate(depSum.lastEvent.Timestamp);
        return {
          name: s.name,
          dependencyNames: s.dependencyNames,
          startTime: depStartTime,
          endTime: depEndTime,
          duration: Interval.fromDateTimes(depStartTime, depEndTime).toDuration(),
        };
      }),
      dependencyNames: sum.dependencyNames,
      startTime,
      endTime,
      duration: Interval.fromDateTimes(startTime, endTime).toDuration(),
    };
  });
}

type StackEventSummary = StackDependencies & {
  type: 'CREATE' | 'UPDATE';
  firstEvent: StackEvent;
  lastEvent: StackEvent;
};

async function getStackEventSummary(
  cfnClient: CloudFormationClient,
  stack: StackDependencies,
  options: Options
): Promise<StackEventSummary> {
  const stackName = options.prefix ? `${options.prefix}${stack.name}` : stack.name;
  let type: 'CREATE' | 'UPDATE' | undefined = undefined;
  let firstEvent: StackEvent | undefined = undefined;
  let lastEvent: StackEvent | undefined = undefined;
  let nextToken: string | undefined = undefined;
  let page = 1;
  do {
    console.error(chalk.gray(`Fetching stack events for: ${stackName} (page ${page})`));
    const cfnResponse = await cfnClient.send(
      new DescribeStackEventsCommand({
        StackName: stackName,
        NextToken: nextToken,
      })
    );
    nextToken = cfnResponse.NextToken;
    page++;
    if (type === undefined) {
      if (cfnResponse.StackEvents.length === 0) {
        throw new Error(`No stack events returned for: ${stackName}`);
      } else {
        if (isLastEvent(cfnResponse.StackEvents[0], stackName)) {
          lastEvent = cfnResponse.StackEvents[0];
          type = lastEvent.ResourceStatus === 'CREATE_COMPLETE' ? 'CREATE' : 'UPDATE';
        } else {
          throw new Error(
            `Stack not in a successful completed state of CREATE_COMPLETE or UPDATE_COMPLETE: ${stackName}`
          );
        }
      }
    }
    firstEvent = cfnResponse.StackEvents.find((se) => isFirstEvent(se, type, stackName));
  } while (nextToken !== undefined && firstEvent === undefined);
  if (!firstEvent || !lastEvent || !type) {
    throw new Error(
      `Events not found for stack: ${stackName}: ${JSON.stringify(
        { firstEvent, lastEvent, type },
        null,
        2
      )}`
    );
  }
  return {
    ...stack,
    type,
    lastEvent,
    firstEvent,
  };
}

function isFirstEvent(se: StackEvent, type: StackEventSummary['type'], stackName: string): boolean {
  return (
    se.LogicalResourceId === stackName &&
    se.ResourceStatusReason === 'User Initiated' &&
    (type === 'CREATE'
      ? se.ResourceStatus === 'CREATE_IN_PROGRESS'
      : se.ResourceStatus === 'UPDATE_IN_PROGRESS')
  );
}

function isLastEvent(se: StackEvent, stackName: string): boolean {
  return (
    se.LogicalResourceId === stackName &&
    (se.ResourceStatus === 'CREATE_COMPLETE' || se.ResourceStatus === 'UPDATE_COMPLETE')
  );
}
