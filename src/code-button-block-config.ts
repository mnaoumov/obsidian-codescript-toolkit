/**
 * The config for the code button block.
 */
export interface CodeButtonBlockConfig {
  /**
   * The caption of the code button.
   */
  caption: string;

  /**
   * Whether the button should work in [`raw`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-config.md#israw---raw-mode) mode.
   */
  isRaw: boolean;

  /**
   * Configures the behavior of the button removal after it has been executed.
   */
  removeAfterExecution: RemoveAfterExecutionConfig;

  /**
   * Whether to [automatically output](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-config.md#shouldautooutput---auto-output-mode) the last evaluated expression.
   */
  shouldAutoOutput: boolean;

  /**
   * Whether to [run code automatically](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-config.md#shouldautorun---auto-running-code-blocks-mode) without pressing the button.
   */
  shouldAutoRun: boolean;

  /**
   * Whether to show system messages such as `Executing...`, `Executed successfully`, etc.
   */
  shouldShowSystemMessages: boolean;

  /**
   * Whether to display [console messages](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/code-button-config.md#shouldwrapconsole---console-messages) in the results panel.
   */
  shouldWrapConsole: boolean;
}

/**
 * Configures the behavior of the button removal after it has been executed.
 */
export interface RemoveAfterExecutionConfig {
  /**
   * Whether to keep the gap after the button has been removed.
   */
  shouldKeepGap: boolean;

  /**
   * The condition of the button removal.
   */
  when: 'always' | 'never' | 'onError' | 'onSuccess';
}
