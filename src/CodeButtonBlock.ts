import type {
  App,
  MarkdownPostProcessorContext,
  PluginManifest,
  TFile
} from 'obsidian';
import type { Promisable } from 'type-fest';

import {
  MarkdownRenderer,
  Notice,
  Platform,
  Plugin
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { printError } from 'obsidian-dev-utils/Error';
import { getFile } from 'obsidian-dev-utils/obsidian/FileSystem';
import { getCodeBlockArguments } from 'obsidian-dev-utils/obsidian/MarkdownCodeBlockProcessor';
import {
  basename,
  dirname
} from 'obsidian-dev-utils/Path';
import { escapeRegExp } from 'obsidian-dev-utils/RegExp';
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
  const OBSIDIAN_FORBIDDEN_CHARACTERS = '#^[]|';
  const SYSTEM_FORBIDDEN_CHARACTERS = Platform.isWin ? '*\\/<>:|?"' : '\0/';
  const invalidCharacters = Array.from(new Set([...OBSIDIAN_FORBIDDEN_CHARACTERS.split(''), ...SYSTEM_FORBIDDEN_CHARACTERS.split('')])).join('');
  return str.replace(new RegExp(`[${escapeRegExp(invalidCharacters)}]`, 'g'), '_');
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
      wrappedConsole.writeSystemMessage('✔ Executed successfully');
    }
  } catch (error) {
    printError(error);
    wrappedConsole.appendToResultEl([error], 'error');
    if (options.shouldShowSystemMessages) {
      wrappedConsole.writeSystemMessage('✖ Executed with error!');
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

function processCodeButtonBlock(plugin: Plugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
  const sectionInfo = ctx.getSectionInfo(el);
  const resultEl = el.createDiv({ cls: 'fix-require-modules console-log-container' });

  if (sectionInfo) {
    const [
      caption = '(no caption)',
      ...rest
    ] = getCodeBlockArguments(ctx, el);

    const isRaw = rest.includes('raw');
    const shouldAutoRun = isRaw || rest.includes('autorun') || rest.includes('autorun:true');
    const shouldWrapConsole = !isRaw && !rest.includes('console:false');
    const shouldAutoOutput = !isRaw && !rest.includes('autoOutput:false');
    const shouldShowSystemMessages = !isRaw && !rest.includes('systemMessages:false');

    const lines = sectionInfo.text.split('\n');
    const previousLines = lines.slice(0, sectionInfo.lineStart);
    const previousText = previousLines.join('\n');
    const buttonIndex = Array.from(previousText.matchAll(new RegExp(`^(?:\`{3,}|~{3,})${CODE_BUTTON_BLOCK_LANGUAGE}`, 'gm'))).length;

    const handleClickOptions: HandleClickOptions = {
      buttonIndex,
      escapedCaption: escapeForFileName(caption),
      plugin,
      resultEl: isRaw ? el : resultEl,
      shouldAutoOutput,
      shouldShowSystemMessages,
      shouldWrapConsole,
      source,
      sourceFile: getFile(plugin.app, ctx.sourcePath)
    };

    if (!isRaw) {
      el.createEl('button', {
        cls: 'mod-cta',
        async onclick(): Promise<void> {
          await handleClick(handleClickOptions);
        },
        prepend: true,
        text: caption
      });
    }

    if (shouldAutoRun) {
      invokeAsyncSafely(() => handleClick(handleClickOptions));
    }
  }

  if (!sectionInfo) {
    new ConsoleWrapper(resultEl).writeSystemMessage('✖ Error!\nCould not get code block info. Try to reopen the note...');
  }
}

function registerCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'text/typescript'));
}

function registerTempPluginImpl(plugin: Plugin, tempPluginClass: TempPluginClass): void {
  const app = plugin.app;
  const id = `__temp-plugin-${tempPluginClass.name}`;

  const existingPlugin = tempPlugins.get(id);
  if (existingPlugin) {
    existingPlugin.unload();
  }

  const tempPlugin = new tempPluginClass(app, {
    author: '__Temp Plugin created by Fix Require Modules',
    description: '__Temp Plugin created by Fix Require Modules',
    id,
    minAppVersion: '0.0.1',
    name: `__Temp Plugin ${tempPluginClass.name}`,
    version: '0.0.0'
  });

  const unloadCommandId = `unload-temp-plugin-${tempPluginClass.name}`;

  tempPlugin.register(() => {
    tempPlugins.delete(id);
    plugin.removeCommand(unloadCommandId);
    new Notice(`Unloaded Temp Plugin: ${tempPluginClass.name}.`);
  });

  tempPlugins.set(id, tempPlugin);
  plugin.addChild(tempPlugin);
  new Notice(`Loaded Temp Plugin: ${tempPluginClass.name}.`);

  plugin.addCommand({
    callback: () => {
      tempPlugin.unload();
    },
    id: unloadCommandId,
    name: `Unload Temp Plugin: ${tempPluginClass.name}`
  });
}

function unregisterCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'null'));
}
