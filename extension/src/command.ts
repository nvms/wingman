import * as vscode from "vscode";
// @ts-ignore
import { Preset, PromptDefinition, getHumanReadableLanguageName, languageInstructions } from "../../shared";
import { extension, getActiveModeActivePresetKeyValue, getSelectionInfo, languageid } from "./utils";

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

    const inst = languageInstructions[languageid(editor)] ?? "";

    text = text.replaceAll("{{language_instructions}}", inst);
    text = text.replaceAll("{{selection}}", selection.selectedText).trim();
    return text.replaceAll("{{file}}", editor.document.getText());
  };

  const message = await substitute(prompt.message);
  const system = await substitute(prompt.system ?? getActiveModeActivePresetKeyValue("system") as Preset["system"]);

  return { message, system, completionParams };
}