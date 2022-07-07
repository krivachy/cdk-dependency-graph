import { Artifact, Manifest } from './types.js';
import { ZodError } from 'zod';
import { Result } from 'true-myth';
import { Options } from './options.js';

export function parseManifest(input: unknown, options: Options): Result<Manifest, ZodError> {
  const result = Manifest.safeParse(input);
  if (result.success === true) {
    if (options.prefix) {
      const strippedManifest: Manifest = {
        artifacts: Object.fromEntries(
          Object.entries(result.data.artifacts).map(([name, artifact]) => {
            return [
              stripPrefix(name, options.prefix),
              stripPrefixFromArtifact(artifact, options.prefix),
            ];
          })
        ),
      };
      return Result.ok(strippedManifest);
    }
    return Result.ok(result.data);
  } else {
    return Result.err(result.error);
  }
}

export function stripPrefixFromArtifact(artifact: Artifact, prefix: string): Artifact {
  return {
    type: artifact.type,
    dependencies: artifact.dependencies.map((dep) => stripPrefix(dep, prefix)),
  };
}

export function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
