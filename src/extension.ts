import * as vscode from "vscode";

import { type Provider } from "./providers";
import { defaultCommands, buildCommandTemplate, type Command } from "./templates/render";
import { commandHandler } from "./templates/runner";
import { display, displayWarning, getConfig } from "./utils";
import { MainViewProvider, SecondaryViewProvider } from "./views";

let providerInstance: Provider | undefined;

export const getProviderInstance = () => {
  return providerInstance;
};

export const setProviderInstance = (provider: Provider) => {
  providerInstance = provider;
};

export class ExtensionState {
  public static context: vscode.ExtensionContext;

  public static create(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static get(key: string) {
    return ExtensionState.context.globalState.get(key);
  }

  public static set(key: string, value: any) {
    ExtensionState.context.globalState.update(key, value);
  }

  public static async getSecret<T>(key: string): Promise<T> {
    return ExtensionState.context.secrets.get(key) as Promise<T>;
  }

  public static createSecret(key: string, value: string) {
    ExtensionState.context.secrets.store(key, value);
  }
}

export function activate(context: vscode.ExtensionContext) {
  ExtensionState.create(context);
  warnDeprecations();

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
    const userTemplates = getConfig<Command[]>("userCommands", []);
    const allTemplates = [];

    if (getConfig<boolean>("showBuiltinCommands", true)) {
      allTemplates.push(...builtinTemplates);
    }

    allTemplates.push(...userTemplates);

    allTemplates.forEach((template: Command) => {
      registerCommand(template);
    });
  } catch (error) {
    display(String(error));
  }
}

export function deactivate() {}

// Introduced in 1.0.21. Should be removed after a short while.
function warnDeprecations() {
  const deprecatedConfigSettings = ["apiKey", "apiBaseUrl", "model", "temperature"];

  const warnings = deprecatedConfigSettings
    .map((setting) => ({ key: `wingman.${setting}`, value: getConfig(setting) }))
    .filter(({ value }) => value !== undefined)
    .map(({ key }) => `${key} (now wingman.openai.${key})`);

  if (warnings.length > 0) {
    displayWarning(`
      The following deprecated config settings were found in your settings.json: ${warnings.join(", ")}.
      The values for these keys will still be used, but in the future they will be completely deprecated.
      Please remove these old settings to avoid this warning on startup.
    `);
  }
}
