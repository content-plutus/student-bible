declare module "safe-regex" {
  interface SafeRegexOptions {
    limit?: number;
  }
  function safeRegex(pattern: string | RegExp, options?: SafeRegexOptions): boolean;
  export default safeRegex;
}
