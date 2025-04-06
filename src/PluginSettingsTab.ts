import { Events } from 'obsidian';
import { appendCodeBlock } from 'obsidian-dev-utils/HTMLElement';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginSettingsTabBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';

import type { Plugin } from './Plugin.ts';

import { addPathSuggest } from './PathSuggest.ts';

export class CodeScriptToolkitPluginPluginSettingsTab extends PluginSettingsTabBase<Plugin> {
  public override display(): void {
    this.containerEl.empty();
    const events = new Events();

    new SettingEx(this.containerEl)
      .setName('Script modules root')
      .setDesc(createFragment((f) => {
        f.appendText('Path to the folder that is considered as ');
        appendCodeBlock(f, '/');
        f.appendText(' in ');
        appendCodeBlock(f, 'require("/script.js")');
        f.createEl('br');
        f.appendText('Leave blank to use the root of the vault.');
      }))
      .addText((text) => {
        this.bind(text, 'modulesRoot', {
          onChanged: () => {
            events.trigger('modulesRootChanged');
          },
          shouldShowValidationMessage: false
        })
          .setPlaceholder('path/to/script/modules/root');

        addPathSuggest(this.plugin.app, text.inputEl, () => '', 'folder');
      });

    new SettingEx(this.containerEl)
      .setName('Invocable scripts folder')
      .setDesc(createFragment((f) => {
        f.appendText('Path to the folder with invocable scripts.');
        f.createEl('br');
        f.appendText('Should be a relative path to the ');
        appendCodeBlock(f, 'Script modules root');
        f.createEl('br');
        f.appendText('Leave blank if you don\'t use invocable scripts.');
      }))
      .addText((text) => {
        this.bind(text, 'invocableScriptsFolder', {
          shouldShowValidationMessage: false
        })
          .setPlaceholder('path/to/invocable/scripts/folder');

        const suggest = addPathSuggest(this.plugin.app, text.inputEl, () => this.plugin.settings.modulesRoot, 'folder');

        events.on('modulesRootChanged', () => {
          text.onChanged();
          suggest.refresh();
        });
      });

    new SettingEx(this.containerEl)
      .setName('Startup script path')
      .setDesc(createFragment((f) => {
        f.appendText('Path to the invocable script executed on startup.');
        f.createEl('br');
        f.appendText('Should be a relative path to the ');
        appendCodeBlock(f, 'Script modules root');
        f.createEl('br');
        f.appendText('Leave blank if you don\'t use startup script.');
      }))
      .addText((text) => {
        this.bind(text, 'startupScriptPath', {
          shouldShowValidationMessage: false
        })
          .setPlaceholder('path/to/startup.ts');
        const suggest = addPathSuggest(this.plugin.app, text.inputEl, () => this.plugin.settings.modulesRoot, 'file');

        events.on('modulesRootChanged', () => {
          text.onChanged();
          suggest.refresh();
        });
      });

    new SettingEx(this.containerEl)
      .setName('Hotkeys')
      .setDesc('Hotkeys to invoke scripts.')
      .addButton((button) =>
        button
          .setButtonText('Configure')
          .setTooltip('Configure Hotkeys')
          .onClick(() => {
            const hotkeysTab = this.app.setting.openTabById('hotkeys');
            hotkeysTab.searchComponent.setValue(`${this.plugin.manifest.name}:`);
            hotkeysTab.updateHotkeyVisibility();
          })
      );

    new SettingEx(this.containerEl)
      .setName('Mobile: Changes checking interval')
      .setDesc(createFragment((f) => {
        f.appendText('Interval in seconds to check for changes in the invocable scripts folder ');
        f.createEl('strong', { text: '(only on mobile)' });
        f.appendText('.');
      }))
      .addNumber((text) => {
        this.bind(text, 'mobileChangesCheckingIntervalInSeconds')
          .setPlaceholder('30')
          .setMin(1);
      });

    new SettingEx(this.containerEl)
      .setName('Desktop: Synchronous fallback')
      .setDesc(createFragment((f) => {
        f.appendText('Whether to use a synchronous ');
        appendCodeBlock(f, 'require()');
        f.appendText('fallback if ');
        appendCodeBlock(f, 'requireAsync()');
        f.appendText(' failed ');
        f.createEl('strong', { text: '(only on desktop)' });
        f.appendText('.');
      }))
      .addToggle((toggle) => {
        this.bind(toggle, 'shouldUseSyncFallback');
      });
  }
}
