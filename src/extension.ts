import fs from "node:fs";
import path from "node:path";

import * as cheerio from "cheerio";
import * as vscode from "vscode";

import { ask, Chat, repeatLast, commandHandler } from "./template_handler";
import { defaultCommands, buildCommandTemplate, type Command, CallbackType } from "./template_render";

export const getConfig = <T>(key: string, fallback: unknown): T => {
  const config = vscode.workspace.getConfiguration("wingman");
  if (fallback) {
    return config.get(key, fallback) as T;
  }
  return config.get(key) as T;
};

export const display = (message: string) => {
  vscode.window.showInformationMessage(message);
};

export class MainViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "wingman.mainView";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionPath: string, private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._view = webviewView;

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        SecondaryViewProvider.postMessage({ type: "shown" });
      }
    });

    webviewView.webview.html = this.getWebviewHTML(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "webviewLoaded": {
          break;
        }
        case "command": {
          SecondaryViewProvider.runCommand(data.value);
          break;
        }
        case "collapseCategory": {
          State.set(`category-${data.value.category}-collapsed`, data.value.collapsed);
        }
      }
    });
  }

  private getWebviewHTML(webview: vscode.Webview) {
    const indexHtmlPath = path.join(this._extensionPath, "media", "main.html");
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
    const $ = cheerio.load(indexHtml);

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.css"));
    const tailwindJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "tailwind.min.js"));
    const tailwindCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "tailwind.min.css"));
    const jqueryJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "jquery.min.js"));

    const bracketsCurlySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M240 128c-64 0 0 88-64 88H80c-64 0 0-88-64-88c64 0 0-88 64-88h96c64 0 0 88 64 88Z" opacity=".2"/><path d="M43.18 128a29.78 29.78 0 0 1 8 10.26c4.8 9.9 4.8 22 4.8 33.74c0 24.31 1 36 24 36a8 8 0 0 1 0 16c-17.48 0-29.32-6.14-35.2-18.26c-4.8-9.9-4.8-22-4.8-33.74c0-24.31-1-36-24-36a8 8 0 0 1 0-16c23 0 24-11.69 24-36c0-11.72 0-23.84 4.8-33.74C50.68 38.14 62.52 32 80 32a8 8 0 0 1 0 16c-23 0-24 11.69-24 36c0 11.72 0 23.84-4.8 33.74A29.78 29.78 0 0 1 43.18 128ZM240 120c-23 0-24-11.69-24-36c0-11.72 0-23.84-4.8-33.74C205.32 38.14 193.48 32 176 32a8 8 0 0 0 0 16c23 0 24 11.69 24 36c0 11.72 0 23.84 4.8 33.74a29.78 29.78 0 0 0 8 10.26a29.78 29.78 0 0 0-8 10.26c-4.8 9.9-4.8 22-4.8 33.74c0 24.31-1 36-24 36a8 8 0 0 0 0 16c17.48 0 29.32-6.14 35.2-18.26c4.8-9.9 4.8-22 4.8-33.74c0-24.31 1-36 24-36a8 8 0 0 0 0-16Z"/></g></svg>';
    const chatCircleSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128Z" opacity=".2"/><path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24Zm0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.85 7.85 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216Zm12-88a12 12 0 1 1-12-12a12 12 0 0 1 12 12Zm-44 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12Zm88 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12Z"/></g></svg>';
    const swapSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 48v104a8 8 0 0 1-8 8h-40v48a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V104a8 8 0 0 1 8-8h40V48a8 8 0 0 1 8-8h112a8 8 0 0 1 8 8Z" opacity=".2"/><path d="M224 48v104a16 16 0 0 1-16 16H99.31l10.35 10.34a8 8 0 0 1-11.32 11.32l-24-24a8 8 0 0 1 0-11.32l24-24a8 8 0 0 1 11.32 11.32L99.31 152H208V48H96v8a8 8 0 0 1-16 0v-8a16 16 0 0 1 16-16h112a16 16 0 0 1 16 16Zm-56 144a8 8 0 0 0-8 8v8H48V104h108.69l-10.35 10.34a8 8 0 0 0 11.32 11.32l24-24a8 8 0 0 0 0-11.32l-24-24a8 8 0 0 0-11.32 11.32L156.69 88H48a16 16 0 0 0-16 16v104a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-8a8 8 0 0 0-8-8Z"/></g></svg>';
    const caretDownLightSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="currentColor" d="m212.24 100.24l-80 80a6 6 0 0 1-8.48 0l-80-80a6 6 0 0 1 8.48-8.48L128 167.51l75.76-75.75a6 6 0 0 1 8.48 8.48Z"/></svg>';

    const builtinTemplates = [...defaultCommands];
    const userTemplates = getConfig("userCommands", []) as Command[];
    const allTemplates = [...builtinTemplates, ...userTemplates].map((t) => buildCommandTemplate(t.command));
    const categories = [...new Set(allTemplates.map(template => template.category))];

    const buttonHtml = (template: Command) => {
      return `
        <li>
          <button
            class="command-button flex flex-col justify-between items-start py-1 px-2 text-left"
            data-command="${template.command}">
            <div class="text-sm pointer-events-none flex flex-1 w-full justify-between">
              <span>${template.label}</span>
              <div class="flex">
                <span>${template.userMessageTemplate.includes("{{command_args}}") ? chatCircleSvg : ""}</span>
                <span>${template.userMessageTemplate.includes("{{text_selection}}") ? bracketsCurlySvg : ""}</span>
                <span>${template.callbackType === CallbackType.Replace ? swapSvg : ""}</span>
              </div>
            </div>
          </button>
        </li>
      `;
    };

    const commands = categories
      .map((category) => {
        const templatesWithThisCategory = allTemplates.filter((template) => template.category === category);
        const categoryCommandsHTML = templatesWithThisCategory.map(buttonHtml).join("");
        const isCategoryCollapsed = State.get(`category-${category}-collapsed`) ?? false;
        return `
            <div>
              <div
                class="category select-none p-1 flex flex-row justify-between items-center cursor-pointer"
                data-collapse-category="${category}"
                data-collapsed="${isCategoryCollapsed ? "true" : "false"}"
              >
                <div class="collapse-arrow flex-0 mr-2">
                  ${caretDownLightSvg}
                </div>
                <h2 class="flex-1 text-sm font-semibold px-1 inline-flex">${category}</h2>
              </div>
              <ul class="command-list">
                ${categoryCommandsHTML}
              </ul>
            </div>
          `;
      }).join("");

    return $.html()
      .replace("{{scriptUri}}", scriptUri.toString())
      .replace("{{styleResetUri}}", styleResetUri.toString())
      .replace("{{styleVSCodeUri}}", styleVSCodeUri.toString())
      .replace("{{styleMainUri}}", styleMainUri.toString())
      .replace("{{tailwindJsUri}}", tailwindJsUri.toString())
      .replace("{{tailwindCssUri}}", tailwindCssUri.toString())
      .replace("{{jqueryJsUri}}", jqueryJsUri.toString())
      .replace("{{commands}}", commands);
  }
}

