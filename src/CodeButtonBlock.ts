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
  getCodeBlockMarkdownInfo,
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

interface CodeButtonBlockConfig {
  caption: string;
  isRaw: boolean;
  shouldAutoOutput: boolean;
  shouldAutoRun: boolean;
  shouldShowSystemMessages: boolean;
  shouldWrapConsole: boolean;
}

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

const DEFAULT_CODE_BUTTON_BLOCK_CONFIG: CodeButtonBlockConfig = {
  caption: '(no caption)',
  isRaw: false,
  shouldAutoOutput: true,
  shouldAutoRun: false,
  shouldShowSystemMessages: true,
  shouldWrapConsole: true
};

let lastButtonIndex = 0;

export function registerCodeButtonBlock(plugin: Plugin): void {
  registerCodeHighlighting();
  plugin.register(unregisterCodeHighlighting);
  plugin.registerMarkdownCodeBlockProcessor(CODE_BUTTON_BLOCK_LANGUAGE, (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
    invokeAsyncSafely(() => processCodeButtonBlock(plugin, source, el, ctx));
  });
}

export function unloadTempPlugins(): void {
  for (const tempPlugin of tempPlugins.values()) {
    tempPlugin.unload();
  }
}

function addLinkToDocs(f: DocumentFragment): void {
  f.appendText(' See ');
  f.createEl('a', { href: 'https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#code-buttons', text: 'docs' });
  f.appendText(' for more details.');
  f.createEl('br');
}

function escapeForFileName(str: string): string {
  return str.replace(getOsAndObsidianUnsafePathCharsRegExp(), '_');
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

async function processCodeButtonBlock(plugin: Plugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
  lastButtonIndex++;
  const resultEl = el.createDiv({ cls: 'fix-require-modules console-log-container' });

  const markdownInfo = await getCodeBlockMarkdownInfo({
    app: plugin.app,
    ctx,
    el,
    source
  });

  if (!markdownInfo) {
    new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
      f.appendText('❌ Error!\nCould not uniquely identify the code block. Try to modify its content for it to differ from other code blocks in the note.');
      addLinkToDocs(f);
    }));
    return;
  }

  const frontMatterInfo = getFrontMatterInfo(source);
  const code = source.slice(frontMatterInfo.contentStart);

  if (markdownInfo.args.length > 0) {
    new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
      f.appendText('❌ Error!\nYour code block uses legacy button config.');
      addLinkToDocs(f);
      f.createEl('button', {
        text: 'Update config'
      }, (button) => {
        button.addEventListener('click', () => {
          invokeAsyncSafely(async () => {
            const config: Partial<CodeButtonBlockConfig> = removeUndefinedProperties(normalizeOptionalProperties<Partial<CodeButtonBlockConfig>>({
              caption: markdownInfo.args[0],
              isRaw: getBooleanArgument(markdownInfo.args, 'raw'),
              shouldAutoOutput: getBooleanArgument(markdownInfo.args, 'autoOutput'),
              shouldAutoRun: getBooleanArgument(markdownInfo.args, 'autorun'),
              shouldShowSystemMessages: getBooleanArgument(markdownInfo.args, 'systemMessages'),
              shouldWrapConsole: getBooleanArgument(markdownInfo.args, 'console')
            }));
            const newCodeBlock = `\`\`\`code-button
---
${stringifyYaml(config)}---
${code}
\`\`\``;
            await replaceCodeBlock({
              app: plugin.app,
              codeBlockProvider: newCodeBlock,
              ctx,
              el,
              shouldPreserveLinePrefix: true,
              source
            });
          });
        });
      });
    }));
    return;
  }

  let config: Partial<CodeButtonBlockConfig>;

  try {
    config = parseYaml(frontMatterInfo.frontmatter) as (Partial<CodeButtonBlockConfig> | undefined) ?? {};
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
