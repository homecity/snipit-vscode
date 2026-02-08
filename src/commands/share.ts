import * as vscode from 'vscode';
import { getSelectedText, copyToClipboard } from '../utils/clipboard';
import { createSnippet, SnippetOptions } from '../api/snipit';
import { HistoryProvider, HistoryItem } from '../providers/historyProvider';

interface VisibilityOption {
  label: string;
  description: string;
  value: 'public' | 'password' | 'burn';
  icon: string;
}

interface ExpiryOption {
  label: string;
  description: string;
  value: '1h' | '24h' | '7d' | '30d' | 'never';
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    label: '$(globe) Public',
    description: 'Anyone with the link can view',
    value: 'public',
    icon: 'globe'
  },
  {
    label: '$(lock) Password Protected',
    description: 'Requires password to view',
    value: 'password',
    icon: 'lock'
  },
  {
    label: '$(flame) Burn After Read',
    description: 'Deletes after first view',
    value: 'burn',
    icon: 'flame'
  }
];

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: '1 hour', description: 'Expires in 1 hour', value: '1h' },
  { label: '24 hours', description: 'Expires in 24 hours', value: '24h' },
  { label: '7 days', description: 'Expires in 7 days', value: '7d' },
  { label: '30 days', description: 'Expires in 30 days', value: '30d' },
  { label: 'Never', description: 'Never expires', value: 'never' }
];

export function registerShareCommand(
  context: vscode.ExtensionContext,
  historyProvider: HistoryProvider
): vscode.Disposable {
  return vscode.commands.registerCommand('snipit.share', async () => {
    try {
      // Get selected text or full file
      const selection = getSelectedText();
      
      if (!selection) {
        vscode.window.showWarningMessage('No active editor found. Open a file first.');
        return;
      }
      
      if (!selection.text.trim()) {
        vscode.window.showWarningMessage('No content to share. Select some text or open a file with content.');
        return;
      }
      
      // Get default settings
      const config = vscode.workspace.getConfiguration('snipit');
      const defaultVisibility = config.get<string>('defaultVisibility', 'public');
      const defaultExpiry = config.get<string>('defaultExpiry', '24h');
      
      // Show visibility picker
      const visibilityChoice = await vscode.window.showQuickPick(
        VISIBILITY_OPTIONS.map(opt => ({
          ...opt,
          picked: opt.value === defaultVisibility
        })),
        {
          placeHolder: 'Select visibility',
          title: 'Share on Snipit.sh'
        }
      );
      
      if (!visibilityChoice) {
        return; // User cancelled
      }
      
      // Show expiry picker
      const expiryChoice = await vscode.window.showQuickPick(
        EXPIRY_OPTIONS.map(opt => ({
          ...opt,
          picked: opt.value === defaultExpiry
        })),
        {
          placeHolder: 'Select expiry time',
          title: 'Share on Snipit.sh'
        }
      );
      
      if (!expiryChoice) {
        return; // User cancelled
      }
      
      // If password protected, ask for password
      let password: string | undefined;
      if (visibilityChoice.value === 'password') {
        password = await vscode.window.showInputBox({
          prompt: 'Enter a password for the snippet',
          password: true,
          validateInput: (value) => {
            if (!value || value.length < 4) {
              return 'Password must be at least 4 characters';
            }
            return null;
          }
        });
        
        if (!password) {
          return; // User cancelled
        }
        
        // Confirm password
        const confirmPassword = await vscode.window.showInputBox({
          prompt: 'Confirm password',
          password: true,
          validateInput: (value) => {
            if (value !== password) {
              return 'Passwords do not match';
            }
            return null;
          }
        });
        
        if (!confirmPassword) {
          return; // User cancelled
        }
      }
      
      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Sharing on Snipit.sh...',
          cancellable: false
        },
        async () => {
          const options: SnippetOptions = {
            content: selection.text,
            language: selection.languageId,
            fileName: selection.fileName,
            visibility: visibilityChoice.value,
            expiry: expiryChoice.value,
            password
          };
          
          try {
            const result = await createSnippet(options);
            
            // Copy URL to clipboard
            await copyToClipboard(result.url);
            
            // Calculate expiry time
            const expiryMap: Record<string, number | null> = {
              '1h': 60 * 60 * 1000,
              '24h': 24 * 60 * 60 * 1000,
              '7d': 7 * 24 * 60 * 60 * 1000,
              '30d': 30 * 24 * 60 * 60 * 1000,
              'never': null
            };
            
            const expiryMs = expiryMap[expiryChoice.value];
            const expiresAt = expiryMs 
              ? new Date(Date.now() + expiryMs).toISOString()
              : undefined;
            
            // Add to history
            const historyItem: HistoryItem = {
              id: result.id,
              url: result.url,
              fileName: selection.fileName,
              language: selection.languageId,
              visibility: visibilityChoice.value,
              createdAt: new Date().toISOString(),
              expiresAt
            };
            
            await historyProvider.addToHistory(historyItem);
            
            // Show success message with action
            const action = await vscode.window.showInformationMessage(
              `✓ Snippet shared! URL copied to clipboard.`,
              'Open in Browser',
              'Copy Again'
            );
            
            if (action === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(result.url));
            } else if (action === 'Copy Again') {
              await copyToClipboard(result.url);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to share: ${message}`);
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error: ${message}`);
    }
  });
}
