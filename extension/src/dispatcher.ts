import * as vscode from "vscode";
import { ChatEvents, InsertionMethod, Mode, Preset, PromptDefinition } from "../../shared";
import { createPrompt } from "./command";
import { providers } from "./providers/common";
import { OpenAIProvider } from "./providers/openai";
import { State } from "./state";
import { addTextAfterSelection, addTextBeforeSelection, addTextToNewBuffer, alertError, getActiveModeActivePresetKeyValue, getSelectionInfo, replaceLinesWithText, stateKeys } from "./utils";
import { sendEvent, sendNotification, sendNotificationError } from "./views/main";

interface DispatcherOptions {
  promptId?: string;
  message?: string;
}

export class Dispatcher {
  webviewView: vscode.WebviewView;
  editor: vscode.TextEditor;
  selection: { selectedText: string; startLine: number; endLine: number };
  prepared: PreparedCommand;
  provider: typeof OpenAIProvider;
  providerInstance: OpenAIProvider;

  constructor(webviewView: vscode.WebviewView, options: DispatcherOptions) {
    this.webviewView = webviewView;
    this.editor = vscode.window.activeTextEditor;
    this.selection = getSelectionInfo(this.editor);

    if (options.promptId) {
      const command = State.get(stateKeys.promptMap())[options.promptId];
  
      if (!command) {
        throw new Error(`Command ${options.promptId} not found`);
      }
  
      this.runCommand(command);
    } else if (options.message) {
      const command: PromptDefinition & { mode: Mode; promptId: string; } = {
        category: "",
        title: "",
        description: "",
        promptId: "",
        insertionMethod: InsertionMethod.None,
        mode: State.get(stateKeys.activeMode()) as Mode,
        modeId: (State.get(stateKeys.activeMode()) as Mode).id,
        system: getActiveModeActivePresetKeyValue("system") as string,
        message: options.message,
      };

      this.runCommand(command);
    }

  }

  async runCommand(command: PromptDefinition & { promptId }) {
    try {
      this.prepared = await prepareCommand(command);
    } catch (error) {
      if (error.message === "Input was cancelled") {
        sendNotification(this.webviewView, "Input cancelled");
      }
      return;
    }

    this.provider = providers[getActiveModeActivePresetKeyValue("provider") as string].instance;

    if (!this.provider) {
      alertError(`Provider "${getActiveModeActivePresetKeyValue("provider")}" not found`);
      return;
    }

    sendEvent(this.webviewView, ChatEvents.ChatInitiated);
    sendEvent(this.webviewView, ChatEvents.ChatMessageSent, this.prepared.message);

    this.providerInstance = new this.provider(
      this.webviewView,
      this.prepared,
      (text: string) => {
        sendEvent(this.webviewView, ChatEvents.ChatMessageReceived, text);
      }
    );

    try {
      const response = await this.providerInstance.send();
      this.handleResponseInsertionMethod(response);
    } catch (error) {
      sendNotificationError(this.webviewView, error.message);
      this.abort();
    }

    sendEvent(this.webviewView, ChatEvents.ChatEnded);
  }

  // send is for follow-up messages on an existing providerInstance.
  async send(message: string) {
    if (!this.providerInstance) {
      alertError("No provider instance found");
      return;
    }

    sendEvent(this.webviewView, ChatEvents.ChatMessageSent, message);

    try {
      await this.providerInstance.send(message);
    } catch (error) {
      sendNotificationError(this.webviewView, error.message);
      this.abort();
    }

    sendEvent(this.webviewView, ChatEvents.ChatEnded);
  }

  extractFirstCodeBlock(text: string): string {
    const regex = /```[\w-]*\n([\s\S]+)\n```/;
    const match = regex.exec(text);

    if (match) {
      return match[1];
    }

    return text;
  }

  handleResponseInsertionMethod(response: string) {
    const { insertionMethod } = this.prepared;
    const editor = vscode.window.activeTextEditor;
    response = this.extractFirstCodeBlock(response);

    switch (insertionMethod) {
      case InsertionMethod.Replace: {
        replaceLinesWithText(this.editor, this.selection, response);
        break;
      }
      case InsertionMethod.Before: {
        addTextBeforeSelection(this.editor, this.selection, response);
        break;
      }
      case InsertionMethod.After: {
        addTextAfterSelection(this.editor, this.selection, response);
        break;
      }
      case InsertionMethod.None: {
        break;
      }
      case InsertionMethod.New: {
        addTextToNewBuffer(response);
        break;
      }
      default: {
        console.warn("Unknown insertionMethod", insertionMethod);
      }
    }
  }

  abort() {
    this.providerInstance?.abort();
    // this.webviewView.webview.postMessage({ content: { type: "notification", message: "Request aborted" } });
    this.webviewView.webview.postMessage({ content: { type: "aborted" } });
  }
}

export type PreparedCommand = {
  message: string;
  system: string;
  insertionMethod: InsertionMethod;
  url: string;
  completionParams: Preset["completionParams"];
};

const prepareCommand = async (prompt: PromptDefinition & { promptId: string }): Promise<PreparedCommand> => {
  const substituted =  await createPrompt(prompt);

  if (substituted.message === null) {
    throw new Error("Input was cancelled");
  }

  const insertionMethod: InsertionMethod = prompt.insertionMethod ?? InsertionMethod.Replace;

  return {
    ...substituted,
    insertionMethod,
    url: getActiveModeActivePresetKeyValue("url") as string,
  };
};