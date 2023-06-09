/* eslint-disable no-undef */
// import {
//   provideVSCodeDesignSystem,
//   allComponents
// } from "../node_modules/@vscode/webview-ui-toolkit/dist/toolkit.min.js"

const vscode = acquireVsCodeApi();

// provideVSCodeDesignSystem().register(allComponents);

document.querySelectorAll("[data-command]").forEach((node) => {
  node.addEventListener("click", (e) => {
    const command = e.target?.dataset?.command;
    if (command) {
      vscode.postMessage({ type: "command", value: command });
    }
  });
});

function toggleCollapse(node, category, collapsed) {
  collapsed = !collapsed;
  node.dataset.collapsed = collapsed;
  node.setAttribute("aria-expanded", collapsed);
  node.setAttribute("aria-hidden", !collapsed);
  node.dataset.collapsed = collapsed ? "true" : "false";
  $(node).siblings(".command-list").toggleClass("hidden", collapsed);
  $(node).toggleClass("collapsed", collapsed);
  const arrow = $(node).find(".collapse-arrow");
  arrow.toggleClass("rotate-90", collapsed);
  vscode.postMessage({ type: "collapseCategory", value: { category, collapsed } });
  console.log("toggleCollapsed", category, collapsed);
}

document.querySelectorAll("[data-collapse-category]").forEach((node) => {
  const category = node.dataset.collapseCategory;
  let collapsed = node.dataset.collapsed === "true";

  function handleClick() {
    toggleCollapse(node, category, collapsed);
    collapsed = !collapsed;
  }

  node.setAttribute("aria-expanded", !collapsed);
  node.setAttribute("aria-hidden", collapsed);
  $(node).siblings(".command-list").toggleClass("hidden", collapsed);
  $(node).toggleClass("collapsed", collapsed);
  node.addEventListener("click", handleClick);

  $(node).find(".collapse-arrow").toggleClass("rotate-90", collapsed);
});

$("#command-help").on("click", () => {
  $("#help-panel").toggleClass("hidden");
});
