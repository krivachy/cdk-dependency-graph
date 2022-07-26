#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Options } from './utils/options.js';
import { Command } from 'commander';
import { Context, createContext } from './utils/context.js';
import { readJsonFile, validateIfFileExists } from './utils/fileUtils.js';
import { main } from './main.js';

const program = new Command();

program
  .name('cdk-dependency-graph')
  .description("Analyze your CDK application's dependency graph")
  .version(
    process.env.NPM_PACKAGE_VERSION ?? 'unknown',
    '-V, --version',
    'print the installed version'
  );

program
  .option('-v, --verbose', 'verbose logging')
  .option('--prefix <prefix>', 'to strip a prefix, for example a stage like `dev-`')
  .option('--sstStage <sstStage>', 'an SST stage')
  .option('--sstApp <sstApp>', 'an SST stage')
  .option('--sstJson <sstJson>', 'path to sst.json')
  .option(
    '--cdkOut <cdkOut>',
    "path to cdk.out directory, if sstJson provided then it will default to your SST app's cdk.ou"
  )
  .option('--cloudformationTimings', 'to fetch timings from AWS Cloudformation')
  .option('--profile <profile>', 'AWS profile, defaults to $AWS_PROFILE', process.env.AWS_PROFILE)
  .option(
    '-r, --region <region>',
    'AWS region, defaults to the one in the AWS profile, or if sstJson provided the one in that'
  )
  .option('-o, --output <output>', 'output file path')
  .action(async (inputOptions) => {
    // Get options in:
    const options = Options.parse(inputOptions);
    const ctx = createContext(options);
    ctx.log.verbose(`Initial options: ${JSON.stringify(options)}`);
    const enhancedOptions = validateOptions(ctx);
    const enhancedCtx = createContext(enhancedOptions);
    enhancedCtx.log.verbose(`Enhanced options: ${JSON.stringify(enhancedOptions)}`);

    // Run the main program
    await main(enhancedCtx);
  })
  .showHelpAfterError(true);

program.parse();

// Progressively enhance CLI inputs
function validateOptions(ctx: Context): Options {
  const options = ctx.options;
  const updatedOptions: Options = {
    ...options,
  };
  if (options.sstJson) {
    validateIfFileExists(ctx, 'sstJson', options.sstJson);
    const sstJson = readJsonFile(ctx, options.sstJson);
    const appName = sstJson.name;
    if (typeof appName !== 'string') {
      ctx.log.error(`sst.json invalid, name property missing`);
    }
    if (!options.cdkOut && fs.existsSync(`${path.dirname(options.sstJson)}/.build/cdk.out`)) {
      updatedOptions.cdkOut = `${path.dirname(options.sstJson)}/.build/cdk.out`;
    }
    if (!options.region && typeof sstJson.region === 'string') {
      updatedOptions.region = sstJson.region;
    }
    if (!options.sstStage) {
      const stageFile = `${path.dirname(options.sstJson)}/.sst/stage`;
      if (fs.existsSync(stageFile)) {
        updatedOptions.sstStage = fs.readFileSync(stageFile).toString('utf8').trim();
      } else {
        ctx.log.error(`Please provide --stage option or initialize stage file at: ${stageFile}`);
      }
    }
  }
  if (updatedOptions.sstApp && updatedOptions.sstStage) {
    updatedOptions.prefix = `${updatedOptions.sstStage}-${updatedOptions.sstApp}-`;
  }
  return Options.parse(updatedOptions);
}
