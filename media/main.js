/* eslint-disable no-undef */
// import {
//   provideVSCodeDesignSystem,
//   allComponents
// } from "../node_modules/@vscode/webview-ui-toolkit/dist/toolkit.min.js"

const vscode = acquireVsCodeApi();

function toggleCollapse(node) {
  const collapsed = node.dataset.collapsed !== "true";

  if (!collapsed) {
    document.querySelectorAll("[data-collapse-category]").forEach((el) => {
      if (el !== node && el.dataset.collapsed !== "true") {
        toggleCollapse(el);
      }
    });
  }

  node.dataset.collapsed = collapsed;
  node.setAttribute("aria-expanded", !collapsed);
  node.setAttribute("aria-hidden", collapsed);
  node.dataset.collapsed = collapsed ? "true" : "false";
  $(node).siblings(".command-list").toggleClass("hidden", collapsed);
  $(node).toggleClass("collapsed", collapsed);
  const arrow = $(node).find(".collapse-arrow");
  arrow.toggleClass("rotate-90", collapsed);
  vscode.postMessage({ type: "collapseCategory", value: { category: node.dataset.collapseCategory, collapsed } });
}

function addClickHandler(node) {
  const collapsed = node.dataset.collapsed === "true";

  function handleClick() {
    toggleCollapse(node);
  }

  node.setAttribute("aria-expanded", !collapsed);
  node.setAttribute("aria-hidden", collapsed);
  $(node).siblings(".command-list").toggleClass("hidden", collapsed);
  $(node).toggleClass("collapsed", collapsed);
  node.addEventListener("click", handleClick);
  $(node).find(".collapse-arrow").toggleClass("rotate-90", collapsed);
}

function handleCommandClick(e) {
  const command = e.target?.dataset?.command;
  if (command) {
    vscode.postMessage({ type: "command", value: command });
  }
}

function setupCommandClickHandlers() {
  document.querySelectorAll("[data-command]").forEach((node) => {
    node.addEventListener("click", handleCommandClick);
  });
}

function setupCollapseHandlers() {
  document.querySelectorAll("[data-collapse-category]").forEach(addClickHandler);
}

$("#command-help").on("click", () => {
  $("#help-panel").toggleClass("hidden");
});

setupCommandClickHandlers();
setupCollapseHandlers();
