declare module '@babel/standalone' {
  import type {
    FileResult,
    InputOptions
  } from '@babel/core';

  export interface BabelTransformResult {
    readonly ast?: FileResult['ast'];
    readonly code?: FileResult['code'];
    readonly map?: FileResult['map'];
    readonly metadata?: FileResult['metadata'];
  }

  export function transform(code: string, options?: InputOptions): BabelTransformResult;
}
