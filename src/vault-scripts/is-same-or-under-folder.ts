/**
 * Checks whether a vault folder path is a given folder or sits under it.
 *
 * Compares whole path segments, so `root/scripts-old` is not under `root/scripts`.
 *
 * @param folder - The folder path to check.
 * @param parentFolder - The folder it may be, or be under.
 * @returns `true` when `folder` is non-empty and equals `parentFolder` or is inside it.
 */
export function isSameOrUnderFolder(folder: string, parentFolder: string): boolean {
  return !!folder && !!parentFolder && (folder === parentFolder || folder.startsWith(`${parentFolder}/`));
}
