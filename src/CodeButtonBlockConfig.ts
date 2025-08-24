/**
 * The config for the code button block.
 */
export interface CodeButtonBlockConfig {
  /**
   * The caption of the code button.
   */
  caption: string;

  /**
   * Whether the button should work in [`raw`](https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#raw-mode) mode.
   */
  isRaw: boolean;

  /**
   * Whether to [automatically output](https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#auto-output) the last evaluated expression.
   */
  shouldAutoOutput: boolean;

  /**
   * Whether to [run code automatically](https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#auto-running-code-blocks) without pressing the button.
   */
  shouldAutoRun: boolean;

  /**
   * Whether to show system messages such as `Executing...`, `Executed successfully`, etc.
   */
  shouldShowSystemMessages: boolean;

  /**
   * Whether to display [console messages](https://github.com/mnaoumov/obsidian-codescript-toolkit?tab=readme-ov-file#console-messages) in the results panel.
   */
  shouldWrapConsole: boolean;
}
