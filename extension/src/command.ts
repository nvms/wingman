import * as vscode from "vscode";
// @ts-ignore
import { Preset, PromptDefinition, getHumanReadableLanguageName, languageInstructions } from "../../shared";
import { extension, getActiveModeActivePresetKeyValue, getSelectionInfo, languageid } from "./utils";

export async function createPrompt(prompt: PromptDefinition & { promptId: string }) {
  const editor = vscode.window.activeTextEditor;
  const readable = getHumanReadableLanguageName(languageid(editor), extension(editor));
  const selection = getSelectionInfo(editor);

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
          const activePresetCompletionParameters = getActiveModeActivePresetKeyValue("completionParams") as Preset["completionParams"];

          // If the active preset has a completion parameter with this name, overwrite it with this value.
          if (Object.hasOwnProperty.call(activePresetCompletionParameters, paramName)) {
            activePresetCompletionParameters[paramName] = paramValue;
          }

          text = text.replace(match, "");
        }
      }
    }

    const inst = languageInstructions[languageid(editor)] ?? "";

    text = text.replaceAll("{{language_instructions}}", inst);
    return text.replaceAll("{{selection}}", selection.selectedText).trim();
  };

  const message = await substitute(prompt.message);
  const system = await substitute(prompt.system ?? getActiveModeActivePresetKeyValue("system") as Preset["system"]);

  return { message, system };
}