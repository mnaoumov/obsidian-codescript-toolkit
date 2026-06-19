export interface CodeButtonBlockConfig {
  caption: string;

  isRaw: boolean;

  removeAfterExecution: RemoveAfterExecutionConfig;

  shouldAutoOutput: boolean;

  shouldAutoRun: boolean;

  shouldShowSystemMessages: boolean;

  shouldWrapConsole: boolean;
}

export interface RemoveAfterExecutionConfig {
  shouldKeepGap: boolean;

  when: 'always' | 'never' | 'onError' | 'onSuccess';
}
