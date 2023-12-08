import * as vscode from "vscode";
// @ts-ignore
import { Mode, Preset, PromptDefinition, defaultPrompts, generateId, systems } from "../../../shared";
import { createDiff } from "../diff";
import { Dispatcher } from "../dispatcher";
import { formats, getProviderCompletionParamDefaults, providers, tokenizers } from "../providers/common";
import { State } from "../state";
import { createPromptId, getActiveMode, getSelectionInfo, languageid, promptMap, replaceLinesWithText, slugify, stateKeys } from "../utils";
import { createState, promptSetProviderKey } from "../extension";

export const sendEvent = (webviewView: vscode.WebviewView, type: string, value?: any) => {
  webviewView.webview.postMessage({ content: { type, value } });
};

export const sendNotification = (webviewView: vscode.WebviewView, message: string) => {
  webviewView.webview.postMessage({ content: { type: "notification", message } });
};

export const sendNotificationError = (webviewView: vscode.WebviewView, message: string) => {
  webviewView.webview.postMessage({ content: { type: "notificationError", message } });
};

export const sendNotificationSuccess = (webviewView: vscode.WebviewView, message: string) => {
  webviewView.webview.postMessage({ content: { type: "notificationSuccess", message } });
};

export const sendNotificationWarning = (webviewView: vscode.WebviewView, message: string) => {
  webviewView.webview.postMessage({ content: { type: "notificationWarning", message } });
};

let currentDispatcher: Dispatcher | undefined;

