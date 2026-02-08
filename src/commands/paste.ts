import * as vscode from 'vscode';
import { readFromClipboard, insertTextAtCursor } from '../utils/clipboard';
import { getSnippet, parseSnipitUrl } from '../api/snipit';

export function registerPasteCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand('snipit.paste', async () => {
    try {
      // Try to get URL from clipboard first
      const clipboardContent = await readFromClipboard();
      const parsedClipboard = parseSnipitUrl(clipboardContent);
      
      // Ask for URL (pre-fill if clipboard has a snipit URL)
      const url = await vscode.window.showInputBox({
        prompt: 'Enter Snipit.sh URL',
        placeHolder: 'https://snipit.sh/abc123#key',
        value: parsedClipboard ? clipboardContent : undefined,
        validateInput: (value) => {
          if (!value) {
            return 'URL is required';
          }
          const parsed = parseSnipitUrl(value);
          if (!parsed) {
            return 'Invalid Snipit.sh URL';
          }
          return null;
        }
      });
      
      if (!url) {
        return; // User cancelled
      }
      
      // Fetch the snippet
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Fetching snippet...',
          cancellable: false
        },
        async () => {
          try {
            let content: string;
            let language: string | undefined;
            
            try {
              const result = await getSnippet(url);
              content = result.content;
              language = result.language;
            } catch (error) {
              // Check if password is required
              if (error instanceof Error && error.message === 'Password required') {
                const password = await vscode.window.showInputBox({
                  prompt: 'This snippet is password protected. Enter password:',
                  password: true
                });
                
                if (!password) {
                  return; // User cancelled
                }
                
                const result = await getSnippet(url, password);
                content = result.content;
                language = result.language;
              } else {
                throw error;
              }
            }
            
            // Check if there's an active editor
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
              // Insert at cursor
              const inserted = await insertTextAtCursor(content);
              if (inserted) {
                vscode.window.showInformationMessage('✓ Snippet inserted');
              }
            } else {
              // No editor - create new document
              const doc = await vscode.workspace.openTextDocument({
                content,
                language: language || 'plaintext'
              });
              await vscode.window.showTextDocument(doc);
              vscode.window.showInformationMessage('✓ Snippet opened in new tab');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to fetch snippet: ${message}`);
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error: ${message}`);
    }
  });
}
