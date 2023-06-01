import {
  type ChatGPTAPIOptions,
  ChatGPTAPI,
  type ChatMessage,
} from "chatgpt";
import fetch from "node-fetch";
import * as vscode from "vscode";

import { display, getConfig, SecondaryViewProvider } from "./extension";
import { CallbackType, render, type Command } from "./template_render";

/**
 * Defines the shape of the conversation context object.
 */
interface ConversationContext {
  /**
   * The id of the conversation. Can be undefined if no conversation has been started yet.
   */
  conversationId: string | undefined;
  /**
   * The id of the parent message, if any.
   */
  parentMessageId: string;
}

export class Chat {
  public static api: ChatGPTAPI | undefined;
  public static conversationId: string;
  public static abort: AbortController = new AbortController();
  public static conversationState: ConversationContext | undefined;

  public static newApi(options: ChatGPTAPIOptions) {
    Chat.api = new ChatGPTAPI(options);
    Chat.conversationState = undefined;
  }
}

function getSelectionInfo(editor: vscode.TextEditor): { selectedText: string, startLine: number, endLine: number } {
  const { selection } = editor;
  const startLine = selection.start.line;
  const endLine = selection.end.line;
  const selectedText = editor.document.getText(selection);
  return { selectedText, startLine, endLine };
}

export function replaceLinesWithText(editor: vscode.TextEditor, { startLine, endLine }: { startLine: number, endLine: number }, newText: string) {
  const edit = new vscode.WorkspaceEdit();
  const range = new vscode.Range(
    new vscode.Position(startLine, 0),
    new vscode.Position(endLine, editor.document.lineAt(endLine).range.end.character)
  );
  
  const indentedNewText = indentText(newText, editor.document.lineAt(startLine));
  
  edit.replace(editor.document.uri, range, indentedNewText);
  vscode.workspace.applyEdit(edit);
}

export function addTextAfterSelection(editor: vscode.TextEditor, { startLine }: { startLine: number, endLine: number }, newText: string): vscode.Range {
  const edit = new vscode.WorkspaceEdit();
  const position = editor.selection.end;

  const newLine = editor.document.lineAt(position.line).rangeIncludingLineBreak;
  const insertRange = new vscode.Range(newLine.end, newLine.end);

  const indentedNewText = indentText(`\n${newText}\n`, editor.document.lineAt(startLine));
  
  edit.insert(editor.document.uri, insertRange.start, indentedNewText);
  vscode.workspace.applyEdit(edit);

  return insertRange;
}

function indentText(text: string, line: vscode.TextLine): string {
  const firstLineIndentation = line.text.match(/^(\s*)/);
  const indentation = firstLineIndentation ? firstLineIndentation[0] : "";
  return text.split("\n").map(line => indentation + line).join("\n");
}

/**
 * 
 * @param text Unformatted text. It MIGHT be a code block, in which case it will begin with "```{{language}}\n" and end with "\n```\n". THis function should remove those and return the text in between.
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

let lastQuestion: string | undefined;
let lastTemplate: Command | undefined;
let lastSystemMessage: string | undefined;

/**
 * When ask is called without a template, it's assumed to be a continuation
 * of the previous conversation. In this case, we use the last template that
 * was used, and we don't send a "newChat" event to the secondary view, so the
 * chat is not cleared. Instead, new replies show up in the same conversation thread.
 * @param question
 * @param systemMessage 
 * @param template 
 * @returns 
 */
export const ask = async (question: string, systemMessage?: string, template?: Command) => {
  let isFollowup = false;

  lastQuestion = question;

  if (template) { lastTemplate = template; }
  if (!template && !lastTemplate) { return; }
  if (!template) {
    template = lastTemplate!;
    isFollowup = true;
  }

  if (systemMessage) { lastSystemMessage = systemMessage; }
  if (!systemMessage && !lastSystemMessage) { return; }
  if (!systemMessage) {
    systemMessage = lastSystemMessage!;
  }

  if (!Chat.api) {
    Chat.newApi({
      apiKey: getConfig("apiKey", "") as string,
      apiBaseUrl: getConfig("apiBaseUrl", "https://api.openai.com/v1") as string,
      debug: false,
      // @ts-expect-error this works just fine
      fetch,
      completionParams: {
        model: template.model ?? getConfig("model", "gpt-3.5-turbo") as string,
        temperature: template.temperature ?? getConfig("temperature", 0.8) as number,
      },
    });
  }

  let parentMessageId: string | undefined;

  if (!isFollowup) {
    SecondaryViewProvider.postMessage({ type: "newChat" });
  }

  try {
    SecondaryViewProvider.postMessage({ type: "requestMessage", value: question });

    const editor = vscode.window.activeTextEditor!;
    const selection = getSelectionInfo(vscode.window.activeTextEditor!);

    const response = await Chat.api!.sendMessage(
      question,
      {
        onProgress: (partialResponse: ChatMessage) => {
          if (!parentMessageId) {
            parentMessageId = partialResponse.parentMessageId;
          }

          SecondaryViewProvider.postMessage({ type: "partialResponse", value: partialResponse });
        },
        systemMessage,
        timeoutMs: 60 * 1000,
        abortSignal: Chat.abort.signal,
        ...Chat.conversationState,
      },
    );

    Chat.conversationState = {
      conversationId: response.conversationId,
      parentMessageId: response.id,
    }

    SecondaryViewProvider.postMessage({ type: "responseFinished", value: response });

    // Only modify the editor if this is the first message in the conversation.
    if (!isFollowup) {
      if (template.callbackType === CallbackType.Replace) {
        const formattedText = formatCodeBlockResponse(response.text);
        replaceLinesWithText(editor, selection, formattedText);
      } else if (template.callbackType === CallbackType.AfterSelected) {
        const formattedText = formatCodeBlockResponse(response.text);
        const newRange = addTextAfterSelection(editor, selection, formattedText);
        editor.selection = new vscode.Selection(newRange.start, newRange.end);
      }
    }
  } catch (error) {
    display(String(error));
  }
};

export const repeatLast = async () => {
  if (!lastQuestion) { return; }
  await ask(lastQuestion, lastSystemMessage, lastTemplate);
};

export const templateHandler = async (template: Command) => {
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
  
    const userMessage = render(
      template.userMessageTemplate,
      languageId,
      selectedText,
      commandArgs,
      template.languageInstructions?.[languageId] ?? "",
    );

    const systemMessage = render(
      template.systemMessageTemplate ?? "You are an assistant to a {{language}} programmer.",
      languageId,
      selectedText,
      commandArgs,
      template.languageInstructions?.[languageId] ?? "",
    );

    await ask(userMessage, systemMessage, template);
  } catch (error) {
    display(String(error));
  }
};
