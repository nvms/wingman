import * as vscode from "vscode";

import { providers, type Provider } from "./providers";
import { defaultCommands, buildCommandTemplate, type Command } from "./templates/render";
import { commandHandler } from "./templates/runner";
import { display, generateCommandName, getConfig, randomString } from "./utils";
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

export const commandMap = new Map<string, Command>();

function createCommandMap(templates: Command[]) {
  const allCommands = templates.map((template) => {
    return {
      ...template,
      command: template.command ? `wingman.command.${template.command}` : `wingman.command.${generateCommandName(template)}-${randomString()}`,
    };
  });

  allCommands.forEach((template) => {
    commandMap.set(template.command, template);
  });
}

export function activate(context: vscode.ExtensionContext) {
  ExtensionState.create(context);

  const builtinTemplates = [...defaultCommands];
  const userTemplates = getConfig<Command[]>("userCommands", []);
  const allTemplates: Command[] = [];

  if (getConfig<boolean>("showBuiltinCommands", true)) {
    allTemplates.push(...builtinTemplates);
  }

  allTemplates.push(...userTemplates);

  createCommandMap(allTemplates);

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

    const setApiKeyCommand = vscode.commands.registerCommand("wingman.setApiKey", async () => {
      const selectedProvider = await vscode.window.showQuickPick(
        Object.keys(providers).map((key) => ({ label: key })),
        { placeHolder: "Select the provider you want to set the API key for" },
      );

      if (!selectedProvider) return;

      const apiKey = await vscode.window.showInputBox({
        placeHolder: `Enter your ${selectedProvider.label} API key`,
      });

      if (!apiKey) return;

      ExtensionState.createSecret(`${selectedProvider.label}.apiKey`, apiKey);
    });

    context.subscriptions.push(setApiKeyCommand);

    const firstCollapse = ExtensionState.get("firstCollapse") ?? true;

    const registerCommand = (template: Command) => {
      if (!template.command) return;

      const command = vscode.commands.registerCommand(template.command, () => {
        commandHandler(buildCommandTemplate(template.command!));
      });

      if (firstCollapse) {
        ExtensionState.set(`category-${template.category}-collapsed`, true);
      }

      context.subscriptions.push(command);
    };

    commandMap.forEach((template: Command) => {
      registerCommand(template);
    });

    if (firstCollapse) {
      ExtensionState.set("firstCollapse", false);
    }
  } catch (error) {
    display(String(error));
  }
}

export function deactivate() {}
