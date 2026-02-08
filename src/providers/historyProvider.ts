import * as vscode from 'vscode';

export interface HistoryItem {
  id: string;
  url: string;
  fileName: string;
  language: string;
  visibility: 'public' | 'password' | 'burn';
  createdAt: string;
  expiresAt?: string;
}

const HISTORY_KEY = 'snipit.history';

export class HistoryProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<HistoryTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  
  constructor(private context: vscode.ExtensionContext) {}
  
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
  
  getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
    return element;
  }
  
  async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
    if (element) {
      return []; // No nested items
    }
    
    const history = this.getHistory();
    return history.map(item => new HistoryTreeItem(item));
  }
  
  /**
   * Gets all history items from global state
   */
  getHistory(): HistoryItem[] {
    return this.context.globalState.get<HistoryItem[]>(HISTORY_KEY, []);
  }
  
  /**
   * Adds a new item to history
   */
  async addToHistory(item: HistoryItem): Promise<void> {
    const config = vscode.workspace.getConfiguration('snipit');
    const maxItems = config.get<number>('maxHistoryItems', 50);
    
    const history = this.getHistory();
    
    // Add new item at the beginning
    history.unshift(item);
    
    // Trim to max size
    if (history.length > maxItems) {
      history.length = maxItems;
    }
    
    await this.context.globalState.update(HISTORY_KEY, history);
    this.refresh();
  }
  
  /**
   * Removes an item from history
   */
  async removeFromHistory(id: string): Promise<void> {
    const history = this.getHistory();
    const filtered = history.filter(item => item.id !== id);
    await this.context.globalState.update(HISTORY_KEY, filtered);
    this.refresh();
  }
  
  /**
   * Clears all history
   */
  async clearHistory(): Promise<void> {
    await this.context.globalState.update(HISTORY_KEY, []);
    this.refresh();
  }
  
  /**
   * Gets an item by ID
   */
  getItem(id: string): HistoryItem | undefined {
    return this.getHistory().find(item => item.id === id);
  }
}

export class HistoryTreeItem extends vscode.TreeItem {
  constructor(public readonly item: HistoryItem) {
    super(item.fileName, vscode.TreeItemCollapsibleState.None);
    
    this.description = this.formatDate(item.createdAt);
    this.tooltip = this.buildTooltip();
    this.contextValue = 'historyItem';
    
    // Set icon based on visibility
    switch (item.visibility) {
      case 'password':
        this.iconPath = new vscode.ThemeIcon('lock');
        break;
      case 'burn':
        this.iconPath = new vscode.ThemeIcon('flame');
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('file-code');
    }
    
    // Click to copy URL
    this.command = {
      command: 'snipit.history.copyUrl',
      title: 'Copy URL',
      arguments: [this]
    };
  }
  
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${this.item.fileName}**\n\n`);
    md.appendMarkdown(`- Language: ${this.item.language || 'plaintext'}\n`);
    md.appendMarkdown(`- Visibility: ${this.item.visibility}\n`);
    md.appendMarkdown(`- Created: ${new Date(this.item.createdAt).toLocaleString()}\n`);
    
    if (this.item.expiresAt) {
      const expires = new Date(this.item.expiresAt);
      const isExpired = expires < new Date();
      md.appendMarkdown(`- Expires: ${expires.toLocaleString()}${isExpired ? ' (expired)' : ''}\n`);
    } else {
      md.appendMarkdown(`- Expires: Never\n`);
    }
    
    md.appendMarkdown(`\n*Click to copy URL*`);
    return md;
  }
}
