import type {
  Editor,
  MarkdownPostProcessorContext
} from 'obsidian';
import type { Promisable } from 'type-fest';

import {
  getFrontMatterInfo,
  parseYaml,
  stringifyYaml
} from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { printError } from 'obsidian-dev-utils/Error';
import {
  normalizeOptionalProperties,
  removeUndefinedProperties
} from 'obsidian-dev-utils/ObjectUtils';
import {
  getCodeBlockMarkdownInfo,
  replaceCodeBlock
} from 'obsidian-dev-utils/obsidian/MarkdownCodeBlockProcessor';
import { getOsAndObsidianUnsafePathCharsRegExp } from 'obsidian-dev-utils/obsidian/Validation';
import {
  basename,
  dirname
} from 'obsidian-dev-utils/Path';
import { indent } from 'obsidian-dev-utils/String';

import type { CodeButtonBlockConfig } from './CodeButtonBlockConfig.ts';
import type { CodeButtonContext } from './CodeButtonContext.ts';
import type { Plugin } from './Plugin.ts';

import { SequentialBabelPlugin } from './babel/CombineBabelPlugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/ConvertToCommonJsBabelPlugin.ts';
import { ReplaceDynamicImportBabelPlugin } from './babel/ReplaceDynamicImportBabelPlugin.ts';
import { WrapForCodeBlockBabelPlugin } from './babel/WrapForCodeBlockBabelPlugin.ts';
import { CodeButtonContextImpl } from './CodeButtonContextImpl.ts';
import { ConsoleWrapper } from './ConsoleWrapper.ts';
import { requireStringAsync } from './RequireHandlerUtils.ts';

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

const FORBIDDEN_KEYS_FOR_RAW_MODE: (keyof CodeButtonBlockConfig)[] = [
  'caption',
  'shouldAutoOutput',
  'shouldAutoRun',
  'shouldShowSystemMessages',
  'shouldWrapConsole'
];

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
      `${options.codeButtonContext.app.vault.adapter.getFullPath(options.codeButtonContext.sourceFile.path).replaceAll('\\', '/')}.code-button.${
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
      await options.codeButtonContext.removeCodeButtonBlock(options.codeButtonContext.config.removeAfterExecution.shouldKeepGap);
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

  config = { ...plugin.settingsManager.parseDefaultCodeButtonConfig(), ...config };

  if (config.isRaw) {
    for (const key of Object.keys(config) as (keyof CodeButtonBlockConfig)[]) {
      if (FORBIDDEN_KEYS_FOR_RAW_MODE.includes(key)) {
        new ConsoleWrapper(resultEl).writeSystemMessage(createFragment((f) => {
          f.appendText(`❌ Error!\nThe \`${key}\` setting is not allowed with \`isRaw: true\`.`);
          addLinkToDocs(f);
        }));
        return;
      }
    }

    config.shouldAutoOutput = false;
    config.shouldAutoRun = true;
    config.shouldShowSystemMessages = false;
    config.shouldWrapConsole = false;
  }

  const fullConfig = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG, ...config };
  fullConfig.removeAfterExecution = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG.removeAfterExecution, ...config.removeAfterExecution };

  const handleClickOptions: HandleClickOptions = {
    buttonIndex: lastButtonIndex,
    code,
    codeButtonContext: new CodeButtonContextImpl({
      config: fullConfig,
      markdownInfo,
      markdownPostProcessorContext: ctx,
      parentEl: el,
      plugin,
      resultEl,
      source
    }),
    escapedCaption: escapeForFileName(fullConfig.caption)
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

function unregisterCodeHighlighting(): void {
  window.CodeMirror.defineMode(CODE_BUTTON_BLOCK_LANGUAGE, (config) => window.CodeMirror.getMode(config, 'null'));
}
