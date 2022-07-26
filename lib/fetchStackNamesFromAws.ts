import { Context } from './utils/context.js';
import { DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

export async function fetchStackNamesFromAws(ctx: Context): Promise<string[]> {
  ctx.log.verbose(`Describing stacks for prefix: ${ctx.options.prefix}`);
  let page: number = 1;
  let nextToken: string | undefined = undefined;
  let stackNames: string[] = [];
  do {
    ctx.log.verbose(`Fetching page ${page} of stacks`);
    const stacksPage = await ctx.cfnClient.send(new DescribeStacksCommand({}));
    const stackNamesPage: string[] = (stacksPage.Stacks ?? [])
      .map((s) => s.StackName)
      .filter(isString);
    stackNames.push(
      ...stackNamesPage.filter((v) =>
        ctx.options.prefix ? v.startsWith(ctx.options.prefix) : true
      )
    );
    page++;
    nextToken = stacksPage.NextToken;
  } while (nextToken !== undefined);
  ctx.log.verbose(`Found ${stackNames.length} stacks: ${stackNames.join(', ')}`);
  return stackNames;
}
function isString(u: unknown): u is string {
  return typeof u === 'string';
}
