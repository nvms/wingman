import fs from "node:fs";
import path from "node:path";

import * as cheerio from "cheerio";
import * as vscode from "vscode";

import { commandMap, ExtensionState, getProviderInstance, setProviderInstance } from "./extension";
import { DEFAULT_PROVIDER, formats, providers, tokenizers } from "./providers";
import { buildCommandTemplate, CallbackType, type ReadyCommand, type Command } from "./templates/render";
import { repeatLast, send } from "./templates/runner";
import { display, displayWarning, getConfig, getProviderConfigValue } from "./utils";

// key is, e.g., "OpenAI Official.temperature"
export const getConfiguredValue = (key: string, fallback = null) => {
  const [provider, property] = key.split(".");
  return getProviderConfigValue(provider, property) ?? fallback;
};

export class ConfigViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "wingman.configView";
  private static _view?: vscode.WebviewView;

  constructor(private readonly _extensionPath: string, private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    ConfigViewProvider._view = webviewView;

    webviewView.webview.html = this.getWebviewHTML(webviewView.webview);

    const sendValue = (key: string, value: any) => {
      ConfigViewProvider.postMessage({ type: "get", value: { key, value } });
    };

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "get": {
          const { key } = data.value; // e.g. "OpenAI Official.temperature"
          sendValue(key, getConfiguredValue(key));
          break;
        }

        case "set": {
          const { key, value } = data.value;
          ExtensionState.set(key, value);
          sendValue(key, value);
          break;
        }

        case "restore": {
          Object.keys(providers).forEach((provider) => {
            // @ts-expect-error Chill out, TypeScript.
            const defaults = providers[provider].defaults;
            Object.keys(defaults).forEach((key) => {
              if (key === "completionParams") {
                Object.keys(defaults.completionParams).forEach((key) => {
                  ExtensionState.set(`${provider}.${key}`, undefined);
                });
                return;
              }
              ExtensionState.set(`${provider}.${key}`, undefined);
            });
          });

          break;
        }

        case "get-providers": {
          ConfigViewProvider.postMessage({ type: "providers", value: providers });
          break;
        }

        case "get-formats": {
          ConfigViewProvider.postMessage({ type: "formats", value: formats });
          break;
        }

        case "get-tokenizers": {
          ConfigViewProvider.postMessage({ type: "tokenizers", value: tokenizers });
          break;
        }

        case "set-current-provider": {
          ExtensionState.set("current-provider", data.value);
          break;
        }

        case "get-current-provider": {
          const provider = (ExtensionState.get("current-provider") as string) ?? DEFAULT_PROVIDER;
          // @ts-expect-error Chill out, TypeScript.
          ConfigViewProvider.postMessage({ type: "current-provider", value: { provider, defaults: providers[provider].defaults } });
          break;
        }
      }
    });
  }

  public static postMessage(message: any) {
    this._view?.webview.postMessage(message);
  }

  private getWebviewHTML(webview: vscode.Webview) {
    const indexHtmlPath = path.join(this._extensionPath, "media", "config.html");
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
    const $ = cheerio.load(indexHtml);

    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "config.js"));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "config.css"));
    const tailwindJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "tailwind.min.js"));
    const tailwindCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "tailwind.min.css"));
    const jqueryJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "jquery.min.js"));

    return $.html()
      .replace("{{scriptUri}}", scriptUri.toString())
      .replace("{{styleResetUri}}", styleResetUri.toString())
      .replace("{{styleVSCodeUri}}", styleVSCodeUri.toString())
      .replace("{{styleMainUri}}", styleMainUri.toString())
      .replace("{{tailwindJsUri}}", tailwindJsUri.toString())
      .replace("{{tailwindCssUri}}", tailwindCssUri.toString())
      .replace("{{jqueryJsUri}}", jqueryJsUri.toString());
  }
}

