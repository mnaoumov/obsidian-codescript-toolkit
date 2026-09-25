import { registerDemoVaultButtonSuite } from 'obsidian-dev-utils/script-utils/demo-vault-buttons';

// The first code-button execution in a fresh Obsidian session loads babel-standalone and primes the require
// pipeline, a one-time cost far larger than a warm run. Both budgets are spent inside ONE transport call per
// button, so the suite refuses at registration a pair whose sum reaches the transport's ~30 s cap.
const SETTLE_TIMEOUT_IN_MILLISECONDS = 10_000;
const BUTTON_RESULT_TIMEOUT_IN_MILLISECONDS = 12_000;

registerDemoVaultButtonSuite({
  buttonResultTimeoutInMilliseconds: BUTTON_RESULT_TIMEOUT_IN_MILLISECONDS,
  // The plugin-integration notes each install a third-party plugin from the community store before their
  // buttons can do anything, so they are read rather than clicked.
  excludedFolders: ['08 Working with other plugins'],
  // Buttons that legitimately do not report success: a by-design error demo, and a button that suppresses
  // system messages, so no ✅/❌ banner appears for the classifier to read.
  expectedNonOkButtons: [
    { captionIncludes: 'on error only', note: '01 Code buttons.md', status: 'error' },
    { captionIncludes: 'shouldShowSystemMessages=false', note: '01 Code buttons.md', status: 'timeout' }
  ],
  settleTimeoutInMilliseconds: SETTLE_TIMEOUT_IN_MILLISECONDS,
  // Several buttons `await` an `alert` / `confirm` / `prompt`, which cannot resolve until the dialog closes.
  shouldDismissModals: true
});
