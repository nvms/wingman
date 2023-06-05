import * as vscode from "vscode";

export function getSelectionInfo(editor: vscode.TextEditor): { selectedText: string; startLine: number; endLine: number } {
  const { selection } = editor;
  const startLine = selection.start.line;
  const endLine = selection.end.line;
  const selectedText = editor.document.getText(selection);
  return { selectedText, startLine, endLine };
}

export function replaceLinesWithText(editor: vscode.TextEditor, { startLine, endLine }: { startLine: number; endLine: number }, newText: string) {
  const edit = new vscode.WorkspaceEdit();
  const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, editor.document.lineAt(endLine).range.end.character));

  const indentedNewText = indentText(newText, editor.document.lineAt(startLine));

  edit.replace(editor.document.uri, range, indentedNewText);
  vscode.workspace.applyEdit(edit);
}

export function addTextAfterSelection(editor: vscode.TextEditor, { startLine }: { startLine: number; endLine: number }, newText: string): vscode.Range {
  const edit = new vscode.WorkspaceEdit();
  const position = editor.selection.end;

  const newLine = editor.document.lineAt(position.line).rangeIncludingLineBreak;
  const insertRange = new vscode.Range(newLine.end, newLine.end);

  const indentedNewText = indentText(`\n${newText}\n`, editor.document.lineAt(startLine));

  edit.insert(editor.document.uri, insertRange.start, indentedNewText);
  vscode.workspace.applyEdit(edit);

  return insertRange;
}

export async function putTextInNewBuffer(editor: vscode.TextEditor, newText: string) {
  const { languageId } = editor.document;
  const doc = await vscode.workspace.openTextDocument({ language: languageId });
  const newEditor = await vscode.window.showTextDocument(doc);
  await newEditor.edit((edit) => {
    edit.insert(new vscode.Position(0, 0), newText);
  });
}

function indentText(text: string, line: vscode.TextLine): string {
  const firstLineIndentation = line.text.match(/^(\s*)/);
  const indentation = firstLineIndentation ? firstLineIndentation[0] : "";
  return text
    .split("\n")
    .map((line) => indentation + line)
    .join("\n");
}
