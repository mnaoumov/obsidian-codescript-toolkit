import type { SettingDefinitionItem } from 'obsidian';
import type { PluginSettingsTabBaseConstructorParams } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';

import {
  Events,
  stringifyYaml
} from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { appendCodeBlock } from 'obsidian-dev-utils/obsidian/html-element';
import { PluginSettingsTabBase } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';
import { EMPTY } from 'obsidian-dev-utils/string';
import { ValueWrapper } from 'obsidian-dev-utils/value-wrapper';

import type { PluginSettings } from './plugin-settings.ts';

import { DEFAULT_CODE_BUTTON_BLOCK_CONFIG } from './code-button-block.ts';
import { PathSuggest } from './path-suggest.ts';

interface PluginSettingsTabConstructorParams extends PluginSettingsTabBaseConstructorParams<PluginSettings> {
  readonly pluginName: string;
}

const MAX_INTERVAL_FOR_SET_TIMEOUT = 2147483647;
const MILLISECONDS_IN_SECOND = 1000;
const MAX_CHECKING_INTERVAL_IN_SECONDS = MAX_INTERVAL_FOR_SET_TIMEOUT / MILLISECONDS_IN_SECOND;

export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  private readonly pluginName: string;

  public constructor(params: PluginSettingsTabConstructorParams) {
    super(params);
    this.pluginName = params.pluginName;
  }

  protected override getSettingDefinitionItems(): SettingDefinitionItem[] {
    // Scoped to this build so the cross-row subscriptions the `render` callbacks make are discarded
    // Together with the definitions they belong to, exactly as they were per `displayLegacy()` call.
    const events = new Events();
    const thisWrapper = ValueWrapper.of(this);

    return [
      this.settingGroupEx({
        heading: 'Paths',
        items: [
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Path to the folder that is considered as ');
              appendCodeBlock(f, '/');
              f.appendText(' in ');
              appendCodeBlock(f, 'require("/script.js")');
              f.createEl('br');
              f.appendText('Leave blank to use the root of the vault.');
            }),
            name: 'Script modules root',
            render: (setting) => {
              setting.addText((text) => {
                this.bind({
                  onChanged: () => {
                    events.trigger('modulesRootChanged');
                  },
                  propertyName: 'modulesRoot',
                  valueComponent: text
                })
                  // Deliberate sentinel: the `${EMPTY}` prefix keeps the lowercase placeholder out of the
                  // `obsidianmd/ui/sentence-case` lint's static analysis, so it must not be removed.
                  .setPlaceholder(`${EMPTY}path/to/script/modules/root`);

                new PathSuggest({
                  app: this.app,
                  getRootPath(): string {
                    return '';
                  },
                  textInputEl: text.inputEl,
                  type: 'folder'
                });
              });
            }
          }),
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Path to the folder with invocable scripts.');
              f.createEl('br');
              f.appendText('Should be a relative path to the ');
              appendCodeBlock(f, 'Script modules root');
              f.createEl('br');
              f.appendText('Leave blank if you don\'t use invocable scripts.');
            }),
            name: 'Invocable scripts folder',
            render: (setting) => {
              setting.addText((text) => {
                this.bind({ propertyName: 'invocableScriptsFolder', valueComponent: text })
                  // Deliberate sentinel: the `${EMPTY}` prefix keeps the lowercase placeholder out of the
                  // `obsidianmd/ui/sentence-case` lint's static analysis, so it must not be removed.
                  .setPlaceholder(`${EMPTY}path/to/invocable/scripts/folder`);

                const suggest = new PathSuggest({
                  app: this.app,
                  getRootPath(): string {
                    return thisWrapper.value.pluginSettingsComponent.settings.modulesRoot;
                  },
                  textInputEl: text.inputEl,
                  type: 'folder'
                });

                events.on('modulesRootChanged', () => {
                  text.onChanged();
                  suggest.refresh();
                });
              });
            }
          }),
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Path to the invocable script executed on startup.');
              f.createEl('br');
              f.appendText('Should be a relative path to the ');
              appendCodeBlock(f, 'Script modules root');
              f.createEl('br');
              f.appendText('Leave blank if you don\'t use startup script.');
            }),
            name: 'Startup script path',
            render: (setting) => {
              setting.addText((text) => {
                this.bind({ propertyName: 'startupScriptPath', valueComponent: text })
                  .setPlaceholder('path/to/startup.ts');
                const suggest = new PathSuggest({
                  app: this.app,
                  getRootPath(): string {
                    return thisWrapper.value.pluginSettingsComponent.settings.modulesRoot;
                  },
                  textInputEl: text.inputEl,
                  type: 'file'
                });

                events.on('modulesRootChanged', () => {
                  text.onChanged();
                  suggest.refresh();
                });
              });
            }
          })
        ]
      }),
      this.settingGroupEx({
        heading: 'Desktop',
        items: [
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Whether to use a synchronous ');
              appendCodeBlock(f, 'require()');
              f.appendText('fallback if ');
              appendCodeBlock(f, 'requireAsync()');
              f.appendText(' failed ');
              f.createEl('strong', { text: '(Only on desktop)' });
              f.appendText('.');
            }),
            name: 'Desktop: Synchronous fallback',
            render: (setting) => {
              setting.addToggle((toggle) => {
                this.bind({ propertyName: 'shouldUseSyncFallback', valueComponent: toggle });
              });
            }
          })
        ]
      }),
      this.settingGroupEx({
        heading: 'Mobile',
        items: [
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Interval in seconds to check for changes in the invocable scripts folder ');
              f.createEl('strong', { text: '(Only on mobile)' });
              f.appendText('.');
              f.createEl('br');
              f.appendText('Set ');
              appendCodeBlock(f, '0');
              f.appendText(' to disable checking for changes.');
            }),
            name: 'Mobile: Changes checking interval',
            render: (setting) => {
              setting.addNumber((text) => {
                this.bind({ propertyName: 'mobileChangesCheckingIntervalInSeconds', valueComponent: text })
                  .setMin(0)
                  .setMax(MAX_CHECKING_INTERVAL_IN_SECONDS);
              });
            }
          })
        ]
      }),
      this.settingGroupEx({
        heading: 'Code button blocks',
        items: [
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Default configuration applied to ');
              appendCodeBlock(f, '```code-button');
              f.appendText(' blocks.');
            }),
            name: 'Default code button config',
            render: (setting) => {
              setting.addCodeHighlighter((codeHighlighter) => {
                codeHighlighter.setLanguage('yaml');
                codeHighlighter.inputEl.addClass('default-code-button-config-control');
                this.bind({ propertyName: 'defaultCodeButtonConfig', valueComponent: codeHighlighter });
              });
            }
          }),
          this.settingEx({
            name: '',
            render: (setting) => {
              setting.addButton((button) =>
                button
                  .setButtonText('Reset to plugin default code button config')
                  .setWarning()
                  .onClick(convertAsyncToSync(async () => {
                    await this.pluginSettingsComponent.editAndSave((settings) => {
                      const yaml = stringifyYaml(DEFAULT_CODE_BUTTON_BLOCK_CONFIG);
                      settings.defaultCodeButtonConfig = `---\n${yaml}---`;
                    });

                    this.refresh();
                  }))
              );
            },
            // The row is a bare action button with no name, so there is nothing to match on.
            searchable: false
          })
        ]
      }),
      this.settingGroupEx({
        heading: 'Other',
        items: [
          this.settingEx({
            desc: 'Hotkeys to invoke scripts.',
            name: 'Hotkeys',
            render: (setting) => {
              setting.addButton((button) =>
                button
                  .setButtonText('Configure')
                  .setTooltip('Configure hotkeys')
                  .onClick(() => {
                    const hotkeysTab = this.app.setting.openTabById('hotkeys');
                    hotkeysTab.searchComponent.setValue(`${this.pluginName}:`);
                    hotkeysTab.updateHotkeyVisibility();
                  })
              );
            }
          }),
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Whether to handle protocol URLs: ');
              appendCodeBlock(f, 'obsidian://CodeScriptToolkit?...');
              f.createEl('br');
              f.appendText('⚠️ WARNING: This allows arbitrary code execution, which could pose a security risk. Use with caution.');
            }),
            name: 'Handle protocol URLs',
            render: (setting) => {
              setting.addToggle((toggle) => {
                this.bind({ propertyName: 'shouldHandleProtocolUrls', valueComponent: toggle });
              });
            }
          }),
          this.settingEx({
            desc: 'Whether to show notices when the temp plugins are loaded/unloaded.',
            name: 'Should show temp plugin load/unload notices',
            render: (setting) => {
              setting.addToggle((toggle) => {
                this.bind({ propertyName: 'shouldShowTempPluginLoadUnloadNotices', valueComponent: toggle });
              });
            }
          })
        ]
      })
    ];
  }
}
