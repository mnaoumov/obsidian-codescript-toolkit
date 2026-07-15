import type { SettingDefinitionItem } from 'obsidian';
import type { PluginSettingsTabBaseConstructorParams } from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';

import {
  Events,
  requireApiVersion,
  stringifyYaml
} from 'obsidian';
import { convertAsyncToSync } from 'obsidian-dev-utils/async';
import { castTo } from 'obsidian-dev-utils/object-utils';
import { appendCodeBlock } from 'obsidian-dev-utils/obsidian/html-element';
import {
  PluginSettingsTabBase,
  SAVE_TO_FILE_CONTEXT
} from 'obsidian-dev-utils/obsidian/plugin/plugin-settings-tab';
import { CodeHighlighterComponent } from 'obsidian-dev-utils/obsidian/setting-components/code-highlighter-component';
import { SettingGroupEx } from 'obsidian-dev-utils/obsidian/setting-group-ex';
import { EMPTY } from 'obsidian-dev-utils/string';
import { ValueWrapper } from 'obsidian-dev-utils/value-wrapper';

import type { PluginSettings } from './plugin-settings.ts';

import { DEFAULT_CODE_BUTTON_BLOCK_CONFIG } from './code-button-block.ts';
import { PathSuggest } from './path-suggest.ts';

interface PluginSettingsTabConstructorParams extends PluginSettingsTabBaseConstructorParams<PluginSettings> {
  readonly pluginName: string;
}

type PluginSettingsKey = Exclude<keyof PluginSettings, 'getInvocableScriptsFolder' | 'getStartupScriptPath'>;

