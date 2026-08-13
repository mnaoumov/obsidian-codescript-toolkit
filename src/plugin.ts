import { castTo } from 'obsidian-dev-utils/object-utils';
import { OpenDemoVaultCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/open-demo-vault-command-handler';
import { OpenSettingsCommandHandler } from 'obsidian-dev-utils/obsidian/command-handlers/open-settings-command-handler';
import { PluginSettingsTabComponent } from 'obsidian-dev-utils/obsidian/components/plugin-settings-tab-component';
import { PluginDataHandler } from 'obsidian-dev-utils/obsidian/data-handler';
import { PluginMarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import { PluginObsidianProtocolHandlerRegistrar } from 'obsidian-dev-utils/obsidian/obsidian-protocol-handler-registrar';
import { PluginBase } from 'obsidian-dev-utils/obsidian/plugin/plugin';
import { PluginEventSourceImpl } from 'obsidian-dev-utils/obsidian/plugin/plugin-event-source';

import { CodeButtonBlockComponent } from './code-button-block.ts';
import { CodeButtonCodeHighlighterComponent } from './code-button-code-highlighter-component.ts';
import { CodeScriptCodeHighlighterComponent } from './code-script-code-highlighter-component.ts';
import { ClearCacheCommandHandler } from './command-handlers/clear-cache-command-handler.ts';
import { InsertSampleCodeButtonCommandHandler } from './command-handlers/insert-sample-code-button-command-handler.ts';
import { InvokeScriptChooseCommandHandler } from './command-handlers/invoke-script-choose-command-handler.ts';
import { ReloadStartupScriptCommandHandler } from './command-handlers/reload-startup-script-command-handler.ts';
import { UnloadTempPluginsCommandHandler as UnloadTemporaryPluginsCommandHandler } from './command-handlers/unload-temp-plugins-command-handler.ts';
import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { ProtocolHandlerComponent } from './protocol-handler-component.ts';
import { RequireHandlerFactoryComponent } from './require-handlers/require-handler-factory.ts';
import { ScriptFolderWatcherFactoryComponent } from './script-folder-watchers/script-folder-watcher-factory.ts';
import { ScriptRegistryComponent } from './script-registry.ts';
import { ScriptManager } from './script.ts';
import { StartupScriptComponent } from './startup-script.ts';
// eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
import { TempPluginRegistryComponent } from './temp-plugin-registry.ts';

export class Plugin extends PluginBase {
  /**
   * The settings component, exposed so anything holding this plugin instance -- a script, another plugin,
   * `obsidian-dev-utils`' `configureCommunityPlugin` -- can read and change the settings of the RUNNING
   * plugin through {@link PluginSettingsComponent.editAndSave}, which both applies them immediately and
   * persists them. Writing `data.json` directly would need a reload to take effect.
   *
   * `PluginBase` owns the storage as a `protected` accessor; this override widens it back to `public` and
   * narrows the type to this plugin's own component, which is what those external callers need.
   *
   * @returns The settings component.
   */
  public override get pluginSettingsComponent(): PluginSettingsComponent {
    return castTo<PluginSettingsComponent>(super.pluginSettingsComponent);
  }

  /**
   * Sets the settings component.
   *
   * @param value - The settings component.
   */
  public override set pluginSettingsComponent(value: PluginSettingsComponent) {
    super.pluginSettingsComponent = value;
  }

  protected override async onloadImpl(): Promise<void> {
    const markdownCodeBlockProcessorRegistrar = new PluginMarkdownCodeBlockProcessorRegistrar(this);

    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        app: this.app,
        dataHandler: new PluginDataHandler(this),
        pluginEventSource: new PluginEventSourceImpl(this)
      })
    );
    this.pluginSettingsComponent = pluginSettingsComponent;

    // Since obsidian-dev-utils 90 a child is loaded as it is added, so the settings' async load tail runs
    // In parallel with the components added below instead of before them. Every one of them reads the
    // Settings as it loads — StartupScriptComponent asks for `getStartupScriptPath()` in its `onloadAsync`
    // And silently does nothing when it reads the empty default, so a configured startup script never ran.
    await pluginSettingsComponent.loadWithPromises();

    // eslint-disable-next-line unicorn/name-replacements -- The `temp` in this plugin's temp-plugin API is documented public surface (demo-vault/07 Code buttons in depth/43 Code button context.md) that user scripts call by name, so it is vocabulary rather than an abbreviation.
    const tempPluginRegistry = this.addChild(
      new TempPluginRegistryComponent({
        app: this.app,
        commandHandlerComponent: this.commandHandlerComponent,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent
      })
    );

    const requireHandlerFactory = this.addChild(
      new RequireHandlerFactoryComponent({
        app: this.app,
        consoleDebugComponent: this.consoleDebugComponent,
        pluginRequire: require,
        pluginSettingsComponent,

        tempPluginRegistry
      })
    );

    const startupScriptComponent = this.addChild(
      new StartupScriptComponent({
        app: this.app,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        requireHandlerFactoryComponent: requireHandlerFactory
      })
    );

    const scriptRegistry = this.addChild(
      new ScriptRegistryComponent({
        app: this.app,
        commandHandlerComponent: this.commandHandlerComponent,
        consoleDebugComponent: this.consoleDebugComponent,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        RequireHandlerFactoryComponent: requireHandlerFactory
      })
    );

    const scriptManager = new ScriptManager({
      app: this.app,
      consoleDebugComponent: this.consoleDebugComponent,
      pluginNoticeComponent: this.pluginNoticeComponent,
      pluginSettingsComponent,
      scriptRegistry
    });

    this.addChild(new CodeScriptCodeHighlighterComponent());
    this.addChild(new CodeButtonCodeHighlighterComponent());

    const pluginSettingsTab = new PluginSettingsTab({
      plugin: this,
      pluginName: this.manifest.name,
      pluginSettingsComponent
    });

    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab
      })
    );

    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new ClearCacheCommandHandler(requireHandlerFactory),
      new InsertSampleCodeButtonCommandHandler(),
      new InvokeScriptChooseCommandHandler(scriptManager),
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      }),
      new OpenSettingsCommandHandler({
        app: this.app,
        settingTab: pluginSettingsTab
      }),
      new ReloadStartupScriptCommandHandler(startupScriptComponent),
      new UnloadTemporaryPluginsCommandHandler(tempPluginRegistry)
    ]);

    this.addChild(
      new ProtocolHandlerComponent({
        consoleDebugComponent: this.consoleDebugComponent,
        obsidianProtocolHandlerRegistrar: new PluginObsidianProtocolHandlerRegistrar(this),
        pluginSettingsComponent,
        RequireHandlerFactoryComponent: requireHandlerFactory
      })
    );

    this.addChild(
      new ScriptFolderWatcherFactoryComponent({
        app: this.app,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginSettingsComponent,
        scriptManager
      })
    );

    this.addChild(
      new CodeButtonBlockComponent({
        app: this.app,
        markdownCodeBlockProcessorRegistrar,
        pluginSettingsComponent,
        RequireHandlerFactoryComponent: requireHandlerFactory,
        resourceLockComponent: this.resourceLockComponent,

        tempPluginRegistry
      })
    );
  }
}
