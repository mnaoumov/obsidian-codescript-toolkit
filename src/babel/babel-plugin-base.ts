import type {
  File,
  PluginObject,
  PluginPass
} from '@babel/core';
import type { Visitor } from '@babel/traverse';

import { transform as babelTransform } from '@babel/standalone';
import { noop } from 'obsidian-dev-utils/function';
import { ValueWrapper } from 'obsidian-dev-utils/value-wrapper';

export interface TransformResult<Data> {
  readonly data: Data;
  readonly error?: Error;
  readonly transformedCode: string;
}

export abstract class BabelPluginBase<Data = unknown> {
  protected constructor(public readonly data: Data) {
    noop();
  }

  public getInherits(): PluginObject['inherits'] {
    return undefined;
  }

  public getVisitor(): Visitor<PluginPass> {
    noop();
    return {};
  }

  public manipulateOptions(_opts: unknown, _parserOpts: unknown): void {
    noop();
  }

  public transform(code: string, filename: string, folder?: string): TransformResult<Data> {
    try {
      const result = babelTransform(code, {
        filename,
        parserOpts: {
          allowReturnOutsideFunction: true
        },
        plugins: [
          (): PluginObject => this.getPluginObj()
        ],
        presets: ['typescript'],
        sourceMaps: 'inline',
        ...folder === undefined ? {} : { cwd: folder }
      });

      if (result.code === null || result.code === undefined) {
        throw new Error('Unknown error.');
      }

      return {
        data: this.data,
        transformedCode: result.code
      };
    } catch (e) {
      return {
        data: this.data,
        error: e as Error,
        transformedCode: ''
      };
    }
  }

  private getPluginObj(): PluginObject {
    const thisWrapper = ValueWrapper.of(this);
    const visitor = this.getVisitor();
    const inherits = this.getInherits();

    function manipulateOptions(opts: unknown, parserOpts: unknown): void {
      thisWrapper.value.manipulateOptions(opts, parserOpts);
    }

    function pre(this: PluginPass, file: File): void {
      thisWrapper.value.pre(this, file);
    }

    function post(this: PluginPass, file: File): void {
      thisWrapper.value.post(this, file);
    }

    return {
      manipulateOptions,
      post,
      pre,
      visitor,
      ...inherits === undefined ? {} : { inherits }
    };
  }

  private post(_state: PluginPass, _file: File): void {
    noop();
  }

  private pre(_state: PluginPass, _file: File): void {
    noop();
  }
}
