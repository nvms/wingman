import fs from "node:fs";
import path from "node:path";

import * as cheerio from "cheerio";
import * as vscode from "vscode";

import { ask, Chat, templateHandler } from "./template_handler";
import { callbackTypeToReadable, ContextType, defaultTemplates, type Template } from "./template_render";

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

    const builtinTemplates = [...defaultTemplates];
    const userTemplates = getConfig("userCommands", []) as Template[];
    const allTemplates = [...builtinTemplates, ...userTemplates];

    const commandsWithSelectionContext = allTemplates.filter((template) => template.contextType === ContextType.Selection);
    const commandsWithNoContext = allTemplates.filter((template) => template.contextType === ContextType.None);

    const buttonHtml = (template: Template) => {
      return `<li>
  <button
    class="command-button secondary flex flex-col justify-between items-start p-1"
    data-command="${template.command}">
    <div class="text-sm pointer-events-none flex flex-1 w-full justify-between">
      <span>${template.label}</span>
      <span>${template.userMessageTemplate.includes("{{command_args}}") ? "💬" : ""}</span>
    </div>
    <div class="text-xs muted pointer-events-none">
      ${callbackTypeToReadable(template.callbackType)}
    </div>
  </button>
</li>`;
    };

    const commandsWithSelectionContextHTML = commandsWithSelectionContext.map(buttonHtml).join("");
    const commandsWithNoContextHTML = commandsWithNoContext.map(buttonHtml).join("");
    // const commands = allTemplates.map(buttonHtml).join("");

    return $.html()
      .replace("{{scriptUri}}", scriptUri.toString())
      .replace("{{styleResetUri}}", styleResetUri.toString())
      .replace("{{styleVSCodeUri}}", styleVSCodeUri.toString())
      .replace("{{styleMainUri}}", styleMainUri.toString())
      .replace("{{tailwindJsUri}}", tailwindJsUri.toString())
      .replace("{{tailwindCssUri}}", tailwindCssUri.toString())
      .replace("{{selectionContextComments}}", commandsWithSelectionContextHTML)
      .replace("{{noContextComments}}", commandsWithNoContextHTML);
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
      const command = vscode.commands.registerCommand(`wingman.${template.command}`, () => {
        templateHandler(template);
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
