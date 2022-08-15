import { Options } from './options.js';
import console from 'node:console';
import chalk from 'chalk';
import process from 'node:process';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { fromIni } from '@aws-sdk/credential-providers';

export type Context = {
  log: {
    verbose(message: string): void;
    info(message: string): void;
    error(message: string): never;
  };
  options: Options;
  cfnClient: CloudFormationClient;
};

export function createContext(options: Options): Context {
  return {
    log: {
      info(message: string) {
        console.log(chalk.bold(message));
      },
      error(message: string): never {
        console.info(chalk.bgRed.whiteBright('ERROR:') + chalk.redBright(` ${message}`));
        process.exit(1);
      },
      verbose(message: string) {
        if (options.verbose) {
          console.log(chalk.gray(message));
        }
      },
    },
    options,
    cfnClient: new CloudFormationClient({
      credentials: options.profile
        ? fromIni({
            profile: options.profile,
          })
        : undefined,
      region: options.region ?? undefined,
      maxAttempts: 10,
    }),
  };
}
