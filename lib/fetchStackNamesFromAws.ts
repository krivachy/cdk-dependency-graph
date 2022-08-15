import { Context } from './utils/context.js';
import {
  ListStacksCommand,
  ListStacksCommandOutput,
  StackStatus,
} from '@aws-sdk/client-cloudformation';

const ALLOWED_STACK_STATUSES: Set<string> = new Set([StackStatus.CREATE_COMPLETE]);
const DELETED_STACK_STATUSES: Set<string> = new Set([
  StackStatus.DELETE_COMPLETE,
  StackStatus.DELETE_FAILED,
  StackStatus.DELETE_IN_PROGRESS,
]);

export async function fetchStackNamesFromAws(ctx: Context): Promise<string[]> {
  ctx.log.verbose(`Describing stacks for prefix: ${ctx.options.prefix}`);
  let page: number = 1;
  let nextToken: string | undefined = undefined;
  let stackNames: string[] = [];
  do {
    ctx.log.verbose(`Fetching page ${page} of stacks`);
    const stacksPage: ListStacksCommandOutput = await ctx.cfnClient.send(
      new ListStacksCommand({
        NextToken: nextToken,
      })
    );
    const filteredStackSummaries = (stacksPage.StackSummaries ?? []).filter((s) => {
      const matchesPrefix = ctx.options.prefix
        ? s.StackName?.startsWith(ctx.options.prefix) ?? false
        : true;
      const notDeletedStack = !DELETED_STACK_STATUSES.has(s.StackStatus ?? '');
      return matchesPrefix && notDeletedStack;
    });
    const stacksInIncorrectState = filteredStackSummaries.filter(
      (s) => !ALLOWED_STACK_STATUSES.has(s.StackStatus ?? '')
    );
    if (stacksInIncorrectState.length > 0) {
      ctx.log.error(
        `Following stacks are in an unsupported status:\n${stacksInIncorrectState
          .map((s) => `  - ${s.StackName} = ${s.StackStatus}`)
          .join(
            '\n'
          )}\ncdk-dependency-graph currently doesn't know how to process these statuses.\nPlease make sure your stacks are all in one of the following statuses: ${Array.from(
          ALLOWED_STACK_STATUSES.keys()
        ).join(', ')}`
      );
    }
    const stringStackNames: string[] = filteredStackSummaries
      .map((s) => s.StackName)
      .filter(isString);
    stackNames.push(...stringStackNames);
    page++;
    nextToken = stacksPage.NextToken;
  } while (nextToken !== undefined);
  ctx.log.verbose(`Found ${stackNames.length} stacks: ${stackNames.join(', ')}`);
  return stackNames.reverse();
}
function isString(u: unknown): u is string {
  return typeof u === 'string';
}
