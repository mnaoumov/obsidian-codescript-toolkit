import type { TransformResult } from './babel-plugin-base.ts';

import { BabelPluginBase } from './babel-plugin-base.ts';

type MapDataListToPlugins<DataList extends unknown[]> = {
  [Data in keyof DataList]: BabelPluginBase<DataList[Data]>;
};

type TupleToIntersection<T extends readonly unknown[]> = T extends [infer Head, ...infer Tail] ? Head & TupleToIntersection<Tail>
  : unknown;

abstract class CombineBabelPlugins<DataList extends unknown[]> extends BabelPluginBase<TupleToIntersection<DataList>> {
  public constructor(protected readonly plugins: [...MapDataListToPlugins<DataList>]) {
    super(CombineBabelPlugins.combineData(plugins));
  }

  private static combineData<DataList extends unknown[]>(plugins: [...MapDataListToPlugins<DataList>]): TupleToIntersection<DataList> {
    return Object.assign({}, ...plugins.map((plugin) => plugin.data)) as TupleToIntersection<DataList>;
  }

  protected getCombinedData(): TupleToIntersection<DataList> {
    return CombineBabelPlugins.combineData(this.plugins);
  }
}

export class SequentialBabelPlugin<DataList extends unknown[]> extends CombineBabelPlugins<DataList> {
  // eslint-disable-next-line obsidian-dev-utils/require-super-call -- Intentionally replaces base transform with sequential multi-plugin pipeline.
  public override transform(code: string, filename: string, folder?: string): TransformResult<TupleToIntersection<DataList>> {
    for (const plugin of this.plugins) {
      try {
        const result = plugin.transform(code, filename, folder);

        if (result.error) {
          throw result.error;
        }
        code = result.transformedCode;
      } catch (e) {
        return {
          data: this.data,
          error: e as Error,
          transformedCode: ''
        };
      }
    }

    return {
      data: this.getCombinedData(),
      transformedCode: code
    };
  }
}
