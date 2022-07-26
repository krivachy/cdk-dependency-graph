import { Context } from './context.js';

export function stripPrefix(ctx: Context, value: string): string {
  if (ctx.options.prefix) {
    return value.startsWith(ctx.options.prefix) ? value.slice(ctx.options.prefix.length) : value;
  } else {
    return value;
  }
}
