import type { PluginSettingsTabBaseConstructorParams } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';

import {
  Events,
  stringifyYaml
} from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { appendCodeBlock } from 'obsidian-dev-utils/html-element';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';
import { SettingGroupEx } from 'obsidian-dev-utils/obsidian/setting-group-ex';

import type { PluginSettings } from './plugin-settings.ts';

import { DEFAULT_CODE_BUTTON_BLOCK_CONFIG } from './code-button-block.ts';
import { PathSuggest } from './path-suggest.ts';

interface PluginSettingsTabConstructorParams extends PluginSettingsTabBaseConstructorParams<PluginSettings> {
  readonly pluginName: string;
}

export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  private readonly pluginName: string;

  public constructor(params: PluginSettingsTabConstructorParams) {
    super(params);
    this.pluginName = params.pluginName;
  }

  public override display(): void {
    super.display();
    this.containerEl.empty();
    const events = new Events();
    const that = this;

    new SettingGroupEx(this.containerEl)
      .setHeading('Paths')
      .addSettingEx((setting) => {
        setting
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
              }
            })
              // eslint-disable-next-line obsidianmd/ui/sentence-case -- wrong rule.
              .setPlaceholder('path/to/script/modules/root');

            new PathSuggest({
              app: this.app,
              getRootPath(): string {
                return '';
              },
              textInputEl: text.inputEl,
              type: 'folder'
            });
          });
      })
      .addSettingEx((setting) => {
        setting
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
            this.bind(text, 'invocableScriptsFolder')
              // eslint-disable-next-line obsidianmd/ui/sentence-case -- wrong rule.
              .setPlaceholder('path/to/invocable/scripts/folder');

            const suggest = new PathSuggest({
              app: this.app,
              getRootPath(): string {
                return that.pluginSettingsComponent.settings.modulesRoot;
              },
              textInputEl: text.inputEl,
              type: 'folder'
            });

            events.on('modulesRootChanged', () => {
              text.onChanged();
              suggest.refresh();
            });
          });
      })
      .addSettingEx((setting) => {
        setting
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
            this.bind(text, 'startupScriptPath')
              .setPlaceholder('path/to/startup.ts');
            const suggest = new PathSuggest({
              app: this.app,
              getRootPath(): string {
                return that.pluginSettingsComponent.settings.modulesRoot;
              },
              textInputEl: text.inputEl,
              type: 'file'
            });

            events.on('modulesRootChanged', () => {
              text.onChanged();
              suggest.refresh();
            });
          });
      });

    new SettingGroupEx(this.containerEl)
      .setHeading('Desktop')
      .addSettingEx((setting) => {
        setting
          .setName('Desktop: Synchronous fallback')
          .setDesc(createFragment((f) => {
            f.appendText('Whether to use a synchronous ');
            appendCodeBlock(f, 'require()');
            f.appendText('fallback if ');
            appendCodeBlock(f, 'requireAsync()');
            f.appendText(' failed ');
            f.createEl('strong', { text: '(Only on desktop)' });
            f.appendText('.');
          }))
          .addToggle((toggle) => {
            this.bind(toggle, 'shouldUseSyncFallback');
          });
      });

    const MAX_INTERVAL_FOR_SET_TIMEOUT = 2147483647;
    const MILLISECONDS_IN_SECOND = 1000;
    const MAX_CHECKING_INTERVAL_IN_SECONDS = MAX_INTERVAL_FOR_SET_TIMEOUT / MILLISECONDS_IN_SECOND;

    new SettingGroupEx(this.containerEl)
      .setHeading('Mobile')
      .addSettingEx((setting) => {
        setting
          .setName('Mobile: Changes checking interval')
          .setDesc(createFragment((f) => {
            f.appendText('Interval in seconds to check for changes in the invocable scripts folder ');
            f.createEl('strong', { text: '(Only on mobile)' });
            f.appendText('.');
            f.createEl('br');
            f.appendText('Set ');
            appendCodeBlock(f, '0');
            f.appendText(' to disable checking for changes.');
          }))
          .addNumber((text) => {
            this.bind(text, 'mobileChangesCheckingIntervalInSeconds')
              .setMin(0)
              .setMax(MAX_CHECKING_INTERVAL_IN_SECONDS);
          });
      });

    new SettingGroupEx(this.containerEl)
      .setHeading('Code button blocks')
      .addSettingEx((setting) => {
        setting
          .setName('Default code button config')
          .setDesc(createFragment((f) => {
            f.appendText('Default configuration applied to ');
            appendCodeBlock(f, '```code-button');
            f.appendText(' blocks.');
          }))
          .addCodeHighlighter((codeHighlighter) => {
            codeHighlighter.setLanguage('yaml');
            codeHighlighter.inputEl.addClass('default-code-button-config-control');
            this.bind(codeHighlighter, 'defaultCodeButtonConfig');
          });
      })
      .addSettingEx((setting) => {
        setting
          .addButton((button) =>
            button
              .setButtonText('Reset to plugin default code button config')
              .setWarning()
              .onClick(convertAsyncToSync(async () => {
                await this.pluginSettingsComponent.editAndSave((settings) => {
                  const yaml = stringifyYaml(DEFAULT_CODE_BUTTON_BLOCK_CONFIG);
                  settings.defaultCodeButtonConfig = `---\n${yaml}---`;
                });
                this.display();
              }))
          );
      });

    new SettingGroupEx(this.containerEl)
      .setHeading('Other')
      .addSettingEx((setting) => {
        setting
          .setName('Hotkeys')
          .setDesc('Hotkeys to invoke scripts.')
          .addButton((button) =>
            button
              .setButtonText('Configure')
              .setTooltip('Configure hotkeys')
              .onClick(() => {
                const hotkeysTab = this.app.setting.openTabById('hotkeys');
                hotkeysTab.searchComponent.setValue(`${this.pluginName}:`);
                hotkeysTab.updateHotkeyVisibility();
              })
          );
      })
      .addSettingEx((setting) => {
        setting
          .setName('Handle protocol URLs')
          .setDesc(createFragment((f) => {
            f.appendText('Whether to handle protocol URLs: ');
            appendCodeBlock(f, 'obsidian://CodeScriptToolkit?...');
            f.createEl('br');
            f.appendText('⚠️ WARNING: This allows arbitrary code execution, which could pose a security risk. Use with caution.');
          }))
          .addToggle((toggle) => {
            this.bind(toggle, 'shouldHandleProtocolUrls');
          });
      });
  }
}
