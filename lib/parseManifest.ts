import { Manifest } from './utils/types.js';
import { Context } from './utils/context.js';

export function parseManifest(ctx: Context, input: unknown): Manifest {
  const result = Manifest.safeParse(input);
  if (result.success) {
    return result.data;
  } else {
    ctx.log.error(`Failed to parse manifest.json:\n${JSON.stringify(result.error, null, 2)}`);
  }
}
