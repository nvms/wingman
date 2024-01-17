import * as vscode from "vscode";
// @ts-ignore
import { Placeholders, Preset, PromptDefinition, getHumanReadableLanguageName, languageInstructions } from "../../shared";
import { extension, getActiveModeActivePresetKeyValue, getSelectionInfo, languageid, stateKeys } from "./utils";
import { State } from "./state";

export async function createPrompt(prompt: PromptDefinition & { promptId: string }) {
  const editor = vscode.window.activeTextEditor;
  const readable = getHumanReadableLanguageName(languageid(editor), extension(editor));
  const selection = getSelectionInfo(editor);
  const activeModeCompletionParams = getActiveModeActivePresetKeyValue("completionParams") as Preset["completionParams"];
  const completionParams = Object.fromEntries(
    Object.entries(activeModeCompletionParams)
      .filter(([_, value]) => value != null)
  ) as unknown as Preset["completionParams"];

  const substitute = async (text: string) => {
    const placeholders = { ...State.get(stateKeys.placeholders()) as Placeholders ?? {} };

    function replacePlaceholders(text: string, placeholders: Placeholders, seenKeys: Set<string> = new Set()): string {
      for (const placeholder of Object.values(placeholders)) {
        let value = String(placeholder.value);
        if (seenKeys.has(placeholder.key)) {
          text = text.replaceAll(`{{${placeholder.key}}}`, `[Wingman: possible placeholder circular reference detected (key: ${placeholder.key})]`);
          continue;
        }

        if (Object.values(placeholders).some(p => value.includes(`{{${p.key}}}`))) {
          seenKeys.add(placeholder.key);
          value = replacePlaceholders(value, placeholders, seenKeys);
        }

        text = text.replaceAll(`{{${placeholder.key}}}`, value);
      }
      return text;
    }

    text = replacePlaceholders(text, placeholders);

    text = text.replaceAll("{{ft}}", languageid(editor));
    text = text.replaceAll("{{language}}", readable);

    if (text.includes("{{input}}")) {
      const input = await vscode.window.showInputBox({
        prompt: "Elaborate, or leave blank.",
        value: "",
      });

      if (input === undefined) return null;

      text = text.replace("{{input}}", input);
    }

    const inputRegex = /\{\{input:.*?\}\}/g;
    const inputMatches = text.match(inputRegex);

    if (inputMatches) {
      for (const match of inputMatches) {
        const input = await vscode.window.showInputBox({
          prompt: match.replace("{{input:", "").replace("}}", ""),
          value: "",
        });

        if (input === undefined) return null;

        text = text.replace(match, input);
      }
    }

    /**
     * Here, we grab parameter overrides, e.g.: {{:temperature:1}}.
     * This feature enables us to have per-prompt completion parameter overrides.
     * If the currently active preset is using a provider that doesn't support a completion parameter by this name, it will be ignored.
     */
    const paramRegex = /\{\{:(.*?):(.*?)\}\}/g;
    const paramMatches = text.match(paramRegex);

    if (paramMatches) {
      for (const match of paramMatches) {
        const matchGroups = /\{\{:(.*?):(.*?)\}\}/.exec(match);
        if (matchGroups && matchGroups.length === 3) {
          const paramName = matchGroups[1];
          const paramValue = matchGroups[2];

          // Check against activeModeCompletionParams, because this particular param may have been stripped
          // at the Preset level (see assignment to `completionParams`), but we still want the prompt to be able to override this value.
          if (Object.hasOwnProperty.call(activeModeCompletionParams, paramName)) {
            const numberRegex = /^[0-9]+(\.[0-9]+)?$/;
            completionParams[paramName] = numberRegex.test(paramValue) ? Number(paramValue) : paramValue;
          }

          text = text.replace(match, "");
        }
      }
    }

    /**
     * Text manipulation around the text cursor
     * 1. {{cursor}}
     *   - Returns the text cursors current line
     * 2. {{cursor:2:5}}
     *   - Returns the text from...
     *       'cursor line-2 at the start of the line' to
     *       'cursor line+5 at the end of the line'
     * 3. {{cursor:1:1:'[SOME_MARKER]'}}
     *   - Like 2. but inserts [SOME_MARKER] at text cursor position
     * 
     * Important:
     * - When text is selected the cursor position is always at the end of selection
     * - Only one {{cursor}} marker may be included in any prompt
     * 
     * Why: https://huggingface.co/stabilityai/stable-code-3b#run-with-fill-in-middle-fim-%E2%9A%A1%EF%B8%8F
     */

    const cursorRegex     = /\{\{cursor(?::([0-9]+):([0-9]+)(?::(['"])(.+)(?<!\\)\3)?)?\}\}/g;
    const cursorMatches   = text.match(cursorRegex);

    if (cursorMatches) {
      const document      = editor.document;
      const cursor        = editor.selection.active;

      const match         = cursorMatches[0];
      const matchGroups   = cursorRegex.exec(match);
      const rowsBefore    = parseInt(matchGroups[1], 10);
      const rowsAfter     = parseInt(matchGroups[2], 10);
      const quoteChar     = matchGroups[3] || '';
      const cursorMarker  = matchGroups[4]?.replace('\\' + quoteChar, quoteChar) || '';

      const startLine     = Math.max(0, cursor.line - rowsBefore);
      const endLine       = Math.min(document.lineCount, cursor.line + rowsAfter);
      const endCharacters = document.lineAt(endLine).text.replace(/[\r\n]+$/, '').length;

      const prefixPos     = new vscode.Position(startLine, 0);
      const suffixPos     = new vscode.Position(endLine, endCharacters);

      const prefixRange   = new vscode.Range(prefixPos, cursor);
      const suffixRange   = new vscode.Range(cursor, suffixPos);

      const prefixText    = document.getText(prefixRange);
      const suffixText    = document.getText(suffixRange);

      text = text.replace(match, prefixText + cursorMarker + suffixText);

      editor.selection = new vscode.Selection(prefixPos, suffixPos);
    }

    const inst = languageInstructions[languageid(editor)] ?? "";

    text = text.replaceAll("{{language_instructions}}", inst);
    text = text.replaceAll("{{file}}", editor.document.getText());
    return text.replaceAll("{{selection}}", selection.selectedText).trim();
  };

  const message = await substitute(prompt.message);
  const system = await substitute(prompt.system ?? getActiveModeActivePresetKeyValue("system") as Preset["system"]);

  return { message, system, completionParams };
}