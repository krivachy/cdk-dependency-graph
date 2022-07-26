import { z } from 'zod';

export const Options = z.object({
  verbose: z.boolean().default(false),
  prefix: z.string().nullable().default(null),
  sstStage: z.string().nullable().default(null),
  sstApp: z.string().nullable().default(null),
  sstJson: z.string().nullable().default(null),
  cdkOut: z.string().nullable().default(null),
  cloudformationTimings: z.boolean().default(false),
  profile: z.string(),
  region: z.string().nullable().default(null),
  output: z.string().nullable().default(null),
});

export type Options = z.infer<typeof Options>;
