import fs from "node:fs";
import path from "node:path";

import * as cheerio from "cheerio";
import * as vscode from "vscode";

import { ask, Chat, templateHandler } from "./template_handler";
import { callbackTypeToReadable, defaultTemplates, buildCommandTemplate, type Template } from "./template_render";

export const getConfig = (key: string, fallback: unknown) => {
  const config = vscode.workspace.getConfiguration("wingman");
  if (fallback) {
    return config.get(key, fallback);
  }
  return config.get(key);
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

    const bracketsCurlySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M240 128c-64 0 0 88-64 88H80c-64 0 0-88-64-88c64 0 0-88 64-88h96c64 0 0 88 64 88Z" opacity=".2"/><path d="M43.18 128a29.78 29.78 0 0 1 8 10.26c4.8 9.9 4.8 22 4.8 33.74c0 24.31 1 36 24 36a8 8 0 0 1 0 16c-17.48 0-29.32-6.14-35.2-18.26c-4.8-9.9-4.8-22-4.8-33.74c0-24.31-1-36-24-36a8 8 0 0 1 0-16c23 0 24-11.69 24-36c0-11.72 0-23.84 4.8-33.74C50.68 38.14 62.52 32 80 32a8 8 0 0 1 0 16c-23 0-24 11.69-24 36c0 11.72 0 23.84-4.8 33.74A29.78 29.78 0 0 1 43.18 128ZM240 120c-23 0-24-11.69-24-36c0-11.72 0-23.84-4.8-33.74C205.32 38.14 193.48 32 176 32a8 8 0 0 0 0 16c23 0 24 11.69 24 36c0 11.72 0 23.84 4.8 33.74a29.78 29.78 0 0 0 8 10.26a29.78 29.78 0 0 0-8 10.26c-4.8 9.9-4.8 22-4.8 33.74c0 24.31-1 36-24 36a8 8 0 0 0 0 16c17.48 0 29.32-6.14 35.2-18.26c4.8-9.9 4.8-22 4.8-33.74c0-24.31 1-36 24-36a8 8 0 0 0 0-16Z"/></g></svg>';
    const chatCircleSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128Z" opacity=".2"/><path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24Zm0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.85 7.85 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216Zm12-88a12 12 0 1 1-12-12a12 12 0 0 1 12 12Zm-44 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12Zm88 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12Z"/></g></svg>';

    const builtinTemplates = [...defaultTemplates];
    const userTemplates = getConfig("userCommands", []) as Template[];
    const allTemplates = [...builtinTemplates, ...userTemplates].map((t) => buildCommandTemplate(t.command));
    const categories = [...new Set(allTemplates.map(template => template.category))];

    const buttonHtml = (template: Template) => {
      return `
      <li>
        <button
          class="command-button secondary flex flex-col justify-between items-start p-1"
          data-command="${template.command}">
          <div class="text-sm pointer-events-none flex flex-1 w-full justify-between">
            <span>${template.label}</span>
            <div class="flex">
              <span>${template.userMessageTemplate.includes("{{command_args}}") ? chatCircleSvg : ""}</span>
              <span>${template.userMessageTemplate.includes("{{text_selection}}") ? bracketsCurlySvg : ""}</span>
            </div>
          </div>
          <div class="text-xs muted pointer-events-none">
            ${callbackTypeToReadable(template.callbackType)}
          </div>
        </button>
      </li>
    `;
    };

    const commands = categories
      .map((category) => {
        const templatesWithThisCategory = allTemplates.filter((template) => template.category === category);
        const categoryCommandsHTML = templatesWithThisCategory.map(buttonHtml).join("");
        return `
          <div>
            <div>
              <h2 class="text-sm font-semibold px-1">${category}</h2>
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

export function activate(context: vscode.ExtensionContext) {
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

    const registerCommand = (template: Template & { command: string }) => {
      if (!template.command) return;

      const command = vscode.commands.registerCommand(`wingman.${template.command}`, () => {
        templateHandler(buildCommandTemplate(template.command));
      });

      context.subscriptions.push(command);
    };

    const builtinTemplates = [...defaultTemplates];
    const userTemplates = getConfig("userCommands", []) as Template[];
    const allTemplates = [...builtinTemplates, ...userTemplates];

    allTemplates.forEach((template: Template) => {
      registerCommand(template);
    });
  } catch (error) {
    display(String(error));
  }
}

export function deactivate() {}