export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  private readonly pluginName: string;

  public constructor(params: PluginSettingsTabConstructorParams) {
    super(params);
    this.pluginName = params.pluginName;
  }

  public override displayLegacy(): void {
    super.displayLegacy();

    const events = new Events();
    const thisWrapper = ValueWrapper.of(this);

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
            this.bind({ propertyName: 'shouldUseSyncFallback', valueComponent: toggle });
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
            this.bind({ propertyName: 'mobileChangesCheckingIntervalInSeconds', valueComponent: text })
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
            this.bind({ propertyName: 'defaultCodeButtonConfig', valueComponent: codeHighlighter });
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

                this.displayLegacy();
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
            this.bind({ propertyName: 'shouldHandleProtocolUrls', valueComponent: toggle });
          });
      })
      .addSettingEx((setting) => {
        setting
          .setName('Should show temp plugin load/unload notices')
          .setDesc('Whether to show notices when the temp plugins are loaded/unloaded.')
          .addToggle((toggle) => {
            this.bind({ propertyName: 'shouldShowTempPluginLoadUnloadNotices', valueComponent: toggle });
          });
      });
  }

  public override getControlValue(key: string): unknown {
    const settings = this.pluginSettingsComponent.settingsState.inputValues;
    if (!Object.hasOwn(settings, key)) {
      return undefined;
    }

    return settings[castTo<PluginSettingsKey>(key)];
  }

  public override getSettingDefinitions(): SettingDefinitionItem<PluginSettingsKey>[] {
    if (!requireApiVersion('1.13.0')) {
      return [];
    }

    const events = new Events();
    const thisWrapper = ValueWrapper.of(this);
    const MAX_INTERVAL_FOR_SET_TIMEOUT = 2147483647;
    const MILLISECONDS_IN_SECOND = 1000;
    const MAX_CHECKING_INTERVAL_IN_SECONDS = MAX_INTERVAL_FOR_SET_TIMEOUT / MILLISECONDS_IN_SECOND;

    return [
      {
        heading: 'Paths',
        items: [
          {
            desc: createFragment((f) => {
              f.appendText('Path to the folder that is considered as ');
              appendCodeBlock(f, '/');
              f.appendText(' in ');
              appendCodeBlock(f, 'require("/script.js")');
              f.createEl('br');
              f.appendText('Leave blank to use the root of the vault.');
            }),
            name: 'Script modules root',
            render: (setting): void => {
              setting.addText((text) => {
                text
                  .setPlaceholder(`${EMPTY}path/to/script/modules/root`)
                  .setValue(this.pluginSettingsComponent.settingsState.inputValues.modulesRoot)
                  .onChange(convertAsyncToSync(async (value) => {
                    await this.setRenderedControlValue('modulesRoot', value, text.inputEl);
                    events.trigger('modulesRootChanged');
                  }));

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
          },
          {
            desc: createFragment((f) => {
              f.appendText('Path to the folder with invocable scripts.');
              f.createEl('br');
              f.appendText('Should be a relative path to the ');
              appendCodeBlock(f, 'Script modules root');
              f.createEl('br');
              f.appendText('Leave blank if you don\'t use invocable scripts.');
            }),
            name: 'Invocable scripts folder',
            render: (setting): void => {
              setting.addText((text) => {
                text
                  .setPlaceholder(`${EMPTY}path/to/invocable/scripts/folder`)
                  .setValue(this.pluginSettingsComponent.settingsState.inputValues.invocableScriptsFolder)
                  .onChange(convertAsyncToSync((value) => this.setRenderedControlValue('invocableScriptsFolder', value, text.inputEl)));

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
          },
          {
            desc: createFragment((f) => {
              f.appendText('Path to the invocable script executed on startup.');
              f.createEl('br');
              f.appendText('Should be a relative path to the ');
              appendCodeBlock(f, 'Script modules root');
              f.createEl('br');
              f.appendText('Leave blank if you don\'t use startup script.');
            }),
            name: 'Startup script path',
            render: (setting): void => {
              setting.addText((text) => {
                text
                  .setPlaceholder('path/to/startup.ts')
                  .setValue(this.pluginSettingsComponent.settingsState.inputValues.startupScriptPath)
                  .onChange(convertAsyncToSync((value) => this.setRenderedControlValue('startupScriptPath', value, text.inputEl)));

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
          }
        ],
        type: 'group'
      },
      {
        heading: 'Desktop',
        items: [
          {
            control: { key: 'shouldUseSyncFallback', type: 'toggle' },
            desc: createFragment((f) => {
              f.appendText('Whether to use a synchronous ');
              appendCodeBlock(f, 'require()');
              f.appendText(' fallback if ');
              appendCodeBlock(f, 'requireAsync()');
              f.appendText(' failed ');
              f.createEl('strong', { text: '(Only on desktop)' });
              f.appendText('.');
            }),
            name: 'Desktop: Synchronous fallback'
          }
        ],
        type: 'group'
      },
      {
        heading: 'Mobile',
        items: [
          {
            control: {
              key: 'mobileChangesCheckingIntervalInSeconds',
              max: MAX_CHECKING_INTERVAL_IN_SECONDS,
              min: 0,
              type: 'number'
            },
            desc: createFragment((f) => {
              f.appendText('Interval in seconds to check for changes in the invocable scripts folder ');
              f.createEl('strong', { text: '(Only on mobile)' });
              f.appendText('.');
              f.createEl('br');
              f.appendText('Set ');
              appendCodeBlock(f, '0');
              f.appendText(' to disable checking for changes.');
            }),
            name: 'Mobile: Changes checking interval'
          }
        ],
        type: 'group'
      },
      {
        heading: 'Code button blocks',
        items: [
          {
            desc: createFragment((f) => {
              f.appendText('Default configuration applied to ');
              appendCodeBlock(f, '```code-button');
              f.appendText(' blocks.');
            }),
            name: 'Default code button config',
            render: (setting): void => {
              const codeHighlighter = new CodeHighlighterComponent(setting.controlEl);
              codeHighlighter
                .setLanguage('yaml')
                .setValue(this.pluginSettingsComponent.settingsState.inputValues.defaultCodeButtonConfig)
                .onChange(convertAsyncToSync((value) => this.setRenderedControlValue('defaultCodeButtonConfig', value, codeHighlighter.inputEl)));
              codeHighlighter.inputEl.addClass('default-code-button-config-control');
            }
          },
          {
            name: 'Reset default code button config',
            render: (setting): void => {
              setting.addButton((button) =>
                button
                  .setButtonText('Reset to plugin default code button config')
                  .setWarning()
                  .onClick(convertAsyncToSync(async () => {
                    await this.pluginSettingsComponent.editAndSave((settings) => {
                      const yaml = stringifyYaml(DEFAULT_CODE_BUTTON_BLOCK_CONFIG);
                      settings.defaultCodeButtonConfig = `---\n${yaml}---`;
                    });

                    if (requireApiVersion('1.13.0')) {
                      this.update();
                    }
                  }))
              );
            }
          }
        ],
        type: 'group'
      },
      {
        heading: 'Other',
        items: [
          {
            desc: 'Hotkeys to invoke scripts.',
            name: 'Hotkeys',
            render: (setting): void => {
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
          },
          {
            control: { key: 'shouldHandleProtocolUrls', type: 'toggle' },
            desc: createFragment((f) => {
              f.appendText('Whether to handle protocol URLs: ');
              appendCodeBlock(f, 'obsidian://CodeScriptToolkit?...');
              f.createEl('br');
              f.appendText('⚠️ WARNING: This allows arbitrary code execution, which could pose a security risk. Use with caution.');
            }),
            name: 'Handle protocol URLs'
          },
          {
            control: { key: 'shouldShowTempPluginLoadUnloadNotices', type: 'toggle' },
            desc: 'Whether to show notices when the temp plugins are loaded/unloaded.',
            name: 'Should show temp plugin load/unload notices'
          }
        ],
        type: 'group'
      }
    ];
  }

  public override async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.pluginSettingsComponent.settingsState.inputValues;
    if (!Object.hasOwn(settings, key)) {
      return;
    }

    const propertyName = castTo<PluginSettingsKey>(key);
    await this.pluginSettingsComponent.setProperty(propertyName, castTo<PluginSettings[typeof propertyName]>(value));
    await this.pluginSettingsComponent.saveToFile(SAVE_TO_FILE_CONTEXT);
  }

  private async setRenderedControlValue<PropertyName extends PluginSettingsKey>(
    propertyName: PropertyName,
    value: PluginSettings[PropertyName],
    inputEl: HTMLInputElement | HTMLTextAreaElement
  ): Promise<void> {
    const validationMessage = await this.pluginSettingsComponent.setProperty(propertyName, value);
    inputEl.setCustomValidity(validationMessage);
    inputEl.reportValidity();
    await this.pluginSettingsComponent.saveToFile(SAVE_TO_FILE_CONTEXT);
  }
}
