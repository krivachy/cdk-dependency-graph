import { DateTime, Duration, Interval } from 'luxon';
import {
  DescribeStackEventsCommand,
  DescribeStackEventsCommandOutput,
} from '@aws-sdk/client-cloudformation';
import { StackEvent } from '@aws-sdk/client-cloudformation/dist-types/models/models_0.js';
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
  type: 'CREATE' | 'UPDATE';
  firstEvent: StackEvent;
  lastEvent: StackEvent;
};

async function getStackEventSummary(ctx: Context, stackName: string): Promise<StackEventSummary> {
  const { cfnClient } = ctx;
  let type: 'CREATE' | 'UPDATE' | undefined = undefined;
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
    if (type === undefined) {
      if (!cfnResponse.StackEvents || cfnResponse.StackEvents.length === 0) {
        ctx.log.error(`No stack events returned for: ${stackName}`);
      } else {
        if (isLastEvent(cfnResponse.StackEvents[0], stackName)) {
          lastEvent = cfnResponse.StackEvents[0];
          type = lastEvent.ResourceStatus === 'CREATE_COMPLETE' ? 'CREATE' : 'UPDATE';
        } else {
          ctx.log.error(
            `Stack not in a successful completed state of CREATE_COMPLETE or UPDATE_COMPLETE: ${stackName}`
          );
        }
      }
    }
    const determinedType = type;
    if (!determinedType) {
      throw new Error('Could not determine type');
    }
    firstEvent = cfnResponse.StackEvents?.find((se) => isFirstEvent(se, determinedType, stackName));
  } while (nextToken !== undefined && firstEvent === undefined);
  if (!firstEvent || !lastEvent || !type) {
    ctx.log.error(
      `Events not found for stack: ${stackName}: ${JSON.stringify(
        { firstEvent, lastEvent, type },
        null,
        2
      )}`
    );
  }
  return {
    stackName,
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
