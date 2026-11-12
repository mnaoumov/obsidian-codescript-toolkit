import type { PluginSettingsTabBaseConstructorParams } from '@mnaoumov/obsidian-lib/plugin/plugin-settings-tab';
import type {
  SettingDefinitionItem,
  SettingGroupItem
} from 'obsidian';

import { appendCodeBlock } from '@mnaoumov/obsidian-lib/html-element';
import { PluginSettingsTabBase } from '@mnaoumov/obsidian-lib/plugin/plugin-settings-tab';
import { convertAsyncToSync } from '@mnaoumov/typescript-lib/async';
import { noop } from '@mnaoumov/typescript-lib/function';
import { EMPTY } from '@mnaoumov/typescript-lib/string';
import { ValueWrapper } from '@mnaoumov/typescript-lib/value-wrapper';
import {
  Events,
  stringifyYaml
} from 'obsidian';

import type { InvocableScriptsFolderTrust } from '../vault-scripts/invocable-scripts-folder-trust.ts';
import type { PluginSettings } from './plugin-settings.ts';

import { DEFAULT_CODE_BUTTON_BLOCK_CONFIG } from '../code-buttons/code-button-block.ts';
import { isSameOrUnderFolder } from '../vault-scripts/is-same-or-under-folder.ts';
import { PathSuggest } from './path-suggest.ts';

interface PluginSettingsTabConstructorParams extends PluginSettingsTabBaseConstructorParams<PluginSettings> {
  readonly invocableScriptsFolderTrust: InvocableScriptsFolderTrust;
  readonly pluginName: string;
  readonly registerInvocableScripts: () => Promise<void>;
}

const MAX_INTERVAL_FOR_SET_TIMEOUT = 2_147_483_647;
const MILLISECONDS_IN_SECOND = 1000;
const MAX_CHECKING_INTERVAL_IN_SECONDS = MAX_INTERVAL_FOR_SET_TIMEOUT / MILLISECONDS_IN_SECOND;

export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  private readonly invocableScriptsFolderTrust: InvocableScriptsFolderTrust;
  private readonly pluginName: string;
  private readonly registerInvocableScripts: () => Promise<void>;

  public constructor(params: PluginSettingsTabConstructorParams) {
    super(params);
    this.invocableScriptsFolderTrust = params.invocableScriptsFolderTrust;
    this.pluginName = params.pluginName;
    this.registerInvocableScripts = params.registerInvocableScripts;
  }

  protected override getSettingDefinitionItems(): SettingDefinitionItem[] {
    // Scoped to this build so the cross-row subscriptions the `render` callbacks make are discarded
    // together with the definitions they belong to, exactly as they were per `displayLegacy()` call.
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
              f.createEl('br');
              f.appendText('Scripts in this folder run as soon as they are registered, before you invoke them, so nothing in it is registered until you trust the folder on this device.');
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
              f.appendText('Whether the invocable scripts folder may run on this device.');
              f.createEl('br');
              f.appendText('Trust is stored on this device only and is never synced. Every folder you trust is kept in the ');
              appendCodeBlock(f, 'Trusted folders');
              f.appendText(' list below, and a folder inside a trusted folder is trusted too.');
              f.createEl('br');
              f.appendText('Untrusting the folder also removes every trusted folder that contains it.');
            }),
            name: 'Trust invocable scripts folder',
            render: (setting) => {
              const trust = this.invocableScriptsFolderTrust;
              setting.addButton((button) =>
                button
                  .setButtonText(trust.isTrusted() ? 'Untrust this folder' : 'Trust this folder')
                  .onClick(convertAsyncToSync(async () => {
                    if (trust.isTrusted()) {
                      trust.untrust();
                    } else if (!await trust.promptForTrust()) {
                      return;
                    }

                    await this.registerInvocableScripts();
                    this.refresh();
                  }))
              );
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
          }),
          this.settingEx({
            desc: createFragment((f) => {
              f.appendText('Path to the note holding the scratch script: a throwaway ');
              appendCodeBlock(f, '```code-script');
              f.appendText(' block run by the ');
              appendCodeBlock(f, 'Run scratch script');
              f.appendText(' command.');
              f.createEl('br');
              f.appendText('Should be a relative path to the ');
              appendCodeBlock(f, 'Script modules root');
              f.appendText('. The note is created on first use.');
            }),
            name: 'Scratch script path',
            render: (setting) => {
              setting.addText((text) => {
                this.bind({ propertyName: 'scratchScriptPath', valueComponent: text })
                  .setPlaceholder('Scratch script.md');
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
        heading: 'Trusted folders',
        items: this.getTrustedFolderItems()
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
                  .setDestructive()
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

  private getTrustedFolderItems(): SettingGroupItem[] {
    const trust = this.invocableScriptsFolderTrust;
    const trustedFolders = trust.getTrustedFolders();

    if (trustedFolders.length === 0) {
      return [
        this.settingEx({
          desc: 'Invocable scripts folders trusted on this device are listed here.',
          name: 'No folders are trusted on this device',
          render: noop
        })
      ];
    }

    const currentFolder = trust.getFolder();

    return trustedFolders.map((folder) =>
      this.settingEx({
        desc: isSameOrUnderFolder(currentFolder, folder)
          ? 'Trusts the current invocable scripts folder. Removing it stops its scripts until you trust the folder again.'
          : 'Not the current invocable scripts folder.',
        name: folder,
        render: (setting) => {
          setting.addButton((button) =>
            button
              .setButtonText('Remove')
              .setTooltip(`Stop trusting ${folder}`)
              .setDestructive()
              .onClick(convertAsyncToSync(async () => {
                trust.removeTrustedFolder(folder);
                await this.registerInvocableScripts();
                this.refresh();
              }))
          );
        }
      })
    );
  }
}
