import { DateTime, Duration, Interval } from 'luxon';
import {
  DescribeStackEventsCommand,
  DescribeStackEventsCommandOutput,
  StackEvent,
} from '@aws-sdk/client-cloudformation';
import { assert } from 'assert-ts';
import { Context } from './utils/context.js';

export type AwsStackTiming = {
  name: string;
  startTime: DateTime;
  endTime: DateTime;
  duration: Duration;
};

export async function fetchAwsTimings(
  ctx: Context,
  stackNames: string[]
): Promise<AwsStackTiming[]> {
  const stackSummaries: StackEventSummary[] = [];
  for (const stackName of stackNames) {
    stackSummaries.push(await getStackEventSummary(ctx, stackName));
  }
  return stackSummaries.map((sum) => {
    // TODO: stricten StackEvent type so no assert is needed
    assert(!!sum.firstEvent.Timestamp);
    assert(!!sum.lastEvent.Timestamp);
    const startTime = DateTime.fromJSDate(sum.firstEvent.Timestamp);
    const endTime = DateTime.fromJSDate(sum.lastEvent.Timestamp);
    return {
      name: sum.stackName,
      startTime,
      endTime,
      duration: Interval.fromDateTimes(startTime, endTime).toDuration(),
    };
  });
}

type StackEventSummary = {
  stackName: string;
  firstEvent: StackEvent;
  lastEvent: StackEvent;
};

async function getStackEventSummary(ctx: Context, stackName: string): Promise<StackEventSummary> {
  const { cfnClient } = ctx;
  let firstEvent: StackEvent | undefined = undefined;
  let lastEvent: StackEvent | undefined = undefined;
  let nextToken: string | undefined = undefined;
  let page = 1;
  do {
    ctx.log.verbose(`Fetching stack events for: ${stackName} (page ${page})`);
    const cfnResponse: DescribeStackEventsCommandOutput = await cfnClient.send(
      new DescribeStackEventsCommand({
        StackName: stackName,
        NextToken: nextToken,
      })
    );
    nextToken = cfnResponse.NextToken;
    page++;
    if (lastEvent === undefined) {
      if (!cfnResponse.StackEvents || cfnResponse.StackEvents.length === 0) {
        ctx.log.error(`No stack events returned for: ${stackName}`);
      } else {
        if (isLastEvent(cfnResponse.StackEvents[0], stackName)) {
          lastEvent = cfnResponse.StackEvents[0];
        } else {
          ctx.log.error(
            `Stack not in a successful completed state of CREATE_COMPLETE: ${stackName}`
          );
        }
      }
    }
    firstEvent = cfnResponse.StackEvents?.find((se) => isFirstEvent(se, stackName));
  } while (nextToken !== undefined && firstEvent === undefined);
  if (!firstEvent || !lastEvent) {
    ctx.log.error(
      `Events not found for stack: ${stackName}: ${JSON.stringify(
        { firstEvent, lastEvent },
        null,
        2
      )}`
    );
  }
  return {
    stackName,
    lastEvent,
    firstEvent,
  };
}

function isFirstEvent(se: StackEvent, stackName: string): boolean {
  return (
    se.LogicalResourceId === stackName &&
    se.ResourceStatusReason === 'User Initiated' &&
    se.ResourceStatus === 'CREATE_IN_PROGRESS'
  );
}

function isLastEvent(se: StackEvent, stackName: string): boolean {
  return se.LogicalResourceId === stackName && se.ResourceStatus === 'CREATE_COMPLETE';
}
