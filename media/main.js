/* eslint-disable no-undef */

(() => {
  const vscode = acquireVsCodeApi();

  document.querySelectorAll("[data-command]").forEach((node) => {
    node.addEventListener("click", (e) => {
      const command = e.target?.dataset?.command;
      if (command) {
        vscode.postMessage({ type: "command", value: command });
      }
    });
  });
})();
