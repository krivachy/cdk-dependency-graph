import { Manifest } from './types.js';
import toposort from 'toposort';

export type BasicStackDependency = {
  name: string;
  dependencyNames: string[];
};
export type StackDependencies = BasicStackDependency & {
  dependencies: BasicStackDependency[];
};

function toStackDependencies(manifest: Manifest): BasicStackDependency[] {
  return Object.entries(manifest.artifacts)
    .filter(([_name, details]) => details.type === 'aws:cloudformation:stack')
    .map(([name, details]) => {
      return {
        name,
        dependencyNames: details.dependencies.filter((dep) => !dep.endsWith('.assets')),
      };
    });
}

type Edge = [string, string];
function sortStackDependencies(stackDependencies: BasicStackDependency[]): BasicStackDependency[] {
  const nodes = stackDependencies.map((s) => s.name);
  const edges: Edge[] = stackDependencies.flatMap((stackDependency) => {
    return stackDependency.dependencyNames.map((dep) => {
      const edge: Edge = [stackDependency.name, dep];
      return edge;
    });
  });
  const sorted = toposort.array(nodes, edges);
  sorted.reverse();
  return sorted.map(resolveDependency(stackDependencies));
}

function addTransitiveStackDependencies(
  stackDependencies: BasicStackDependency[]
): BasicStackDependency[] {
  return stackDependencies.map((sd) => {
    const dependencyNames = [...sd.dependencyNames];
    sd.dependencyNames.forEach((depStackName) => {
      const dependencies = resolveDependency(stackDependencies)(depStackName).dependencyNames;
      dependencies.forEach((d) => {
        if (dependencyNames.indexOf(d) === -1) {
          dependencyNames.push(d);
        }
      });
    });
    return {
      ...sd,
      dependencyNames,
    };
  });
}

function enrichStackDependencies(stackDependencies: BasicStackDependency[]): StackDependencies[] {
  return stackDependencies.map((s) => {
    return {
      ...s,
      dependencies: s.dependencyNames.map(resolveDependency(stackDependencies)),
    };
  });
}

function resolveDependency(
  stackDependencies: BasicStackDependency[]
): (name: string) => BasicStackDependency {
  return (name: string) => {
    const value = stackDependencies.find((s) => s.name === name);
    if (!value) {
      throw new Error(`Invalid state, stack not found: ${name}`);
    }
    return value;
  };
}

export function buildDependencyGraph(manifest: Manifest): StackDependencies[] {
  const basicStackDependencies = addTransitiveStackDependencies(toStackDependencies(manifest));
  const sortedStackDependencies = sortStackDependencies(basicStackDependencies);
  return enrichStackDependencies(sortedStackDependencies);
}