export class MainViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "wingman.mainView";

  constructor(private readonly _extensionPath: string, private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext<unknown>, _token: vscode.CancellationToken): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        SecondaryViewProvider.postMessage({ type: "shown" });
      } else {
        SecondaryViewProvider.postMessage({ type: "hidden" });
      }
    });

    webviewView.webview.html = this.getWebviewHTML(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "webviewLoaded": {
          break;
        }
        case "command": {
          SecondaryViewProvider.runCommand(buildCommandTemplate(data.value));
          break;
        }
        case "collapseCategory": {
          ExtensionState.set(`category-${data.value.category}-collapsed`, data.value.collapsed);
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

    const bracketsCurlySvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M240 128c-64 0 0 88-64 88H80c-64 0 0-88-64-88c64 0 0-88 64-88h96c64 0 0 88 64 88Z" opacity=".2"/><path d="M43.18 128a29.78 29.78 0 0 1 8 10.26c4.8 9.9 4.8 22 4.8 33.74c0 24.31 1 36 24 36a8 8 0 0 1 0 16c-17.48 0-29.32-6.14-35.2-18.26c-4.8-9.9-4.8-22-4.8-33.74c0-24.31-1-36-24-36a8 8 0 0 1 0-16c23 0 24-11.69 24-36c0-11.72 0-23.84 4.8-33.74C50.68 38.14 62.52 32 80 32a8 8 0 0 1 0 16c-23 0-24 11.69-24 36c0 11.72 0 23.84-4.8 33.74A29.78 29.78 0 0 1 43.18 128ZM240 120c-23 0-24-11.69-24-36c0-11.72 0-23.84-4.8-33.74C205.32 38.14 193.48 32 176 32a8 8 0 0 0 0 16c23 0 24 11.69 24 36c0 11.72 0 23.84 4.8 33.74a29.78 29.78 0 0 0 8 10.26a29.78 29.78 0 0 0-8 10.26c-4.8 9.9-4.8 22-4.8 33.74c0 24.31-1 36-24 36a8 8 0 0 0 0 16c17.48 0 29.32-6.14 35.2-18.26c4.8-9.9 4.8-22 4.8-33.74c0-24.31 1-36 24-36a8 8 0 0 0 0-16Z"/></g></svg>';
    const chatCircleSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128Z" opacity=".2"/><path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24Zm0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.85 7.85 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216Zm12-88a12 12 0 1 1-12-12a12 12 0 0 1 12 12Zm-44 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12Zm88 0a12 12 0 1 1-12-12a12 12 0 0 1 12 12Z"/></g></svg>';
    const caretDownLightSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" class="rotate-180"><path fill="currentColor" d="m212.24 100.24l-80 80a6 6 0 0 1-8.48 0l-80-80a6 6 0 0 1 8.48-8.48L128 167.51l75.76-75.75a6 6 0 0 1 8.48 8.48Z"/></svg>';
    const openAiSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91a6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9a6.046 6.046 0 0 0 .743 7.097a5.98 5.98 0 0 0 .51 4.911a6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206a5.99 5.99 0 0 0 3.997-2.9a6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081l4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085l4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355l-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085l-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5l2.607 1.5v2.999l-2.597 1.5l-2.607-1.5Z"/></svg>';
    const checklistSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2c4.714 0 7.071 0 8.535 1.464C22 4.93 22 7.286 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 15.8L7.143 17L10 14M6 8.8L7.143 10L10 7"/><path stroke-linecap="round" d="M13 9h5m-5 7h5"/></g></svg>';

    // CallbackType identifiers:
    const cbtReplace =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 17h12M4 17l3.5-3.5M4 17l3.5 3.5M7 7h13m0 0l-3.5-3.5M20 7l-3.5 3.5"/></svg>';
    const cbtAfter =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M3 7a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm6.293 5.293a1 1 0 1 0 1.414 1.414L12 18.414l1.293 1.293a1 1 0 0 0 1.414-1.414l-2-2a1 1 0 0 0-1.414 0l-2 2Z"/></svg>';
    const cbtBefore =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M9.293 6.207a1 1 0 0 1 1.414-1.414L12 6.086l1.293-1.293a1 1 0 1 1 1.414 1.414l-2 2a1 1 0 0 1-1.414 0l-2-2ZM3 12a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z"/></svg>';
    const cbtBuffer =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.413-.588T3 19V5q0-.825.588-1.413T5 3h6v2H5v14h14v-6h2v6q0 .825-.588 1.413T19 21H5Zm11-10V8h-3V6h3V3h2v3h3v2h-3v3h-2Z"/></svg>';

    const categories = [...new Set(Array.from(commandMap.values()).map((template) => template.category))];

    const getCallbackTypeSVG = (callbackType?: CallbackType) => {
      if (!callbackType) return "";

      switch (callbackType) {
        case CallbackType.Replace:
          return cbtReplace;
        case CallbackType.AfterSelected:
          return cbtAfter;
        case CallbackType.BeforeSelected:
          return cbtBefore;
        case CallbackType.Buffer:
          return cbtBuffer;
        case CallbackType.None:
          return "";
      }
    };

    const buttonHtml = (template: Command) => {
      return `
        <li>
          <button
            class="command-button flex flex-col justify-between items-start py-1 px-2 text-left"
            data-command="${template.command}">
            <div class="pointer-events-none flex flex-1 w-full flex-col">
              <div class="flex justify-between flex-1 w-full">
                <span>${template.label}</span>
                <div class="flex">
                  <span class="template-type-indicator">${template.userMessageTemplate.includes("{{input") ? chatCircleSvg : ""}</span>
                  <span class="template-type-indicator">${template.userMessageTemplate.includes("{{text_selection}}") ? bracketsCurlySvg : ""}</span>
                  <span class="template-type-indicator">${template.userMessageTemplate.includes("{{project_text}}") ? checklistSvg : ""}</span>
                  <span class="template-type-indicator">${getCallbackTypeSVG(template.callbackType)}</span>
                </div>
              </div>
              <div class="w-full">
                ${
                  getConfig("showCommandDescriptions") && template.description
                    ? `<span class="command-description text-sm">
                      ${template.description}
                    </span>`
                    : ""
                }
              </div>
            </div>
          </button>
        </li>
      `;
    };

    const commands = categories
      .map((category) => {
        const templatesWithThisCategory = Array.from(commandMap.values()).filter((template) => template.category === category);
        const categoryCommandsHTML = templatesWithThisCategory.map(buttonHtml).join("");
        const isCategoryCollapsed = ExtensionState.get(`category-${category}-collapsed`) ?? true;
        return `
            <div class="m-0">
              <div
                class="category select-none p-2 flex flex-row justify-between items-center cursor-pointer"
                data-collapse-category="${category}"
                data-collapsed="${isCategoryCollapsed ? "true" : "false"}"
              >
                <div class="collapse-arrow flex-0 mr-2">
                  ${caretDownLightSvg}
                </div>
                <h2 class="flex-1 font-semibold px-1 inline-flex">${category}</h2>
              </div>
              <ul class="command-list">
                ${categoryCommandsHTML}
              </ul>
            </div>
          `;
      })
      .join("");

    return $.html()
      .replace("{{scriptUri}}", scriptUri.toString())
      .replace("{{styleResetUri}}", styleResetUri.toString())
      .replace("{{styleVSCodeUri}}", styleVSCodeUri.toString())
      .replace("{{styleMainUri}}", styleMainUri.toString())
      .replace("{{tailwindJsUri}}", tailwindJsUri.toString())
      .replace("{{tailwindCssUri}}", tailwindCssUri.toString())
      .replace("{{jqueryJsUri}}", jqueryJsUri.toString())
      .replace("{{commands}}", commands)
      .replace("{{bracketsCurlySvg}}", bracketsCurlySvg)
      .replace("{{chatCircleSvg}}", chatCircleSvg)
      .replace("{{swapSvg}}", cbtReplace)
      .replace("{{afterSvg}}", cbtAfter)
      .replace("{{beforeSvg}}", cbtBefore)
      .replace("{{bufferSvg}}", cbtBuffer)
      .replace("{{openAiSvg}}", openAiSvg)
      .replace("{{checklistSvg}}", checklistSvg);
  }
}

