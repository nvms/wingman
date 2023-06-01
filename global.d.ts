type Message = import('../src/view/messages/messageTypes').Message;

type VSCode = {
  postMessage<T extends Message = Message>(message: T): void;
  getState(): any;
  setState(state: any): void;
  acquireVsCodeApi(): VSCode;
};

declare const vscode: VSCode;

declare const apiUserGender: string;