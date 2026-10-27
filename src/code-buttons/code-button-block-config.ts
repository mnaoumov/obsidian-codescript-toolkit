/**
 * Whether a code button shows its own source code next to it, and whether that panel starts open.
 */
export enum SourceVisibility {
  /**
   * Show a toggle next to the button, with the source panel initially closed.
   */
  Collapsed = 'collapsed',

  /**
   * Show a toggle next to the button, with the source panel initially open.
   */
  Expanded = 'expanded',

  /**
   * Show no toggle and no source panel.
   */
  Hidden = 'hidden'
}

/**
 * The config for the code button block.
 */
export interface CodeButtonBlockConfig {
  /**
   * The caption of the code button.
   */
  readonly caption: string;

  /**
   * The [inline CSS](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#css---inline-button-styles) applied to the button element, in the same syntax as an HTML `style` attribute.
   *
   * Has no effect on [`raw`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#israw---raw-mode) buttons, which render no button element.
   *
   * @default `''`
   */
  readonly css: string;

  /**
   * The [CSS classes](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#cssclasses---button-css-classes) added to the button element, as a single space-separated string or a list of strings.
   *
   * Has no effect on [`raw`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#israw---raw-mode) buttons, which render no button element.
   *
   * @default `''`
   */
  readonly cssClasses: string | string[];

  /**
   * Whether the button should work in [`raw`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#israw---raw-mode) mode.
   */
  readonly isRaw: boolean;

  /**
   * Configures the behavior of the button removal after it has been executed.
   */
  readonly removeAfterExecution: RemoveAfterExecutionConfig;

  /**
   * Whether to [automatically output](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#shouldautooutput---auto-output-mode) the last evaluated expression.
   *
   * A last expression that is a `Promise` is awaited first, and its settled value is output.
   */
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Raw mode disables automatic output while normalizing the button configuration.
  shouldAutoOutput: boolean;

  /**
   * Whether [auto output](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#shouldautooutputundefined---auto-output-undefined) also prints a last expression that evaluates to `undefined`, the way the `DevTools Console` does.
   *
   * Off by default, so a button ending with a call that returns nothing does not print `undefined`.
   *
   * Has no effect unless {@link CodeButtonBlockConfig.shouldAutoOutput} is `true`.
   *
   * @default `false`
   */
  readonly shouldAutoOutputUndefined: boolean;

  /**
   * Whether to [run code automatically](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#shouldautorun---auto-running-code-blocks-mode) without pressing the button.
   */
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Raw mode enables automatic execution while normalizing the button configuration.
  shouldAutoRun: boolean;

  /**
   * Whether the results panel [scrolls itself into view](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#shouldautoscrolltoconsolemessages---auto-scrolling) as messages are appended to it.
   *
   * Covers everything the panel shows: the system messages gated by {@link CodeButtonBlockConfig.shouldShowSystemMessages} and the console messages gated by {@link CodeButtonBlockConfig.shouldWrapConsole}.
   *
   * Set it to `false` for a button that runs itself, so opening the note does not scroll away from the top.
   *
   * @default `true`
   */
  readonly shouldAutoScrollToConsoleMessages: boolean;

  /**
   * Whether to show system messages such as `Executing...`, `Executed successfully`, etc.
   */
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Raw mode disables system messages while normalizing the button configuration.
  shouldShowSystemMessages: boolean;

  /**
   * Whether to display [console messages](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#shouldwrapconsole---console-messages) in the results panel.
   */
  // eslint-disable-next-line typescript-dev-toolkit/readonly-interface-members -- Raw mode disables console wrapping while normalizing the button configuration.
  shouldWrapConsole: boolean;

  /**
   * Whether the button shows [its own source code](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#sourcevisibility---source-visibility) next to it, and whether that panel starts open.
   *
   * Has no effect on [`raw`](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/demo-vault/07%20Code%20buttons%20in%20depth/42%20Code%20button%20config.md#israw---raw-mode) buttons, which own their whole rendered element and clear it on every run.
   */
  readonly sourceVisibility: SourceVisibility;
}

/**
 * Configures the behavior of the button removal after it has been executed.
 */
export interface RemoveAfterExecutionConfig {
  /**
   * Whether to keep the gap after the button has been removed.
   */
  readonly shouldKeepGap: boolean;

  /**
   * The condition of the button removal.
   */
  readonly when: 'always' | 'never' | 'onError' | 'onSuccess';
}
