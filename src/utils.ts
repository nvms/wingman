import fs from "node:fs";
import path from "node:path";

import Glob from "fast-glob";
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

export function addTextBeforeSelection(editor: vscode.TextEditor, { startLine }: { startLine: number; endLine: number }, newText: string): vscode.Range {
  const edit = new vscode.WorkspaceEdit();
  const position = editor.selection.start;

  const newLine = editor.document.lineAt(position.line).rangeIncludingLineBreak;
  const insertRange = new vscode.Range(newLine.start, newLine.start);

  const indentedNewText = indentText(`${newText}\n`, editor.document.lineAt(startLine));

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

export const getConfig = <T>(key: string, fallback?: unknown | undefined): T => {
  const config = vscode.workspace.getConfiguration("wingman");
  if (fallback) {
    return config.get(key, fallback) as T;
  }
  return config.get(key) as T;
};

export const updateGlobalConfig = <T>(key: string, value: T): void => {
  vscode.workspace.getConfiguration("wingman").update(key, value, true);
};

export const updateWorkspaceConfig = <T>(key: string, value: T): void => {
  vscode.workspace.getConfiguration("wingman").update(key, value, false);
};

export const display = (message: string) => {
  vscode.window.showInformationMessage(message);
};

export const displayWarning = (message: string) => {
  vscode.window.showWarningMessage(message);
};

/**
 * Returns an array of string paths to ignore when processing files.
 * Will use .gitignore if if exists and `context.ignore.useGitignore` is true.
 * Will use .wmignore if it exists.
 * @returns An array of string paths to ignore when processing files.
 * @throws Will throw an error if the file cannot be read.
 */
const getIgnoredPaths = (): string[] => {
  const ignoreList: string[] = [];
  const { workspaceFolders } = vscode.workspace;

  const processIgnoreFile = (fileName: string) => {
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const ignoreFilePath = path.join(folder.uri.fsPath, fileName);
        try {
          const ignoreFile = fs.readFileSync(ignoreFilePath, "utf8");
          const ignoreLines = ignoreFile.split("\n");
          for (const line of ignoreLines) {
            if (!line.startsWith("#")) {
              ignoreList.push(path.join(folder.uri.fsPath, line));
            }
          }
        } catch {
          continue;
        }
      }
    }
  };

  const useGitignore = getConfig<boolean>("context.ignore.useGitignore", true);
  if (useGitignore) {
    processIgnoreFile(".gitignore");
  }

  processIgnoreFile(".wmignore");

  const additionalIgnorePaths = getConfig<string[]>("context.ignore.additionalIgnorePaths", []);
  ignoreList.push(...additionalIgnorePaths);

  return ignoreList;
};

const getFilesForContext = () => {
  const ignorePaths = getIgnoredPaths();
  const workspaceFolders = vscode.workspace.workspaceFolders || [];

  return Glob.sync(
    workspaceFolders.map((folder) => `${folder.uri.fsPath}/**/*`),
    {
      ignore: [...ignorePaths],
    },
  );
};

const mapFileExtensionToLanguageId = (fileExtension: string): string => {
  const languageIds: { [key: string]: string } = {
    js: "javascript",
    py: "python",
    ts: "typescript",
    tsx: "typescriptreact",
    c: "c",
    h: "c",
    jav: "java",
    jsx: "javascriptreact",
    md: "markdown",
    mdx: "markdown",
    cs: "csharp",
    coffee: "coffeescript",
    ps: "powershell",
    ps1: "powershell",
  };

  return languageIds[fileExtension] ?? fileExtension;
};

/**
 * This function calls getFilesForContext, and for each file path, it reads the file and returns an array of strings.
 * Each string is formatted like this:
 * ```{{filetype}}\n{{file_contents}}\n```
 * {{filetype}} is the file extension, and {{file_contents}} is the file contents.
 * The function MUST return the string with leading backticks followed by the filetype, a newline character, the file contents as utf8, and a newline character, followed by a closing backtick.
 * Returns an array of strings, each formatted as mentioned above.
 */
export const getFilesForContextFormatted = () => {
  const files = getFilesForContext();
  const results: string[] = [];

  for (const file of files) {
    const filename = path.basename(file);
    const fileType = mapFileExtensionToLanguageId(path.extname(file).replace(".", ""));
    const fileContents = fs.readFileSync(file, "utf8");
    results.push(`// ${filename}\n\`\`\`${fileType}\n${fileContents}\n\`\`\``);
  }

  return results;
};
