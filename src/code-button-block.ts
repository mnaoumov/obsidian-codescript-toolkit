import type {
  App,
  Editor,
  MarkdownPostProcessorContext,
  TFile
} from 'obsidian';
import type { MarkdownCodeBlockProcessorRegistrar } from 'obsidian-dev-utils/obsidian/markdown-code-block-processor-registrar';
import type { Promisable } from 'type-fest';

import {
  Component,
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
import type { PluginSettingsComponent } from './plugin-settings-component.ts';
import type { RequireHandlerFactory } from './require-handlers/require-handler-factory.ts';

import { SequentialBabelPlugin } from './babel/combine-babel-plugins.ts';
import { ConvertToCommonJsBabelPlugin } from './babel/convert-to-common-js-babel-plugin.ts';
import { ReplaceDynamicImportBabelPlugin } from './babel/replace-dynamic-import-babel-plugin.ts';
import { WrapForCodeBlockBabelPlugin } from './babel/wrap-for-code-block-babel-plugin.ts';
import { CodeButtonContextImpl } from './code-button-context-impl.ts';
import { ConsoleWrapper } from './console-wrapper.ts';
import { TempPluginRegistry } from './temp-plugin-registry.ts';

type CodeButtonBlockScriptWrapper = (ctx: CodeButtonContext) => Promisable<void>;

interface HandleClickParams {
  readonly buttonIndex: number;
  readonly code: string;
  readonly codeButtonContext: CodeButtonContext;
  readonly escapedCaption: string;
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

interface CodeButtonBlockComponentConstructorParams {
  readonly app: App;
  readonly markdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  readonly pluginSettingsComponent: PluginSettingsComponent;
  readonly requireHandlerFactory: RequireHandlerFactory;
  readonly tempPluginRegistry: TempPluginRegistry;
}

interface ProcessCodeButtonBlockParams {
  readonly ctx: MarkdownPostProcessorContext;
  readonly el: HTMLElement;
  readonly source: string;
}

export class CodeButtonBlockComponent extends Component {
  private readonly app: App;
  private readonly markdownCodeBlockProcessorRegistrar: MarkdownCodeBlockProcessorRegistrar;
  private readonly pluginSettingsComponent: PluginSettingsComponent;
  private readonly requireHandlerFactory: RequireHandlerFactory;
  private readonly tempPluginRegistry: TempPluginRegistry;

  public constructor(params: CodeButtonBlockComponentConstructorParams) {
    super();
    this.app = params.app;
    this.markdownCodeBlockProcessorRegistrar = params.markdownCodeBlockProcessorRegistrar;
    this.pluginSettingsComponent = params.pluginSettingsComponent;
    this.requireHandlerFactory = params.requireHandlerFactory;
    this.tempPluginRegistry = params.tempPluginRegistry;
  }

  public async handleClick(params: HandleClickParams): Promise<void> {
    params.codeButtonContext.container.empty();
    const wrappedConsole = new ConsoleWrapper({ resultEl: params.codeButtonContext.container });
    if (params.codeButtonContext.config.shouldShowSystemMessages) {
      wrappedConsole.writeSystemMessage('⏳ Executing...');
    }

    const adapter = getDataAdapterEx(this.app);

    let isSuccess = false;
    try {
      const script = makeWrapperScript(
        params.code,
        `${basename(params.codeButtonContext.sourceFile.path)}.code-button.${String(params.buttonIndex)}.${params.escapedCaption}.ts`,
        dirname(params.codeButtonContext.sourceFile.path),
        params.codeButtonContext.config.shouldAutoOutput
      );
      const codeButtonBlockScriptWrapper = await this.requireHandlerFactory.requireStringAsync({
        code: script,
        path: `${adapter.getFullPath(params.codeButtonContext.sourceFile.path).replaceAll('\\', '/')}.code-button.${
          String(params.buttonIndex)
        }.${params.escapedCaption}.ts`
      }) as CodeButtonBlockScriptWrapper;
      await codeButtonBlockScriptWrapper(params.codeButtonContext);
      if (params.codeButtonContext.config.shouldShowSystemMessages) {
        wrappedConsole.writeSystemMessage('✅ Executed successfully');
      }
      isSuccess = true;
    } catch (error) {
      printError(error);
      wrappedConsole.appendToResultEl([error], 'error');
      if (params.codeButtonContext.config.shouldShowSystemMessages) {
        wrappedConsole.writeSystemMessage('❌ Executed with error!');
      }
    } finally {
      let shouldRemoveButton = false;
      switch (params.codeButtonContext.config.removeAfterExecution.when) {
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
          console.error(`Unknown remove after execution mode: ${params.codeButtonContext.config.removeAfterExecution.when as string}`);
          break;
      }
      if (shouldRemoveButton) {
        if (params.codeButtonContext.markdownInfo) {
          try {
            await params.codeButtonContext.removeCodeButtonBlock(params.codeButtonContext.config.removeAfterExecution.shouldKeepGap);
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

  public override onload(): void {
    super.onload();

    registerCodeHighlighting();
    this.register(unregisterCodeHighlighting);
    this.markdownCodeBlockProcessorRegistrar.registerMarkdownCodeBlockProcessor(
      CODE_BUTTON_BLOCK_LANGUAGE,
      (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
        invokeAsyncSafely(() =>
          this.processCodeButtonBlock({
            ctx,
            el,
            source
          })
        );
      }
    );
  }

  public async processCodeButtonBlock(params: ProcessCodeButtonBlockParams): Promise<void> {
    const sourceFile = getFile(this.app, params.ctx.sourcePath);
    lastButtonIndex++;
    const resultEl = params.el.createDiv({ cls: 'fix-require-modules console-log-container' });

    const markdownInfo = await getCodeBlockMarkdownInfo({
      app: this.app,
      ctx: params.ctx,
      el: params.el,
      source: params.source
    });

    const frontMatterInfo = getFrontMatterInfo(params.source);
    const code = params.source.slice(frontMatterInfo.contentStart);

    if (markdownInfo && markdownInfo.args.length > 0) {
      new ConsoleWrapper({ resultEl }).writeSystemMessage(createFragment((f) => {
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
                app: this.app,
                codeBlockProvider: newCodeBlock,
                ctx: updateSourcePath(params.ctx, sourceFile),
                el: params.el,
                shouldPreserveLinePrefix: true,
                source: params.source
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
      new ConsoleWrapper({ resultEl }).writeSystemMessage(createFragment((f) => {
        f.appendText('❌ Error!\nYour code block config is not a valid YAML.');
        addLinkToDocs(f);
        f.appendText('See the YAML parsing error in the console.');
      }));
      return;
    }

    config = { ...this.pluginSettingsComponent.parseDefaultCodeButtonConfig(), ...config };

    if (config.isRaw) {
      config.shouldAutoOutput = false;
      config.shouldAutoRun = true;
      config.shouldShowSystemMessages = false;
      config.shouldWrapConsole = false;
    }

    const fullConfig = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG, ...config };
    fullConfig.removeAfterExecution = { ...DEFAULT_CODE_BUTTON_BLOCK_CONFIG.removeAfterExecution, ...config.removeAfterExecution };

    const that = this;

    if (!fullConfig.isRaw) {
      params.el.createEl('button', {
        cls: 'mod-cta',
        async onclick(): Promise<void> {
          await that.handleClick(createHandleClickParams());
        },
        prepend: true,
        text: fullConfig.caption
      });
    }

    if (fullConfig.shouldAutoRun) {
      invokeAsyncSafely(() => that.handleClick(createHandleClickParams()));
    }

    function createHandleClickParams(): HandleClickParams {
      return {
        buttonIndex: lastButtonIndex,
        code,
        codeButtonContext: new CodeButtonContextImpl({
          app: that.app,
          config: fullConfig,
          markdownInfo,
          markdownPostProcessorContext: updateSourcePath(params.ctx, sourceFile),
          parentEl: params.el,
          resultEl,
          source: params.source,
          tempPluginRegistry: that.tempPluginRegistry
        }),
        escapedCaption: escapeForFileName(fullConfig.caption)
      };
    }
  }
}

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
