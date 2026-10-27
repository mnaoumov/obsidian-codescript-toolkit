import type { TFile } from 'obsidian';

import { MonkeyAroundComponent } from '@mnaoumov/obsidian-lib/components/monkey-around-component';
import {
  castTo,
  getPrototypeOf
} from '@mnaoumov/typescript-lib/object-utils';

import type { RequireHandlerDesktopComponent } from './desktop-require-handler.ts';
import type { RequireFunction } from './require-handler.ts';

export class ModuleRequirePatchComponent extends MonkeyAroundComponent {
  public originalModulePrototypeRequire?: RequireFunction;

  public constructor(private readonly requireHandlerDesktopComponent: RequireHandlerDesktopComponent) {
    super();
  }

  public override onload(): void {
    const requireHandlerDesktopComponent = this.requireHandlerDesktopComponent;

    this.registerFunctionPatch({
      $object: getPrototypeOf(window.module),
      functionName: 'require',
      patchHandler: (originalFunction) => {
        this.originalModulePrototypeRequire = castTo<RequireFunction>(originalFunction);
        return modulePrototypeRequirePatched;

        // eslint-disable-next-line unicorn/consistent-function-scoping -- It captures `requireHandlerDesktopComponent`, and its `this: NodeJS.Module` typing needs a function declaration.
        function modulePrototypeRequirePatched(this: NodeJS.Module, id: string | TFile): unknown {
          return requireHandlerDesktopComponent.modulePrototypeRequire(id, this);
        }
      }
    });
  }
}
