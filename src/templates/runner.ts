import * as vscode from "vscode";

import { CallbackType, render, type Command } from "./render";
import { getProviderInstance } from "../extension";
import { addTextAfterSelection, addTextBeforeSelection, displayWarning, getSelectionInfo, putTextInNewBuffer, replaceLinesWithText } from "../utils";

export async function repeatLast() {
  await getProviderInstance()?.repeatLast();
}

export async function send(userMessage: string, systemMessage?: string, template?: Command) {
  await getProviderInstance()?.send(userMessage, systemMessage, template);
}

/**
 * @param text Unformatted text. It MIGHT be a code block, in which case it will begin with "```{{language}}\n" and end with "\n```\n". This function should remove those and return the text in between.
 * If it's not a code block, the text will be returned as-is.
 */
function formatCodeBlockResponse(text: string) {
  // const regex = /^```[\w-]*\n([\s\S]+)\n```$/m;
  const regex = /```[\w-]*\n([\s\S]+)\n```/;
  const match = regex.exec(text);

  if (match) {
    return match[1];
  }

  return text;
}

export function handleResponseCallbackType(template: Command, editor: vscode.TextEditor, selection: { startLine: number; endLine: number }, text: string) {
  switch (template.callbackType) {
    case CallbackType.Replace: {
      replaceLinesWithText(editor, selection, formatCodeBlockResponse(text));
      break;
    }
    case CallbackType.BeforeSelected: {
      const newRange = addTextBeforeSelection(editor, selection, formatCodeBlockResponse(text));
      editor.selection = new vscode.Selection(newRange.start, newRange.end);
      break;
    }
    case CallbackType.AfterSelected: {
      const newRange = addTextAfterSelection(editor, selection, formatCodeBlockResponse(text));
      editor.selection = new vscode.Selection(newRange.start, newRange.end);
      break;
    }
    case CallbackType.Buffer: {
      putTextInNewBuffer(editor, text);
      break;
    }
  }
}

export const commandHandler = async (template: Command) => {
  const { activeTextEditor } = vscode.window;

  if (!activeTextEditor) return;

  try {
    const { languageId } = activeTextEditor.document;

    let commandArgs;

    if (template.userMessageTemplate.includes("{{command_args}}")) {
      commandArgs = await vscode.window.showInputBox({
        prompt: "Elaborate, or leave blank.",
        value: "",
      });

      if (commandArgs === undefined) {
        return;
      }
    }

    const { selectedText } = getSelectionInfo(activeTextEditor);

    const userMessage = render(template.userMessageTemplate, languageId, selectedText, commandArgs, template.languageInstructions?.[languageId] ?? "");

    const systemMessage = render(
      template.systemMessageTemplate ?? "You are an assistant to a {{language}} programmer.",
      languageId,
      selectedText,
      commandArgs,
      template.languageInstructions?.[languageId] ?? "",
    );

    await send(userMessage, systemMessage, template);
  } catch (error) {
    displayWarning(String(error));
  }
};
