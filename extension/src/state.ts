import * as vscode from "vscode";

export class State {
  public static context: vscode.ExtensionContext;

  public static create(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static get(key: string) {
    return State.context.globalState.get(key);
  }

  public static async getAsync<T>(key: string) {
    return await State.context.globalState.get(key) as T;
  }

  public static set(key: string, value: unknown) {
    return State.context.globalState.update(key, value);
  }

  public static getSecret<T>(key: string) {
    return State.context.secrets.get(key) as T;
  }

  public static setSecret(key: string, value: string) {
    return State.context.secrets.store(key, value);
  }

  public static clear() {
    return State.context.globalState.keys().forEach((key) => State.context.globalState.update(key, undefined));
  }

  public static getWorkspace(key: string) {
    return State.context.workspaceState.get(key);
  }

  public static setWorkspace(key: string, value: unknown) {
    return State.context.workspaceState.update(key, value);
  }
}