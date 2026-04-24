import type {
  Editor,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { Promisable } from 'type-fest';

import {
  getFrontMatterInfo,
  parseYaml,
  stringifyYaml
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/async';
import { printError } from 'obsidian-dev-utils/error';
import {
  normalizeOptionalProperties,
  removeUndefinedProperties
} from 'obsidian-dev-utils/object-utils';
import { getFile } from 'obsidian-dev-utils/obsidian/file-system';
import {
  getCodeBlockMarkdownInfo,
  replaceCodeBlock
} from 'obsidian-dev-utils/obsidian/markdown-code-block-processor';
import { getOsAndObsidianUnsafePathCharsRegExp } from 'obsidian-dev-utils/obsidian/validation';
import {
  basename,
  dirname
} from 'obsidian-dev-utils/path';
import { indent } from 'obsidian-dev-utils/string';
import { getDataAdapterEx } from 'obsidian-typings/implementations';

import type { CodeButtonBlockConfig } from './code-button-block-config.ts';
import type { CodeButtonContext } from './code-button-context.ts';
import type { Plugin } from './plugin.ts';

import { SequentialBabelPlugin } from './babel/combine-babel-plugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/convert-to-common-js-babel-plugin.ts';
import { ReplaceDynamicImportBabelPlugin } from './babel/replace-dynamic-import-babel-plugin.ts';
import { WrapForCodeBlockBabelPlugin } from './babel/wrap-for-code-block-babel-plugin.ts';
import { CodeButtonContextImpl } from './code-button-context-impl.ts';
import { ConsoleWrapper } from './console-wrapper.ts';
import { requireStringAsync } from './require-handler-utils.ts';

type CodeButtonBlockScriptWrapper = (ctx: CodeButtonContext) => Promisable<void>;

interface HandleClickOptions {
  buttonIndex: number;
  code: string;
  codeButtonContext: CodeButtonContext;
  escapedCaption: string;
}

const CODE_BUTTON_BLOCK_LANGUAGE = 'code-button';

export const DEFAULT_CODE_BUTTON_BLOCK_CONFIG: CodeButtonBlockConfig = {
  caption: '(no caption)',
  isRaw: false,
  removeAfterExecution: {
    shouldKeepGap: false,
    when: 'never'
  },
  shouldAutoOutput: true,
  shouldAutoRun: false,
  shouldShowSystemMessages: true,
  shouldWrapConsole: true
};

let lastButtonIndex = 0;

export function insertSampleCodeButton(editor: Editor): void {
  const config = stringifyYaml(DEFAULT_CODE_BUTTON_BLOCK_CONFIG);
  let newCodeBlock = `\`\`\`code-button
---
${config}---
// Code
\`\`\``;
  const cursor = editor.getCursor('from');
  const line = editor.getLine(cursor.line);
  const PREFIX_LINE_REG_EXP = /^ {0,3}(?:> {1,3})*/g;
  const linePrefix = line.match(PREFIX_LINE_REG_EXP)?.[0] ?? '';
  newCodeBlock = indent(newCodeBlock, linePrefix);
  newCodeBlock = newCodeBlock.slice(0, cursor.ch) === line.slice(0, cursor.ch)
    ? newCodeBlock.slice(cursor.ch)
    : `\n${newCodeBlock}`;
  editor.replaceSelection(newCodeBlock);
}

export function registerCodeButtonBlock(plugin: Plugin): void {
  registerCodeHighlighting();
  plugin.register(unregisterCodeHighlighting);
  plugin.registerMarkdownCodeBlockProcessor(CODE_BUTTON_BLOCK_LANGUAGE, (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
    invokeAsyncSafely(() => processCodeButtonBlock(plugin, source, el, ctx));
  });
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
  options.codeButtonContext.container.empty();
  const wrappedConsole = new ConsoleWrapper(options.codeButtonContext.container);
  if (options.codeButtonContext.config.shouldShowSystemMessages) {
    wrappedConsole.writeSystemMessage('⏳ Executing...');
  }

  const adapter = getDataAdapterEx(options.codeButtonContext.app);

  let isSuccess = false;
  try {
    const script = makeWrapperScript(
      options.code,
      `${basename(options.codeButtonContext.sourceFile.path)}.code-button.${String(options.buttonIndex)}.${options.escapedCaption}.ts`,
      dirname(options.codeButtonContext.sourceFile.path),
      options.codeButtonContext.config.shouldAutoOutput
    );
    const codeButtonBlockScriptWrapper = await requireStringAsync(
      script,
      `${adapter.getFullPath(options.codeButtonContext.sourceFile.path).replaceAll('\\', '/')}.code-button.${
        String(options.buttonIndex)
      }.${options.escapedCaption}.ts`
    ) as CodeButtonBlockScriptWrapper;
    await codeButtonBlockScriptWrapper(options.codeButtonContext);
    if (options.codeButtonContext.config.shouldShowSystemMessages) {
      wrappedConsole.writeSystemMessage('✅ Executed successfully');
    }
    isSuccess = true;
  } catch (error) {
    printError(error);
    wrappedConsole.appendToResultEl([error], 'error');
    if (options.codeButtonContext.config.shouldShowSystemMessages) {
      wrappedConsole.writeSystemMessage('❌ Executed with error!');
    }
  } finally {
    let shouldRemoveButton = false;
    switch (options.codeButtonContext.config.removeAfterExecution.when) {
      case 'always':
        shouldRemoveButton = true;
        break;
      case 'never':
        break;
      case 'onError':
        shouldRemoveButton = !isSuccess;
        break;
      case 'onSuccess':
        shouldRemoveButton = isSuccess;
        break;
      default:
        console.error(`Unknown remove after execution mode: ${options.codeButtonContext.config.removeAfterExecution.when as string}`);
        break;
    }
    if (shouldRemoveButton) {
      if (options.codeButtonContext.markdownInfo) {
        try {
          await options.codeButtonContext.removeCodeButtonBlock(options.codeButtonContext.config.removeAfterExecution.shouldKeepGap);
        } catch (error) {
          printError(error);
          wrappedConsole.appendToResultEl([error], 'error');
        }
      } else {
        wrappedConsole.writeSystemMessage('❌ Cannot remove the code button block after execution, because it cannot be uniquely identified!');
      }
    }
  }
}

function makeWrapperScript(source: string, sourceFileName: string, sourceFolder: string, shouldAutoOutput: boolean): string {
  const result = new SequentialBabelPlugin([
    new ConvertToCommonJsBabelPlugin(),
    new WrapForCodeBlockBabelPlugin(shouldAutoOutput),
    new ReplaceDynamicImportBabelPlugin()
  ]).transform(source, sourceFileName, sourceFolder);

  if (result.error) {
    throw result.error;
  }

  return result.transformedCode;
}

async function processCodeButtonBlock(plugin: Plugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
  const sourceFile = getFile(plugin.app, ctx.sourcePath);
  lastButtonIndex++;
  const resultEl = el.createDiv({ cls: 'fix-require-modules console-log-container' });

  const markdownInfo = await getCodeBlockMarkdownInfo({
    app: plugin.app,
    ctx,
    el,
    source
  });

  const frontMatterInfo = getFrontMatterInfo(source);
  const code = source.slice(frontMatterInfo.contentStart);

  if (markdownInfo && markdownInfo.args.length > 0) {
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
              ctx: updateSourcePath(ctx, sourceFile),
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

  config = { ...plugin.settingsManager.parseDefaultCodeButtonConfig(), ...config };

  if (config.isRaw) {
    config.shouldAutoOutput = false;
    config.shouldAutoRun = true;
    config.shouldShowSystemMessages = false;
    config.shouldWrapConsole = false;
  }

  const fullConfig = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG, ...config };
  fullConfig.removeAfterExecution = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG.removeAfterExecution, ...config.removeAfterExecution };

  if (!fullConfig.isRaw) {
    el.createEl('button', {
      cls: 'mod-cta',
      async onclick(): Promise<void> {
        await handleClick(createHandleClickOptions());
      },
      prepend: true,
      text: fullConfig.caption
    });
  }

  if (fullConfig.shouldAutoRun) {
    invokeAsyncSafely(() => handleClick(createHandleClickOptions()));
  }

  function createHandleClickOptions(): HandleClickOptions {
    return {
      buttonIndex: lastButtonIndex,
      code,
      codeButtonContext: new CodeButtonContextImpl({
        config: fullConfig,
        markdownInfo,
        markdownPostProcessorContext: updateSourcePath(ctx, sourceFile),
        parentEl: el,
        plugin,
        resultEl,
        source
      }),
      escapedCaption: escapeForFileName(fullConfig.caption)
    };
  }
}

function registerCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'text/typescript'));
}

function unregisterCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'null'));
}

function updateSourcePath(ctx: MarkdownPostProcessorContext, sourceFile: TFile): MarkdownPostProcessorContext {
  return {
    ...ctx,
    sourcePath: sourceFile.path
  };
}
