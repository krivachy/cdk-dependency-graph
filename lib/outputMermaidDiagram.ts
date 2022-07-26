import { AwsStackTiming } from './fetchAwsTimings.js';
import fs from 'node:fs';
import { CriticalPath } from './findCriticalPath.js';
import { StackDependencies } from './buildDependencyGraph.js';
import { stripPrefix } from './utils/stripPrefix.js';
import { Context } from './utils/context.js';

export function outputMermaidDiagram(
  ctx: Context,
  output: string,
  awsTimings: AwsStackTiming[],
  stackDependencies: StackDependencies[] | null,
  criticalPath: CriticalPath | null
): void {
  const lines: string[] = [];
  const line = (s: string) => lines.push(s);
  line('<html>');
  line('<body>');
  line('<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>');
  line('<script>mermaid.initialize({ startOnLoad: true });</script>');
  line('<div class="mermaid">');
  line('gantt');
  // X = Unix timestamp in seconds
  line('dateFormat  X');
  line('axisFormat  %Y-%m-%d %H:%M:%S');
  awsTimings.forEach((awsTiming) => {
    const dependencies = findAllDependencies(awsTiming, stackDependencies);
    line(
      `${stripPrefix(ctx, awsTiming.name)}:${
        onTheCriticalPath(awsTiming, criticalPath) ? 'crit,' : ''
      } ${
        dependencies.length > 0
          ? `after ${dependencies.map((name) => stripPrefix(ctx, name)).join(' ')}`
          : ''
      }, ${awsTiming.startTime.toSeconds()}, ${awsTiming.endTime.toSeconds()}`
    );
  });
  lines.push('</div>');
  lines.push('</body>');
  lines.push('</html>');
  fs.writeFileSync(output, lines.join('\n'));
}

function onTheCriticalPath(awsTiming: AwsStackTiming, criticalPath: CriticalPath | null): boolean {
  if (!criticalPath) {
    return false;
  }
  return (
    criticalPath.stack.name === awsTiming.name ||
    criticalPath.stackDependencies.some((dep) => dep.name === awsTiming.name)
  );
}

function findAllDependencies(
  awsTiming: AwsStackTiming,
  stackDependencies: StackDependencies[] | null
): string[] {
  if (!stackDependencies) {
    return [];
  }
  return stackDependencies.find((dep) => dep.name === awsTiming.name)?.dependencyNames ?? [];
}
