import * as vscode from "vscode";
import { InsertionMethod, Mode, Preset, PromptDefinition, defaultModes, defaultPrompts } from "../../shared";
import { DEFAULT_MODE } from "./providers/common";
import { State } from "./state";

export const randomString = (): string => {
  const characters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const indentText = (text: string, line: vscode.TextLine): string => {
  const firstLineIndentation = line.text.match(/^(\s*)/);
  const indentation = firstLineIndentation ? firstLineIndentation[0] : "";
  return text
    .split("\n")
    .map((line) => indentation + line)
    .join("\n");
};

export const addTextToNewBuffer = async (text: string) => {
  const doc = await vscode.workspace.openTextDocument();
  const newEditor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  await newEditor.edit((edit) => {
    edit.insert(new vscode.Position(0, 0), text);
  });
};

export const addTextAfterSelection = (editor: vscode.TextEditor, { startLine }: { startLine: number; endLine: number }, text: string): vscode.Range => {
  const edit = new vscode.WorkspaceEdit();
  const position = editor.selection.end;
  const newLine = editor.document.lineAt(position.line).rangeIncludingLineBreak;
  const insertRange = new vscode.Range(newLine.start, newLine.end);
  const indentedNewText = indentText(`\n${text}\n`, editor.document.lineAt(startLine));
  edit.insert(editor.document.uri, insertRange.start, indentedNewText);
  vscode.workspace.applyEdit(edit);
  return insertRange;
};

export const addTextBeforeSelection = (editor: vscode.TextEditor, { startLine }: { startLine: number; endLine: number }, text: string): vscode.Range => {
  const edit = new vscode.WorkspaceEdit();
  const position = editor.selection.start;
  const newLine = editor.document.lineAt(position.line).rangeIncludingLineBreak;
  const insertRange = new vscode.Range(newLine.start, newLine.start);
  const indentedNewText = indentText(`\n${text}\n`, editor.document.lineAt(startLine));
  edit.insert(editor.document.uri, insertRange.start, indentedNewText);
  vscode.workspace.applyEdit(edit);
  return insertRange;
};

export const replaceLinesWithText = (editor: vscode.TextEditor, { startLine, endLine }: { startLine: number; endLine: number }, text: string): vscode.Range => {
  const edit = new vscode.WorkspaceEdit();
  const range = new vscode.Range(
    new vscode.Position(startLine, 0),
    new vscode.Position(endLine, editor.document.lineAt(endLine).range.end.character),
  );
  const indentedNewText = indentText(text, editor.document.lineAt(startLine));
  edit.replace(editor.document.uri, range, indentedNewText);
  vscode.workspace.applyEdit(edit);
  return range;
};

export const getSelectionInfo = (editor: vscode.TextEditor): { selectedText: string; startLine: number; endLine: number } => {
  if (!editor || !editor?.selection) { return { selectedText: "", startLine: 0, endLine: 0 }; }
  const { selection } = editor;
  const startLine = selection.start.line;
  const endLine = selection.end.line;
  const selectedText = editor.document.getText(selection);
  return { selectedText, startLine, endLine };
};

export const alert = (message: string) => vscode.window.showInformationMessage(message);
export const alertWarning = (message: string) => vscode.window.showWarningMessage(message);
export const alertError = (message: string) => vscode.window.showErrorMessage(message);

export const languageid = (editor: vscode.TextEditor): string => editor?.document?.languageId ?? "plaintext";
export const extension = (editor: vscode.TextEditor): string => editor?.document?.fileName?.split?.(".").pop() || "";

export let promptMap: { [promptId: string]: PromptDefinition & { promptId: string; mode: Mode; } } = {};

export const createPromptMap = () => {
  promptMap = {};

  const prompts = defaultPrompts.map((prompt) => {
    return {
      ...prompt,
      promptId: createPromptId(prompt.title),
      insertionMethod: prompt.insertionMethod || InsertionMethod.Replace,
      mode: defaultModes.find((mode) => mode.id === prompt.modeId),
    }
  });

  prompts.forEach((prompt) => {
    promptMap[prompt.promptId] = prompt;
    State.set(stateKeys.prompt(prompt.promptId), prompt);
  });

  State.set(stateKeys.promptMap(), promptMap);
};

export const slugify = (text: string) => {
  const slug = text.toLowerCase().replaceAll(/[^a-zA-Z\d]+/g, "_");
  const words = slug.split("_").filter(Boolean);
  return words.reduce((label, word, index) => {
    if (index === 0) {
      return label + word;
    }
    return label + word.charAt(0).toUpperCase() + word.slice(1);
  }, "");
};

export const createPromptId = (title: string) => {
  return `${slugify(title)}-${randomString()}`;
};

export const getConfig = <T>(key: string, fallback?: T | undefined): T => {
  const config = vscode.workspace.getConfiguration("wingman");
  if (fallback) return config.get(key, fallback) as T;
  return config.get(key) as T;
};

export const getSecret = async <T>(key: string, fallback?: T | undefined): Promise<T> => {
  return await State.getSecret<T>(key) ?? (fallback as T);
};

export const setSecret = async (key: string, value: string) => {
  return await State.setSecret(key, value);
};

export const getActiveMode = (): Mode => {
  const mode = State.get(stateKeys.activeMode()) as Mode;
  if (mode) return mode;
  return DEFAULT_MODE;
};

export const getModes = (): Mode[] => {
  const modes = State.get(stateKeys.modes()) as Mode[];
  if (modes) return modes;

  return defaultModes;
};

export const stateKeys = {
  activeModePresets(): string { return `${getActiveMode().id}-presets`; },
  activeModeActivePreset(): string { return `${getActiveMode().id}-activePreset`; },
  activeModeChatHistory(): string { return `${getActiveMode().id}-chatHistory`; },
  activeMode(): string { return "activeMode"; },
  modes(): string { return "modes"; },
  welcomeWizard(): string { return "welcomeWizard"; },
  providerApiKey(provider: string): string { return `${provider}-apiKey`; },
  stateCreated(): string { return "stateCreated"; },
  prompt(promptId: string): string { return `${promptId}-prompt`; },
  promptMap(): string { return "promptMap"; },
  placeholders(): string { return "placeholders"; },
  disablePromptInsertion(): string { return "disablePromptInsertion"; },
};

export const getPrompt = (promptId: string) => {
  return State.get(stateKeys.prompt(promptId)) as PromptDefinition & { promptId: string; mode: Mode; };
};

export const getActiveModeActivePresetKeyValue = (key: keyof Preset): string | { [key: string]: any } => {
  const activePreset = State.get(stateKeys.activeModeActivePreset()) as Preset;
  if (!activePreset) return undefined;
  if (!activePreset[key]) return undefined;

  if (typeof activePreset[key] === "object") return { ...activePreset[key] as any };

  return activePreset[key] as string | Record<string, string | number | boolean>;
};

export const getCurrentProviderAPIKey = async (api?: string): Promise<string> => {
  const apiKind = (typeof(api) !== 'undefined') ? api : getActiveModeActivePresetKeyValue("provider") as string;
  const apiKey = await getSecret(stateKeys.providerApiKey(apiKind));
  if (!apiKey) return "";
  return apiKey as string;
};
