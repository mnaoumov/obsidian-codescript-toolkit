import { transform as babelTransform } from '@babel/standalone';
import babelPluginTransformImportMeta from 'babel-plugin-transform-import-meta';

import type { TransformResult } from './babel-plugin-base.ts';

import { BabelPluginBase } from './babel-plugin-base.ts';

interface TransformCodeToCommonJsData {
  hasTopLevelAwait: boolean;
}

export class ConvertToCommonJsBabelPlugin extends BabelPluginBase<TransformCodeToCommonJsData> {
  public constructor() {
    super({ hasTopLevelAwait: false });
  }

  public override transform(code: string, filename: string, folder?: string): TransformResult<TransformCodeToCommonJsData> {
    try {
      const result = babelTransform(code, {
        ast: true,
        cwd: folder,
        filename,
        parserOpts: {
          allowReturnOutsideFunction: true
        },
        plugins: [
          'transform-modules-commonjs',
          'transform-export-namespace-from',
          [babelPluginTransformImportMeta(), { module: 'ES6' }]
        ],
        presets: ['typescript'],
        sourceMaps: 'inline'
      });

      return {
        data: {
          hasTopLevelAwait: result.ast?.program.extra?.['topLevelAwait'] as boolean | undefined ?? false
        },
        transformedCode: result.code ?? ''
      };
    } catch (e) {
      return {
        data: {
          hasTopLevelAwait: false
        },
        error: e as Error,
        transformedCode: ''
      };
    }
  }
}
