import { transform as babelTransform } from '@babel/standalone';

import type {
  BabelPluginBaseTransformParams,
  TransformResult
} from './babel-plugin-base.ts';

import { BabelPluginBase } from './babel-plugin-base.ts';
import { transformImportMetaBabelPlugin } from './transform-import-meta-babel-plugin.ts';

interface TransformCodeToCommonJsData {
  hasTopLevelAwait: boolean;
}

export class ConvertToCommonJsBabelPlugin extends BabelPluginBase<TransformCodeToCommonJsData> {
  public constructor() {
    super({ hasTopLevelAwait: false });
  }

  // eslint-disable-next-line obsidian-dev-utils/params-options-name-match -- Overrides the base transform and must share its params type.
  public override transform(params: BabelPluginBaseTransformParams): TransformResult<TransformCodeToCommonJsData> {
    const { code, filename, folder } = params;
    try {
      const result = babelTransform(code, {
        ast: true,
        filename,
        parserOpts: {
          allowReturnOutsideFunction: true
        },
        plugins: [
          'transform-modules-commonjs',
          'transform-export-namespace-from',
          transformImportMetaBabelPlugin
        ],
        presets: ['typescript'],
        sourceMaps: 'inline',
        ...folder === undefined ? {} : { cwd: folder }
      });

      return {
        data: {
          /* v8 ignore start -- babel transform with ast:true always populates result.ast and extra. */
          hasTopLevelAwait: result.ast?.program.extra?.['topLevelAwait'] as boolean | undefined ?? false
          /* v8 ignore stop */
        },
        /* v8 ignore start -- babel transform always populates result.code. */
        transformedCode: result.code ?? ''
        /* v8 ignore stop */
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
