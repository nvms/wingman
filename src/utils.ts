import fs from "node:fs";
import path from "node:path";

import Glob from "fast-glob";
import llamaTokenizer from "llama-tokenizer-js";
import * as vscode from "vscode";

import { ExtensionState } from "./extension";
import { type Command } from "./templates/render";

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
  const doc = await vscode.workspace.openTextDocument({ language: "markdown" });
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

export const getConfig = <T>(key: string, fallback?: T | undefined): T => {
  const config = vscode.workspace.getConfiguration("wingman");
  if (fallback) {
    return config.get(key, fallback) as T;
  }
  return config.get(key) as T;
};

export const unsetConfig = (key: string) => {
  vscode.workspace.getConfiguration("wingman").update(key, undefined, true);
};

export const getSecret = async <T>(key: string, fallback?: T | undefined): Promise<T> => {
  return (await ExtensionState.getSecret<T>(key)) ?? (fallback as T);
};

export const setSecret = (key: string, value: string) => {
  ExtensionState.createSecret(key, value);
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
  const permittedFileExtensions = getConfig<string[]>("context.include.permittedFileExtensions", []);

  return Glob.sync(
    workspaceFolders.map((folder) => `${folder.uri.fsPath}/**/*${permittedFileExtensions.length > 0 ? `.+(${permittedFileExtensions.join("|")})` : ""}`),
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
    tsx: "typescript",
    c: "c",
    h: "c",
    jav: "java",
    jsx: "javascript",
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
 * Retrieves files for context and formats them as code blocks with the file name
 * as a comment at the top of each code block.
 */
export const getFilesForContextFormatted = () => {
  const files = getFilesForContext();
  const results: string[] = [];

  for (const file of files) {
    const workspaceFolderPaths = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
    const workspaceFolder = workspaceFolderPaths.find((folder) => file.startsWith(folder));
    if (!workspaceFolder) continue;
    const fileName = file.replace(workspaceFolder, "");
    const fileNameWithoutLeadingPathSep = fileName.startsWith(path.sep) ? fileName.slice(1) : fileName;
    const fileType = mapFileExtensionToLanguageId(path.extname(file).replace(".", ""));
    const fileContents = fs.readFileSync(file, "utf8");
    results.push(`// file: ${fileNameWithoutLeadingPathSep}\n\`\`\`${fileType}\n${fileContents}\n\`\`\``);
  }

  return results;
};

/**
 * Takes a command object and returns a string generated from its label property.
 * @param {Command} command - The command object to generate the name from.
 * @returns {string} - The generated command name.
 */
export const generateCommandName = ({ label }: Command): string => {
  const slugifiedLabel = label.toLowerCase().replaceAll(/[^a-zA-Z\d]+/g, "_");
  const words = slugifiedLabel.split("_").filter(Boolean);
  return words.reduce((camelCaseLabel, word, index) => {
    if (index === 0) {
      return camelCaseLabel + word;
    }
    return camelCaseLabel + word.charAt(0).toUpperCase() + word.slice(1);
  }, "");
};

export const randomString = (): string => {
  const characters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export function llamaMaxTokens(prompt: string, ctx: number) {
  const n = llamaTokenizer.encode(prompt).length;
  return ctx - n;
}

export function formatPrompt(prompt: string, template: string, systemMessage: string) {
  return template.replace("{system}", systemMessage).replace("{prompt}", prompt);
}
