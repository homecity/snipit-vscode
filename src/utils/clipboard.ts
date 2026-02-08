import * as vscode from 'vscode';

/**
 * Copies text to the system clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  await vscode.env.clipboard.writeText(text);
}

/**
 * Reads text from the system clipboard
 */
export async function readFromClipboard(): Promise<string> {
  return await vscode.env.clipboard.readText();
}

/**
 * Gets the currently selected text in the active editor
 * Returns the full document content if nothing is selected
 */
export function getSelectedText(): { text: string; isSelection: boolean; fileName: string; languageId: string } | null {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    return null;
  }
  
  const selection = editor.selection;
  const document = editor.document;
  
  if (selection.isEmpty) {
    // No selection - return entire file content
    return {
      text: document.getText(),
      isSelection: false,
      fileName: document.fileName.split(/[/\\]/).pop() || 'untitled',
      languageId: document.languageId
    };
  }
  
  // Return selected text
  return {
    text: document.getText(selection),
    isSelection: true,
    fileName: document.fileName.split(/[/\\]/).pop() || 'untitled',
    languageId: document.languageId
  };
}

/**
 * Inserts text at the current cursor position
 */
export async function insertTextAtCursor(text: string): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    return false;
  }
  
  await editor.edit(editBuilder => {
    if (editor.selection.isEmpty) {
      editBuilder.insert(editor.selection.active, text);
    } else {
      editBuilder.replace(editor.selection, text);
    }
  });
  
  return true;
}