export class SecondaryViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "wingman.secondaryView";
  private static _view?: vscode.WebviewView;

  constructor(private readonly _extensionPath: string, private readonly _extensionUri: vscode.Uri) {}

  public static async runCommand(command: ReadyCommand) {
    const { provider, command: cmd } = command;

    if (!provider) {
      displayWarning(`Provider not found for command ${cmd}.`);
      return;
    }

    const ProviderClass = providers[provider].provider;

    if (!ProviderClass) {
      displayWarning(`Provider ${provider} not found.`);
      return;
    }

    setProviderInstance(new ProviderClass());

    // Every command run should instantiate a new provider, which is why we call destroy here.
    getProviderInstance()?.destroy();
    await getProviderInstance()?.create(this as any, command);

    vscode.commands.executeCommand(cmd!);
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
          getProviderInstance()?.abort();
          SecondaryViewProvider.postMessage({ type: "aborted" });
          break;
        }
        case "repeatLast": {
          repeatLast();
          break;
        }
        case "sendInput": {
          send(data.value);
          break;
        }
        case "display": {
          display(data.value);
          break;
        }
      }
    });
  }

  private getWebviewHTML(webview: vscode.Webview) {
    const indexHtmlPath = path.join(this._extensionPath, "media", "secondary.html");
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
    const $ = cheerio.load(indexHtml);

    const generateUri = (uri: string) => webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", uri)).toString();

    const userSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48"><mask id="ipTAvatar0"><path fill="#555" stroke="#fff" stroke-linejoin="round" stroke-width="4" d="M5.004 42.231a.78.78 0 0 0 .791.769h36.407a.78.78 0 0 0 .792-.769v-.918c.018-.277.055-1.657-.855-3.184c-.574-.963-1.407-1.794-2.476-2.472c-1.293-.82-2.938-1.413-4.928-1.77a29.236 29.236 0 0 1-3.002-.584c-2.632-.672-2.862-1.267-2.864-1.273a.763.763 0 0 0-.066-.169c-.022-.11-.075-.528.027-1.647c.258-2.843 1.783-4.523 3.008-5.873c.386-.425.751-.828 1.032-1.222c1.213-1.7 1.325-3.635 1.33-3.755a2 2 0 0 0-.087-.628c-.12-.37-.343-.6-.507-.77a2.874 2.874 0 0 1-.113-.12c-.012-.014-.044-.052-.015-.243a19.01 19.01 0 0 0 .203-1.857c.056-1.002.099-2.5-.16-3.959a6.031 6.031 0 0 0-.172-.825c-.273-1.004-.711-1.862-1.32-2.57c-.105-.115-2.653-2.8-10.05-3.35c-1.023-.076-2.034-.035-3.03.016a4.39 4.39 0 0 0-.875.108c-.764.197-.968.681-1.021.952c-.089.45.067.798.17 1.03c.015.033.034.074.001.182c-.171.266-.442.506-.717.733c-.08.067-1.934 1.667-2.036 3.756c-.275 1.589-.255 4.064.07 5.775c.02.095.047.235.002.33c-.35.313-.746.668-.745 1.478c.004.082.117 2.016 1.33 3.717c.28.394.645.796 1.03 1.221l.002.001c1.225 1.35 2.75 3.03 3.008 5.872c.101 1.12.048 1.537.027 1.648a.758.758 0 0 0-.067.169c-.001.006-.23.599-2.85 1.27c-1.512.387-3 .585-3.045.59c-1.934.327-3.569.906-4.86 1.721c-1.065.673-1.9 1.507-2.48 2.477c-.928 1.55-.903 2.962-.89 3.22v.923Z"/></mask><path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipTAvatar0)"/></svg>';
    const aiSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48"><mask id="ipTRobotOne0"><g fill="none"><rect width="30" height="24" x="9" y="18" fill="#555" stroke="#fff" stroke-width="4" rx="2"/><circle cx="17" cy="26" r="2" fill="#fff"/><circle cx="31" cy="26" r="2" fill="#fff"/><path fill="#fff" d="M20 32a2 2 0 1 0 0 4v-4Zm8 4a2 2 0 1 0 0-4v4Zm-8 0h8v-4h-8v4Z"/><path stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M24 10v8M4 26v8m40-8v8"/><circle cx="24" cy="8" r="2" stroke="#fff" stroke-width="4"/></g></mask><path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipTRobotOne0)"/></svg>';

    const uris = {
      scriptUri: generateUri("secondary.js"),
      styleResetUri: generateUri("reset.css"),
      styleVSCodeUri: generateUri("vscode.css"),
      styleSecondaryUri: generateUri("secondary.css"),
      tailwindJsUri: generateUri("tailwind.min.js"),
      tailwindCssUri: generateUri("tailwind.min.css"),
      markedJsUri: generateUri("marked.min.js"),
      markedHighlightJsUri: generateUri("marked.highlight.js"),
      highlightJsUri: generateUri("highlight.min.js"),
      highlightCssUri: generateUri("highlight-vscode.min.css"),
      jqueryJsUri: generateUri("jquery.min.js"),

      avatarUserUri: userSvg,
      avatarAiUri: aiSvg,
    };

    return Object.entries(uris).reduce((html, [key, value]) => html.replace(`{{${key}}}`, value), $.html());
  }
}