export class SecondaryViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "wingman.secondaryView";
  private static _view?: vscode.WebviewView;

  constructor(private readonly _extensionPath: string, private readonly _extensionUri: vscode.Uri) {}

  public static runCommand(command: string) {
    // We do this so that every time we run a new command, which has a different template,
    // a new model is loaded with the completionOptions defined in the template.
    // e.g. One command may use gpt-3.5-turbo, while another uses gpt-4.
    Chat.api = undefined;
    vscode.commands.executeCommand(`wingman.${command}`);
  }

  public static postMessage(message: any) {
    this._view?.webview.postMessage(message);
  }

  resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    SecondaryViewProvider._view = webviewView;

    webviewView.webview.html = this.getWebviewHTML(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "webviewLoaded": {
          break;
        }
        case "abort": {
          Chat.abort?.abort?.();
          Chat.abort = new AbortController();
          SecondaryViewProvider.postMessage({ type: "aborted" });
          break;
        }
        case "repeatLast": {
          repeatLast();
          break;
        }
        case "sendInput": {
          ask(data.value);
          break;
        }
      }
    });
  }

  private getWebviewHTML(webview: vscode.Webview) {
    const indexHtmlPath = path.join(this._extensionPath, "media", "secondary.html");
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
    const $ = cheerio.load(indexHtml);

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "secondary.js"));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
    const styleSecondaryUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "secondary.css"));
    const tailwindJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "tailwind.min.js"));
    const tailwindCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "tailwind.min.css"));
    const markedJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "marked.min.js"));
    const highlightJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "highlight.min.js"));
    const highlightVscodeCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "highlight-vscode.min.css"));
    const jqueryJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "jquery.min.js"));

    return $.html()
      .replace("{{scriptUri}}", scriptUri.toString())
      .replace("{{styleResetUri}}", styleResetUri.toString())
      .replace("{{styleVSCodeUri}}", styleVSCodeUri.toString())
      .replace("{{styleSecondaryUri}}", styleSecondaryUri.toString())
      .replace("{{tailwindJsUri}}", tailwindJsUri.toString())
      .replace("{{tailwindCssUri}}", tailwindCssUri.toString())
      .replace("{{markedJsUri}}", markedJsUri.toString())
      .replace("{{highlightJsUri}}", highlightJsUri.toString())
      .replace("{{highlightCssUri}}", highlightVscodeCssUri.toString())
      .replace("{{jqueryJsUri}}", jqueryJsUri.toString());
  }
}

export class State {
  public static context: vscode.ExtensionContext;

  public static newContext(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static get(key: string) {
    return State.context.globalState.get(key);
  }

  public static set(key: string, value: any) {
    State.context.globalState.update(key, value);
  }
}

export function activate(context: vscode.ExtensionContext) {
  State.newContext(context);

  try {
    const mainViewProvider = new MainViewProvider(context.extensionPath, context.extensionUri);

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(MainViewProvider.viewType, mainViewProvider, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    );

    const secondaryViewProvider = new SecondaryViewProvider(context.extensionPath, context.extensionUri);

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SecondaryViewProvider.viewType, secondaryViewProvider, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    );

    const registerCommand = (template: Command & { command: string }) => {
      if (!template.command) return;

      const command = vscode.commands.registerCommand(`wingman.${template.command}`, () => {
        commandHandler(buildCommandTemplate(template.command));
      });

      context.subscriptions.push(command);
    };

    const builtinTemplates = [...defaultCommands];
    const userTemplates = getConfig("userCommands", []) as Command[];
    const allTemplates = [...builtinTemplates, ...userTemplates];

    allTemplates.forEach((template: Command) => {
      registerCommand(template);
    });
  } catch (error) {
    display(String(error));
  }
}

export function deactivate() {}
