import fs from 'node:fs';
import path from 'node:path';
import { Context } from './context.js';

export function validateIfDirExists(ctx: Context, name: string, dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    ctx.log.error(`${name} option doesn't exist: ${dirPath}`);
  }
  const resolvedPath = path.resolve(dirPath);
  if (!fs.lstatSync(resolvedPath).isDirectory) {
    ctx.log.error(`${name} option not a directory: ${resolvedPath}`);
  }
}

export function validateIfFileExists(ctx: Context, name: string, filePath: string): void {
  if (!fs.existsSync(filePath)) {
    ctx.log.error(`${name} doesn't exist: ${filePath}`);
  }
  const resolvedFilePath = path.resolve(filePath);
  if (!fs.lstatSync(resolvedFilePath).isFile()) {
    ctx.log.error(`${name} not found: ${resolvedFilePath}`);
  }
}

export function readJsonFile(ctx: Context, filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath).toString('utf8'));
  } catch (e) {
    ctx.log.error(`Failed to read JSON file: ${filePath}`);
  }
}
