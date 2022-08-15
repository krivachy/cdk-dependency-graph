import { Context } from './utils/context.js';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';

export async function verifyAwsCredentials(ctx: Context): Promise<void> {
  const stsClient = new STSClient({
    credentials: ctx.options.profile
      ? fromIni({
          profile: ctx.options.profile,
        })
      : undefined,
    region: ctx.options.region ?? undefined,
  });
  try {
    await stsClient.send(new GetCallerIdentityCommand({}));
  } catch (e) {
    if (e instanceof Error && e.name === 'ExpiredToken') {
      ctx.log.error(`AWS credentials invalid for profile: ${ctx.options.profile}`);
    }
    throw e;
  }
}
