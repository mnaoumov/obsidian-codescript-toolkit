import type { TFile } from 'obsidian';

import {
  castTo,
  getPrototypeOf
} from 'obsidian-dev-utils/object-utils';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';

import type { RequireHandlerDesktopComponent } from '../require-handlers/require-handler-desktop.ts';
import type { RequireFunction } from '../require-handlers/require-handler.ts';

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
