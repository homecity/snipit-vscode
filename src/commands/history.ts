import * as vscode from 'vscode';
import { copyToClipboard } from '../utils/clipboard';
import { HistoryProvider, HistoryTreeItem } from '../providers/historyProvider';

export function registerHistoryCommands(
  context: vscode.ExtensionContext,
  historyProvider: HistoryProvider
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  
  // Refresh history
  disposables.push(
    vscode.commands.registerCommand('snipit.history.refresh', () => {
      historyProvider.refresh();
    })
  );
  
  // Clear history
  disposables.push(
    vscode.commands.registerCommand('snipit.history.clear', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all history?',
        { modal: true },
        'Clear'
      );
      
      if (confirm === 'Clear') {
        await historyProvider.clearHistory();
        vscode.window.showInformationMessage('History cleared');
      }
    })
  );
  
  // Copy URL from history item
  disposables.push(
    vscode.commands.registerCommand('snipit.history.copyUrl', async (item?: HistoryTreeItem) => {
      if (!item) {
        // Called without context - show quick pick
        const history = historyProvider.getHistory();
        
        if (history.length === 0) {
          vscode.window.showInformationMessage('No history items');
          return;
        }
        
        const choice = await vscode.window.showQuickPick(
          history.map(h => ({
            label: h.fileName,
            description: new Date(h.createdAt).toLocaleString(),
            detail: h.url,
            item: h
          })),
          {
            placeHolder: 'Select snippet to copy URL'
          }
        );
        
        if (choice) {
          await copyToClipboard(choice.item.url);
          vscode.window.showInformationMessage('URL copied to clipboard');
        }
      } else {
        // Called with context from tree view
        await copyToClipboard(item.item.url);
        vscode.window.showInformationMessage('URL copied to clipboard');
      }
    })
  );
  
  // Open URL in browser
  disposables.push(
    vscode.commands.registerCommand('snipit.history.open', async (item?: HistoryTreeItem) => {
      if (item) {
        await vscode.env.openExternal(vscode.Uri.parse(item.item.url));
      }
    })
  );
  
  // Delete history item
  disposables.push(
    vscode.commands.registerCommand('snipit.history.delete', async (item?: HistoryTreeItem) => {
      if (item) {
        await historyProvider.removeFromHistory(item.item.id);
        vscode.window.showInformationMessage('Item removed from history');
      }
    })
  );
  
  return disposables;
}
