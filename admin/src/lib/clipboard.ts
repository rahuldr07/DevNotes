/**
 * Single clipboard entry point. Never throws — callers branch on the
 * boolean so denial (permissions, insecure context) can't surface as an
 * unhandled rejection.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
