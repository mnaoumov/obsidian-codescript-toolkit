import type {
  App,
  MarkdownPostProcessorContext,
  PluginManifest,
  TFile
} from 'obsidian';
import type { Promisable } from 'type-fest';

import {
  getFrontMatterInfo,
  MarkdownRenderer,
  Notice,
  parseYaml,
  Plugin,
  stringifyYaml
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { printError } from 'obsidian-dev-utils/Error';
import {
  normalizeOptionalProperties,
  removeUndefinedProperties
} from 'obsidian-dev-utils/ObjectUtils';
import { getFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import {
  getCodeBlockArguments,
  replaceCodeBlock
} from 'obsidian-dev-utils/obsidian/MarkdownCodeBlockProcessor';
import { getOsAndObsidianUnsafePathCharsRegExp } from 'obsidian-dev-utils/obsidian/Validation';
import {
  basename,
  dirname
} from 'obsidian-dev-utils/Path';
import {
  assertAllTypeKeys,
  typeToDummyParam
} from 'obsidian-dev-utils/Type';

import { SequentialBabelPlugin } from './babel/CombineBabelPlugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/ConvertToCommonJsBabelPlugin.ts';
import { ReplaceDynamicImportBabelPlugin } from './babel/ReplaceDynamicImportBabelPlugin.ts';
import { WrapForCodeBlockBabelPlugin } from './babel/WrapForCodeBlockBabelPlugin.ts';
import { ConsoleWrapper } from './ConsoleWrapper.ts';
import { requireStringAsync } from './RequireHandlerUtils.ts';

type CodeButtonBlockScriptWrapper = (ctx: CodeButtonBlockScriptWrapperContext) => Promisable<void>;
interface CodeButtonBlockScriptWrapperContext {
  app: App;
  console: Console;
  container: HTMLElement;
  registerTempPlugin: RegisterTempPluginFn;
  renderMarkdown(markdown: string): Promise<void>;
  sourceFile: TFile;
}
interface HandleClickOptions {
  buttonIndex: number;
  escapedCaption: string;
  plugin: Plugin;
  resultEl: HTMLElement;
  shouldAutoOutput: boolean;
  shouldShowSystemMessages: boolean;
  shouldWrapConsole: boolean;
  source: string;
  sourceFile: TFile;
}

type RegisterTempPluginFn = (tempPluginClass: TempPluginClass) => void;

type TempPluginClass = new (app: App, manifest: PluginManifest) => Plugin;

const CODE_BUTTON_BLOCK_LANGUAGE = 'code-button';
const CODE_BUTTON_BLOCK_SCRIPT_WRAPPER_CONTEXT_KEYS = assertAllTypeKeys(typeToDummyParam<CodeButtonBlockScriptWrapperContext>(), [
  'app',
  'registerTempPlugin',
  'console',
  'container',
  'renderMarkdown',
  'sourceFile'
]);
const tempPlugins = new Map<string, Plugin>();

interface CodeButtonBlockConfig {
  caption: string;
  isRaw: boolean;
  shouldAutoOutput: boolean;
  shouldAutoRun: boolean;
  shouldShowSystemMessages: boolean;
  shouldWrapConsole: boolean;
}

export function registerCodeButtonBlock(plugin: Plugin): void {
  registerCodeHighlighting();
  plugin.register(unregisterCodeHighlighting);
  plugin.registerMarkdownCodeBlockProcessor(CODE_BUTTON_BLOCK_LANGUAGE, (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
    processCodeButtonBlock(plugin, source, el, ctx);
  });
}

export function unloadTempPlugins(): void {
  for (const tempPlugin of tempPlugins.values()) {
    tempPlugin.unload();
  }
}

function escapeForFileName(str: string): string {
  return str.replace(getOsAndObsidianUnsafePathCharsRegExp(), '_');
}

async function handleClick(options: HandleClickOptions): Promise<void> {
  options.resultEl.empty();
  const wrappedConsole = new ConsoleWrapper(options.resultEl);
  if (options.shouldShowSystemMessages) {
    wrappedConsole.writeSystemMessage('⏳ Executing...');
  }

  try {
    const script = makeWrapperScript(
      options.source,
      `${basename(options.sourceFile.path)}.code-button.${options.buttonIndex.toString()}.${options.escapedCaption}.ts`,
      dirname(options.sourceFile.path),
      options.shouldAutoOutput
    );
    const codeButtonBlockScriptWrapper = await requireStringAsync(
      script,
      `${
        options.plugin.app.vault.adapter.getFullPath(options.sourceFile.path).replaceAll('\\', '/')
      }.code-button.${options.buttonIndex.toString()}.${options.escapedCaption}.ts`
    ) as CodeButtonBlockScriptWrapper;
    const ctx: CodeButtonBlockScriptWrapperContext = {
      app: options.plugin.app,
      console: wrappedConsole.getConsoleInstance(options.shouldWrapConsole),
      container: options.resultEl,
      registerTempPlugin: makeRegisterTempPluginFn(options.plugin),
      renderMarkdown: makeRenderMarkdownFn(options.plugin, options.resultEl, options.sourceFile.path),
      sourceFile: options.sourceFile
    };
    await codeButtonBlockScriptWrapper(ctx);
    if (options.shouldShowSystemMessages) {
      wrappedConsole.writeSystemMessage('✅ Executed successfully');
    }
  } catch (error) {
    printError(error);
    wrappedConsole.appendToResultEl([error], 'error');
    if (options.shouldShowSystemMessages) {
      wrappedConsole.writeSystemMessage('❌ Executed with error!');
    }
  }
}

function makeRegisterTempPluginFn(plugin: Plugin): RegisterTempPluginFn {
  return (tempPluginClass) => {
    registerTempPluginImpl(plugin, tempPluginClass);
  };
}

function makeRenderMarkdownFn(plugin: Plugin, resultEl: HTMLElement, sourcePath: string): (markdown: string) => Promise<void> {
  return async (markdown: string) => {
    await MarkdownRenderer.render(plugin.app, markdown, resultEl, sourcePath, plugin);
  };
}

function makeWrapperScript(source: string, sourceFileName: string, sourceFolder: string, shouldAutoOutput: boolean): string {
  const result = new SequentialBabelPlugin([
    new ConvertToCommonJsBabelPlugin(),
    new WrapForCodeBlockBabelPlugin(shouldAutoOutput, CODE_BUTTON_BLOCK_SCRIPT_WRAPPER_CONTEXT_KEYS),
    new ReplaceDynamicImportBabelPlugin()
  ]).transform(source, sourceFileName, sourceFolder);

  if (result.error) {
    throw result.error;
  }

  return result.transformedCode;
}

const DEFAULT_CODE_BUTTON_BLOCK_CONFIG: CodeButtonBlockConfig = {
  caption: '(no caption)',
  isRaw: false,
  shouldAutoOutput: true,
  shouldAutoRun: false,
  shouldShowSystemMessages: true,
  shouldWrapConsole: true
};

let lastButtonIndex = 0;

function addLinkToDocs(f: DocumentFragment): void {
  f.appendText(' See ');
  f.createEl('a', { href: 'https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#code-buttons', text: 'docs' });
  f.appendText(' for more details.');
  f.createEl('br');
}

function getBooleanArgument(codeBlockArguments: string[], argumentName: string): boolean | undefined {
  if (codeBlockArguments.includes(argumentName) || codeBlockArguments.includes(`${argumentName}:true`)) {
    return true;
  }
  if (codeBlockArguments.includes(`${argumentName}:false`)) {
    return false;
  }
  return undefined;
}

function processCodeButtonBlock(plugin: Plugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
  lastButtonIndex++;
  const resultEl = el.createDiv({ cls: 'fix-require-modules console-log-container' });

  const codeBlockArguments = getCodeBlockArguments(ctx, el);

  const frontMatterInfo = getFrontMatterInfo(source);
  const code = source.slice(frontMatterInfo.contentStart);

  if (codeBlockArguments.length > 0) {
    new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
      f.appendText('❌ Error!\nYour code block uses legacy button config.');
      addLinkToDocs(f);
      f.createEl('button', {
        text: 'Update config'
      }, (button) => {
        button.addEventListener('click', () => {
          invokeAsyncSafely(async () => {
            const config: Partial<CodeButtonBlockConfig> = removeUndefinedProperties(normalizeOptionalProperties<Partial<CodeButtonBlockConfig>>({
              caption: codeBlockArguments[0],
              isRaw: getBooleanArgument(codeBlockArguments, 'raw'),
              shouldAutoOutput: getBooleanArgument(codeBlockArguments, 'autoOutput'),
              shouldAutoRun: getBooleanArgument(codeBlockArguments, 'autorun'),
              shouldShowSystemMessages: getBooleanArgument(codeBlockArguments, 'systemMessages'),
              shouldWrapConsole: getBooleanArgument(codeBlockArguments, 'console')
            }));
            const newSource = `\`\`\`code-button
---
${stringifyYaml(config)}---
${code}
\`\`\``;
            await replaceCodeBlock(plugin.app, ctx, el, newSource);
          });
        });
      });
    }));
    return;
  }

  if (!frontMatterInfo.exists) {
    const isInCallout = el.parentElement?.hasClass('callout-content');

    if (isInCallout) {
      new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
        f.appendText('❌ Error!\nYour code block does not have a config block.');
        addLinkToDocs(f);
        f.appendText('⚠️ Detecting legacy button config (if you have one) or inserting a sample config is not supported inside a callout.');
      }));
    } else {
      new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
        f.appendText('❌ Error!\nYour code block does not have a config block.');
        addLinkToDocs(f);
        f.createEl('button', {
          text: 'Insert sample config'
        }, (button) => {
          button.addEventListener('click', () => {
            invokeAsyncSafely(async () => {
              const newSource = `\`\`\`code-button
---
${stringifyYaml(DEFAULT_CODE_BUTTON_BLOCK_CONFIG)}---
${code}
\`\`\``;
              await replaceCodeBlock(plugin.app, ctx, el, newSource);
            });
          });
        });
      }));
    }
    return;
  }

  let config: Partial<CodeButtonBlockConfig>;

  try {
    config = parseYaml(frontMatterInfo.frontmatter) as Partial<CodeButtonBlockConfig> ?? {};
  } catch (error) {
    console.error(error);
    new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
      f.appendText('❌ Error!\nYour code block config is not a valid YAML.');
      addLinkToDocs(f);
      f.appendText('See the YAML parsing error in the console.');
    }));
    return;
  }

  if (config.isRaw) {
    if (Object.keys(config).length > 1) {
      new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
        f.appendText('❌ Error!\nThe `isRaw` setting is not allowed with other settings.');
        addLinkToDocs(f);
      }));
      return;
    }
    config.shouldAutoOutput = false;
    config.shouldAutoRun = true;
    config.shouldShowSystemMessages = false;
    config.shouldWrapConsole = false;
  }

  const fullConfig = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG, ...config };

  const handleClickOptions: HandleClickOptions = {
    buttonIndex: lastButtonIndex,
    escapedCaption: escapeForFileName(fullConfig.caption),
    plugin,
    resultEl: fullConfig.isRaw ? el : resultEl,
    shouldAutoOutput: fullConfig.shouldAutoOutput,
    shouldShowSystemMessages: fullConfig.shouldShowSystemMessages,
    shouldWrapConsole: fullConfig.shouldWrapConsole,
    source: code,
    sourceFile: getFile(plugin.app, ctx.sourcePath)
  };

  if (!fullConfig.isRaw) {
    el.createEl('button', {
      cls: 'mod-cta',
      async onclick(): Promise<void> {
        await handleClick(handleClickOptions);
      },
      prepend: true,
      text: fullConfig.caption
    });
  }

  if (fullConfig.shouldAutoRun) {
    invokeAsyncSafely(() => handleClick(handleClickOptions));
  }
}

function registerCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'text/typescript'));
}

function registerTempPluginImpl(plugin: Plugin, tempPluginClass: TempPluginClass): void {
  const tempPluginClassName = tempPluginClass.name || '_AnonymousPlugin';
  const app = plugin.app;
  const id = `__temp-plugin-${tempPluginClassName}`;

  const existingPlugin = tempPlugins.get(id);
  if (existingPlugin) {
    existingPlugin.unload();
  }

  const tempPlugin = new tempPluginClass(app, {
    author: '__Temp Plugin created by CodeScript Toolkit',
    description: '__Temp Plugin created by CodeScript Toolkit',
    id,
    minAppVersion: '0.0.1',
    name: `__Temp Plugin ${tempPluginClassName}`,
    version: '0.0.0'
  });

  const unloadCommandId = `unload-temp-plugin-${tempPluginClassName}`;

  tempPlugin.register(() => {
    tempPlugins.delete(id);
    plugin.removeCommand(unloadCommandId);
    new Notice(`Unloaded Temp Plugin: ${tempPluginClassName}.`);
  });

  tempPlugins.set(id, tempPlugin);
  plugin.addChild(tempPlugin);
  new Notice(`Loaded Temp Plugin: ${tempPluginClassName}.`);

  plugin.addCommand({
    callback: () => {
      tempPlugin.unload();
    },
    id: unloadCommandId,
    name: `Unload Temp Plugin: ${tempPluginClassName}`
  });
}

function unregisterCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'null'));
}
