let vscode;

// @ts-ignore
if (__APP_ENV__ === "development") {
  vscode = { postMessage: () => {} };
} else {
  // @ts-ignore
  vscode = acquireVsCodeApi();
}

type Message = {
  id: string;
  content: any;
};

class ExtensionCommunication {
  private messagePromises: { [id: string]: (value: any) => void } = {};
  private messageHandlers: { [type: string]: ((content: any) => void)[] } = {};

  constructor() {
    window.addEventListener("message", this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    const message: Message = event.data;

    if (this.messagePromises[message.id]) {
      this.messagePromises[message.id](message.content);
      delete this.messagePromises[message.id];
    }

    if (this.messageHandlers[message?.content?.type]) {
      this.messageHandlers[message.content.type].forEach(handler => handler(message.content));
    }
  };

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  public sendMessage(content: any): Promise<any> {
    const id = this.generateId();
    const message: Message = { id, content };

    return new Promise((resolve) => {
      this.messagePromises[id] = resolve;
      vscode.postMessage(message, "*");
    });
  }

  public GET(key: any, value?: any): Promise<any> {
    return this.sendMessage({ type: "get", key, value });
  }

  public SET(key: any, value: any): Promise<any> {
    return this.sendMessage({ type: "set", key, value });
  }

  public CREATE(key: any, value: any): Promise<any> {
    return this.sendMessage({ type: "create", key, value });
  }

  public UPDATE(key: any, value: any): Promise<any> {
    return this.sendMessage({ type: "update", key, value });
  }

  public DELETE(key: any, value: any): Promise<any> {
    return this.sendMessage({ type: "delete", key, value });
  }

  public RUN(key: any): Promise<any> {
    return this.sendMessage({ type: "run", key });
  }
  
  public ABORT(): Promise<any> {
    return this.sendMessage({ type: "abort" });
  }

  public DIFF(value: string): Promise<any> {
    return this.sendMessage({ type: "diff", value });
  }

  public DIFF_SELECTION(value: string): Promise<any> {
    return this.sendMessage({ type: "diffSelection", value });
  }

  public SEND(value: string): Promise<any> {
    return this.sendMessage({ type: "send", value });
  }

  public SEND_UNPROMPTED(value: string): Promise<any> {
    return this.sendMessage({ type: "sendUnprompted", value });
  }

  public REPLACE_SELECTION(value: string): Promise<any> {
    return this.sendMessage({ type: "replaceSelection", value });
  }

  public RESTORE_DEFAULTS(): Promise<any> {
    return this.sendMessage({ type: "restoreDefaults" });
  }

  public on(type: string, handler: (content: any) => void): () => void {
    if (!this.messageHandlers[type]) {
      this.messageHandlers[type] = [];
    }

    this.messageHandlers[type].push(handler);

    return () => {
      const index = this.messageHandlers[type].indexOf(handler);
      if (index !== -1) {
        this.messageHandlers[type].splice(index, 1);
      }
    };
  }
}

const extComm = new ExtensionCommunication();

export default extComm;