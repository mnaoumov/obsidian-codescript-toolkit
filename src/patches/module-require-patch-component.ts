import type { TFile } from 'obsidian';

import {
  castTo,
  getPrototypeOf
} from 'obsidian-dev-utils/object-utils';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';

import type { RequireHandlerDesktopComponent } from '../require-handlers/require-handler-desktop.ts';
import type { RequireFn } from '../require-handlers/require-handler.ts';

type ModuleProtoRequireFn = NodeJS.Module['require'];

export class ModuleRequirePatchComponent extends MonkeyAroundComponent {
  public originalModulePrototypeRequire?: RequireFn;

  public constructor(private readonly requireHandlerDesktopComponent: RequireHandlerDesktopComponent) {
    super();
  }

  public override onload(): void {
    const requireHandlerDesktopComponent = this.requireHandlerDesktopComponent;
    this.registerPatch(getPrototypeOf(window.module), {
      require: (originalFn: ModuleProtoRequireFn): ModuleProtoRequireFn => {
        this.originalModulePrototypeRequire = castTo<RequireFn>(originalFn);
        return function modulePrototypeRequirePatched(this: NodeJS.Module, id: string | TFile): unknown {
          return requireHandlerDesktopComponent.modulePrototypeRequire(id, this);
        };
      }
    });
  }
}
