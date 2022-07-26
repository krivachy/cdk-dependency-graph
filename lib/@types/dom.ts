// Workaround from: https://stackoverflow.com/a/69581652/1697985
export {};

declare global {
  type ReadableStream = unknown;
}
