import * as vscode from 'vscode';
import { registerShareCommand } from './commands/share';
import { registerPasteCommand } from './commands/paste';
import { registerHistoryCommands } from './commands/history';
import { HistoryProvider } from './providers/historyProvider';

let historyProvider: HistoryProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Snipit.sh extension is now active');
  
  // Initialize history provider
  historyProvider = new HistoryProvider(context);
  
  // Register tree view
  const treeView = vscode.window.createTreeView('snipitHistory', {
    treeDataProvider: historyProvider,
    showCollapseAll: false
  });
  context.subscriptions.push(treeView);
  
  // Register commands
  context.subscriptions.push(registerShareCommand(context, historyProvider));
  context.subscriptions.push(registerPasteCommand(context));
  context.subscriptions.push(...registerHistoryCommands(context, historyProvider));
  
  // Show welcome message on first install
  const hasShownWelcome = context.globalState.get<boolean>('snipit.hasShownWelcome');
  if (!hasShownWelcome) {
    context.globalState.update('snipit.hasShownWelcome', true);
    vscode.window.showInformationMessage(
      'Snipit.sh extension installed! Use Ctrl+Shift+S to share code securely.',
      'Learn More'
    ).then(action => {
      if (action === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://snipit.sh'));
      }
    });
  }
}

export function deactivate() {
  console.log('Snipit.sh extension is now deactivated');
}