export class MainViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "wingman.mainView";
  public static _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionPath: string,
    private readonly _extensionUri: vscode.Uri
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext<unknown>,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // SecondaryViewProvider.postMessage({ type: "shown" });
        webviewView.webview.postMessage({ content: { type: "shown" } });
      } else {
        // SecondaryViewProvider.postMessage({ type: "hidden" });
        webviewView.webview.postMessage({ content: { type: "hidden" } });
      }
    });

    MainViewProvider._view = webviewView;

    webviewView.webview.html = this.getWebviewHTML(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      try {
        const { id, content } = data;
        if (!id || !content) { throw new Error("Invalid message format"); }
        const { type, key, value } = content;

        switch (type) {
          case "get": {
            if (!key) { throw new Error("Missing 'key' in 'get' request"); }
    
            switch (key) {
              case "prompts": {
                webviewView.webview.postMessage({ id, content: State.get(stateKeys.promptMap()) });
                break;
              }
              case "modes": {
                webviewView.webview.postMessage({ id, content: State.get(stateKeys.modes()) });
                break;
              }
              case "activeModePrompts": {
                const allPrompts = State.get(stateKeys.promptMap()) as { [promptId: string]: PromptDefinition & { promptId: string; mode: Mode; } };
                const activeMode = getActiveMode();
                const activeModePrompts = Object.values(allPrompts).filter((prompt) => prompt.mode.id === activeMode.id);
                webviewView.webview.postMessage({ id, content: activeModePrompts });
                break;
              }
              case "activeMode": {
                const activeMode = State.get(stateKeys.activeMode()) as Mode;

                if (activeMode) {
                  webviewView.webview.postMessage({ id, content: State.get(stateKeys.activeMode()) });
                  return;
                }

                const modes = State.get(stateKeys.modes()) as Mode[];
                if (modes.length > 0) {
                  State.set(stateKeys.activeMode(), modes[0]);
                  webviewView.webview.postMessage({ id, content: modes[0] });
                }

                break;
              }
              case "presets": {
                webviewView.webview.postMessage({ id, content: State.get(stateKeys.activeModePresets()) || [] });
                break;
              }
              case "activePreset": {
                webviewView.webview.postMessage({ id, content: State.get(stateKeys.activeModeActivePreset()) });
                break;
              }
              case "providers": {
                webviewView.webview.postMessage({ id, content: Object.keys(providers) });
                break;
              }
              case "formats": {
                webviewView.webview.postMessage({ id, content: Object.keys(formats) });
                break;
              }
              case "tokenizers": {
                webviewView.webview.postMessage({ id, content: Object.keys(tokenizers) });
                break;
              }
              case "welcomeWizard": {
                webviewView.webview.postMessage({ id, content: State.get(stateKeys.welcomeWizard()) });
                break;
              }
              case "providerCompletionParams": {
                const defaults = getProviderCompletionParamDefaults(value);
                webviewView.webview.postMessage({ id, content: defaults });
                break;
              }
              case "chatHistory": {
                const history = State.getWorkspace(stateKeys.activeModeChatHistory()) ?? [];
                webviewView.webview.postMessage({ id, content: history });
                break;
              }
              default: {
                throw new Error(`Invalid 'key' in 'get' request: ${key}`);
              }
            }
            break;
          }
          case "restoreDefaults": {
            createState();
            webviewView.webview.postMessage({ id, content });
            break;
          }
          case "replaceSelection": {
            if (!currentDispatcher) return;
            replaceLinesWithText(currentDispatcher.editor, currentDispatcher.selection, value);
            break;
          }
          case "set": {
            if (!key || value === undefined) { throw new Error("Missing 'key' or 'value' in 'set' request"); }
    
            switch (key) {
              case "activeMode": {
                State.set(stateKeys.activeMode(), value);
                break;
              }
              case "activePreset": {
                State.set(stateKeys.activeModeActivePreset(), value);
                webviewView.webview.postMessage({ id, content: value });
                break;
              }
              case "welcomeWizard": {
                State.set(stateKeys.welcomeWizard(), value);
                break;
              }
              case "apiKey": {
                promptSetProviderKey(value);
                break;
              }
              default: {
                throw new Error(`Invalid 'key' in 'set' request: ${key}`);
              }
            }
            break;
          }
          case "delete": {
            if (!key) { throw new Error("Missing 'key' in 'delete' request"); }

            switch (key) {
              case "preset": {
                const presets = (State.get(stateKeys.activeModePresets()) as Preset[]) || [];
                const nextPresets = presets.filter((preset) => preset.id !== value);

                if (nextPresets.length === 0) {
                  // Don't allow the user to delete the last remaining preset,
                  // because I don't feel like handling this edge case in the UI yet.
                  sendNotificationError(webviewView, "Cannot delete the last remaining preset for this mode.");
                  return;
                }

                State.set(stateKeys.activeModePresets(), nextPresets);

                const nextPreset = nextPresets.find((preset) => preset.id !== value);

                if (nextPreset) {
                  State.set(stateKeys.activeModeActivePreset(), nextPreset);
                }

                sendNotificationSuccess(webviewView, "Preset deleted.");

                webviewView.webview.postMessage({ id, content: nextPresets });
                break;
              }
              case "prompt": {
                const prompts = (State.get(stateKeys.promptMap()) as { [promptId: string]: PromptDefinition & { promptId: string; mode: Mode; } }) || {};
                const nextPrompts = { ...prompts };
                delete nextPrompts[value.promptId];

                promptMap[value.promptId] = undefined;

                State.set(stateKeys.promptMap(), nextPrompts);

                sendNotificationSuccess(webviewView, "Prompt deleted.");

                // Reply because the webview needs to know to update its state.
                webviewView.webview.postMessage({ id, content: nextPrompts });
                break;
              }
              case "mode": {
                const mode = value as Mode;
                const modes = (State.get(stateKeys.modes()) as Mode[]) || [];

                if (modes.length === 1) {
                  // Don't allow the user to delete the last remaining mode,
                  // because I don't feel like handling this edge case in the UI yet.
                  sendNotificationError(webviewView, "Cannot delete the last remaining mode.");
                  return;
                }

                const nextModes = modes.filter((m) => m.id !== mode.id);
                State.set(stateKeys.modes(), nextModes);

                // Get the currently active mode, and if we just deleted it, find a new one to make default active mode:
                const activeMode = State.get(stateKeys.activeMode()) as Mode;
                if (activeMode.id === mode.id) {
                  const nextActiveMode = nextModes.find((m) => m.id !== mode.id);
                  State.set(stateKeys.activeMode(), nextActiveMode);
                }


                // Now, delete all the prompts for this mode
                const prompts = (State.get(stateKeys.promptMap()) as { [promptId: string]: PromptDefinition & { promptId: string; mode: Mode; } }) || {};
                const nextPrompts = { ...prompts };
                Object.values(nextPrompts).forEach((prompt) => {
                  if (prompt?.mode?.id === mode.id) {
                    delete nextPrompts[prompt?.promptId];
                  }
                });

                State.set(stateKeys.promptMap(), nextPrompts);

                // Next, delete the presets for the deleted mode, and update activeModeActivePresets
                State.set(`${mode.id}-presets`, undefined);
                State.set(`${mode.id}-activePreset`, undefined);
                State.set(`${mode.id}-chatHistory`, undefined);

                sendNotificationSuccess(webviewView, "Mode deleted.");

                webviewView.webview.postMessage({ id, content: true });
                break;
              }
              default: {
                throw new Error(`Invalid 'key' in 'delete' request: ${key}`);
              }
            }
            break;
          }
          case "create": {
            if (!key || value === undefined) { throw new Error("Missing 'key' or 'value' in 'create' request"); }

            switch (key) {
              case "newPreset": {
                const presets = (State.get(stateKeys.activeModePresets()) as Preset[]) || [];
                const name = await vscode.window.showInputBox({ prompt: "Enter a name for your preset" });
                if (!name) return;
                const newPreset = { ...value, name };
                presets.push(newPreset);
                State.set(stateKeys.activeModePresets(), presets);
                sendNotificationSuccess(webviewView, "Preset created.");
                webviewView.webview.postMessage({ id, content: newPreset });
                break;
              }
              case "mode": {
                const mode = value as Mode;

                if (!mode.label.trim()) {
                  sendNotificationWarning(webviewView, "A mode must have a name.");
                  return;
                }

                mode.id = generateId();
                const existingModes = State.get(stateKeys.modes()) as Mode[];

                if (existingModes.find((m) => m.label === mode.label)) {
                  sendNotificationError(webviewView, "A mode with this name already exists.");
                  return;
                }

                const nextModes = [...existingModes, mode];

                State.set(stateKeys.modes(), nextModes);

                // Set a default preset for this mode.
                State.set(`${mode.id}-presets`, [
                  {
                    id: generateId(),
                    name: "OpenAI (gpt-3.5-turbo)",
                    provider: "OpenAI",
                    format: "OpenAI",
                    tokenizer: "OpenAI",
                    url: "https://api.openai.com/v1/chat/completions",
                    system: "You are a helpful assistant.",
                    completionParams: {
                      ...getProviderCompletionParamDefaults("OpenAI") as any,
                    },
                  },
                ]);

                State.set(`${mode.id}-activePreset`, State.get(`${mode.id}-presets`)[0]);

                sendNotificationSuccess(webviewView, "Mode created.");

                webviewView.webview.postMessage({ id, content: mode });
                break;
              }
              case "prompt": {
                const prompt = value as PromptDefinition & { promptId: string; mode: Mode; };

                if (!prompt.title) {
                  sendNotificationWarning(webviewView, "A prompt must have a title.");
                  return;
                }

                prompt.promptId = createPromptId(prompt.title);

                const prompts = (State.get(stateKeys.promptMap()) as { [promptId: string]: PromptDefinition & { promptId: string; mode: Mode; } }) || {};
                const nextPrompts = { ...prompts, [prompt.promptId]: prompt };

                promptMap[prompt.promptId] = prompt;

                State.set(stateKeys.promptMap(), nextPrompts);

                sendNotificationSuccess(webviewView, "Prompt created.");

                webviewView.webview.postMessage({ id, content: prompt });

                break;
              }
              default: {
                throw new Error(`Invalid 'key' in 'create' request: ${key}`);
              }
            }
            break;
          }
          case "update": {
            if (!key || !value) { throw new Error("Missing 'key' or 'value' in 'create' request"); }

            switch (key) {
              case "preset": {
                const presets = (State.get(stateKeys.activeModePresets()) as Preset[]) || [];
                const existingPreset = presets.find((preset) => preset.id === value.id);
                if (!existingPreset) return;
                const nextPresets = presets.map((preset) => {
                  if (preset.id === value.id) return value;
                  return preset;
                });

                State.set(stateKeys.activeModePresets(), nextPresets);
                const activePreset = State.get(stateKeys.activeModeActivePreset()) as Preset;

                if (activePreset.id === value.id) {
                  State.set(stateKeys.activeModeActivePreset(), value);
                }

                sendNotificationSuccess(webviewView, "Preset saved.");
                webviewView.webview.postMessage({ id, content: value });
                break;
              }
              case "mode": {
                const mode = value as Mode;

                if (!mode.label.trim()) {
                  sendNotificationWarning(webviewView, "A mode must have a name.");
                  return;
                }

                const existingModes = State.get(stateKeys.modes()) as Mode[];
                const existingMode = existingModes.find((m) => m.id === mode.id);
                if (!existingMode) return;

                const matchLabel = existingModes.find((m) => m.label === mode.label);

                if (matchLabel && matchLabel.id !== mode.id) {
                  sendNotificationError(webviewView, "A mode with this name already exists.");
                  return;
                }

                const nextModes = existingModes.map((m) => {
                  if (m.id === mode.id) return mode;
                  return m;
                });

                State.set(stateKeys.modes(), nextModes);
                sendNotificationSuccess(webviewView, "Mode saved.");
                webviewView.webview.postMessage({ id, content: mode });
                break;
              }
              case "prompt": {
                const prompts = (State.get(stateKeys.promptMap()) as { [promptId: string]: PromptDefinition & { promptId: string; mode: Mode; } }) || {};
                const existingPrompt = prompts[value.promptId];
                if (!existingPrompt) return;
                const nextPrompts = { ...prompts, [value.promptId]: value };

                promptMap[value.promptId] = value;

                State.set(stateKeys.promptMap(), nextPrompts);
                sendNotificationSuccess(webviewView, "Prompt saved.");
                webviewView.webview.postMessage({ id, content: value });
                break;
              }
              case "chatHistory": {
                State.setWorkspace(stateKeys.activeModeChatHistory(), value);
                break;
              }
              default: {
                throw new Error(`Invalid 'key' in 'create' request: ${key}`);
              }
            }
            break;
          }
          case "run": {
            if (!key) { throw new Error("Missing 'key' in 'run' request"); }

            // Ensure we have an active preset. If not, send an error notification and return.
            const activePreset = State.get(stateKeys.activeModeActivePreset()) as Preset;

            if (!activePreset) {
              sendNotificationError(webviewView, "No active preset.");
              return;
            }

            currentDispatcher = new Dispatcher(webviewView, { promptId: key });

            break;
          }
          case "send": {
            if (!currentDispatcher) return;
            currentDispatcher.send(value);
            break;
          }
          case "sendUnprompted": {
            currentDispatcher = new Dispatcher(webviewView, { message: value });
            break;
          }
          case "abort": {
            if (!currentDispatcher) return;

            currentDispatcher.abort();

            webviewView.webview.postMessage({ id, content: { type: "aborted" } });

            break;
          }
          case "diff": {
            if (!currentDispatcher) {
              sendNotificationWarning(webviewView, "No active dispatcher.");
              return;
            }

            createDiff(currentDispatcher.selection.selectedText, value, languageid(currentDispatcher.editor));
            break;
          }
          case "diffSelection": {
            const editor = vscode.window.activeTextEditor;
            const selection = getSelectionInfo(editor);
            createDiff(selection.selectedText, value, languageid(editor));
            break;
          }
          default: {
            throw new Error(`Invalid 'type' in message: ${type}`);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });
  }

  private getWebviewHTML(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "style.css")
    );
    const svelteUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "webview.umd.js")
    );

    return /*html*/`<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <link href="${styleUri}" rel="stylesheet">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Wingman</title>
          </head>
          <body>
            <div id="app"></div>
            <script type="module" src="${svelteUri}"></script>
          </body>
        </html>`;
  }
}
