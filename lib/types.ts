import { z } from 'zod';

export const Artifact = z.object({
  type: z.string(),
  dependencies: z.array(z.string()).default([]),
});
export type Artifact = z.infer<typeof Artifact>;

export const Manifest = z.object({
  artifacts: z.record(z.string(), Artifact),
});
export type Manifest = z.infer<typeof Manifest>;
