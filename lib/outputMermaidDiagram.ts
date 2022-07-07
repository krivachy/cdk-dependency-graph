import { AwsStackTiming } from './fetchAwsTimings.js';
import { Options } from './options.js';
import fs from 'node:fs';
import { CriticalPath } from './findCriticalPath.js';

// <html>
//     <body>
//         <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
//         <script>mermaid.initialize({ startOnLoad: true });</script>
//
//         Here is one mermaid diagram:
//         <div class="mermaid">
//             graph TD
//             A[Client] --> B[Load Balancer]
//             B --> C[Server1]
//             B --> D[Server2]
//         </div>
//
//         And here is another:
//         <div class="mermaid">
//             graph TD
//             A[Client] -->|tcp_123| B
//             B(Load Balancer)
//             B -->|tcp_456| C[Server1]
//             B -->|tcp_456| D[Server2]
//         </div>
//     </body>
// </html>
export function outputMermaidDiagram(
  awsTimings: AwsStackTiming[],
  criticalPath: CriticalPath,
  options: Options
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
    line(
      `${awsTiming.name}:${
        onTheCriticalPath(awsTiming, criticalPath) ? 'crit,' : ''
      } after ${awsTiming.dependencyNames.join(
        ' '
      )}, ${awsTiming.startTime.toSeconds()}, ${awsTiming.endTime.toSeconds()}`
    );
  });
  lines.push('</div>');
  lines.push('</body>');
  lines.push('</html>');
  fs.writeFileSync(options.output, lines.join('\n'));
}

function onTheCriticalPath(awsTiming: AwsStackTiming, criticalPath: CriticalPath): boolean {
  return (
    criticalPath.stack.name === awsTiming.name ||
    criticalPath.stack.dependencyNames.some((dep) => dep === awsTiming.name)
  );
}