/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-undef */
import {
  provideVSCodeDesignSystem,
  allComponents,
  // eslint-disable-next-line import/extensions
} from "../node_modules/@vscode/webview-ui-toolkit/dist/toolkit.min.js";

provideVSCodeDesignSystem().register(allComponents);

const vscode = acquireVsCodeApi();

let providers = {};
let formats = {};
let tokenizers = {};
let currentProviderLabel = "";
let currentProviderDefaults = {};

const getValuesForCurrentProvider = () => {
  Object.keys(currentProviderDefaults).forEach((key) => {
    if (key === "completionParams") {
      Object.keys(currentProviderDefaults.completionParams).forEach((key) => {
        vscode.postMessage({ type: "get", value: { key: `${currentProviderLabel}.${key}` } });
      });

      return;
    }

    vscode.postMessage({ type: "get", value: { key: `${currentProviderLabel}.${key}` } });
  });
};

const onProviderChange = (defaults) => {
  const target = $("#provider-specific-configuration");
  target.empty();

  const createInputs = (defaults) => {
    Object.entries(defaults).forEach(([key, value]) => {
      if (key === "completionParams") return createInputs(value);
      if (key === "format") return;
      if (key === "tokenizer") return;

      const label = $("<label class='mt-1'></label>");
      label.text(key);
      label.attr("for", `${currentProviderLabel}.${key}`);
      target.append(label);

      const input = $("<input></input>");
      const inputType = typeof value === "string" ? "text" : "number";

      // TODO: Maybe support other types as needed, e.g., boolean->checkbox, array->dropdown, etc.
      if (inputType !== "text" && inputType !== "number") return;

      input.attr("type", typeof value);
      input.attr("id", `${currentProviderLabel}.${key}`);
      input.attr("name", `${currentProviderLabel}.${key}`);
      input.attr("value", value);

      if (inputType === "number") {
        input.attr("min", 0);
        input.attr("step", 0.1);
      }

      target.append(input);

      input.on("change", (e) => {
        vscode.postMessage({
          type: "set",
          value: { key: `${currentProviderLabel}.${key}`, value: e.target.value },
        });
      });
    });
  };

  createInputs(defaults);

  vscode.postMessage({ type: "set-current-provider", value: currentProviderLabel });
  vscode.postMessage({ type: "get-formats" });
  vscode.postMessage({ type: "get-tokenizers" });

  getValuesForCurrentProvider();
};

$("#config-provider-value").on("change", (e) => {
  currentProviderLabel = e.target.value;
  currentProviderDefaults = providers[currentProviderLabel].defaults ?? {};

  if (!providers[currentProviderLabel]) return;

  onProviderChange(currentProviderDefaults);
});

$("#restore-settings-button").on("click", (e) => {
  vscode.postMessage({ type: "restore" });
  setTimeout(() => {
    getValuesForCurrentProvider();
  }, 100);
});

window.addEventListener("message", (e) => {
  const message = e.data;

  switch (message.type) {
    // Response to "get-current-provider" message
    case "current-provider": {
      const { provider, defaults } = message.value;

      currentProviderLabel = provider;
      currentProviderDefaults = defaults;

      vscode.postMessage({ type: "get-providers" });

      break;
    }

    // Response to "get-providers" message
    case "providers": {
      providers = message.value;
      const labels = Object.entries(providers);

      const providerSelect = $("#config-provider-value");
      providerSelect.empty();

      // Create a new <vscode-option> for each provider.
      labels.forEach(([label, provider]) => {
        if (!currentProviderLabel) {
          currentProviderLabel = label;
          currentProviderDefaults = provider.defaults;
        }

        const option = document.createElement("vscode-option");
        option.setAttribute("value", label);
        option.textContent = label;
        providerSelect.append(option);
      });

      // Set the value of the provider dropdown.
      providerSelect.val(currentProviderLabel);

      onProviderChange(currentProviderDefaults);

      break;
    }

    // Response to "get-formats" message
    case "formats": {
      formats = message.value;

      const formatSelect = $("#config-format-value");
      formatSelect.attr("name", `${currentProviderLabel}.format`);
      formatSelect.empty();

      formatSelect.on("change", (e) => {
        vscode.postMessage({ type: "set", value: { key: `${currentProviderLabel}.format`, value: e.target.value } });
      });

      Object.entries(formats).forEach(([label, _]) => {
        const option = document.createElement("vscode-option");
        option.setAttribute("value", label);
        option.textContent = label;
        formatSelect.append(option);
      });

      // Get the configured value for the format for the currently selected provider.
      vscode.postMessage({ type: "get", value: { key: `${currentProviderLabel}.format` } });

      break;
    }

    // Response to "get-tokenizers" message
    case "tokenizers": {
      tokenizers = message.value;

      const tokenizerSelect = $("#config-tokenizer-value");
      tokenizerSelect.attr("name", `${currentProviderLabel}.tokenizer`);
      tokenizerSelect.empty();

      tokenizerSelect.on("change", (e) => {
        vscode.postMessage({ type: "set", value: { key: `${currentProviderLabel}.tokenizer`, value: e.target.value } });
      });

      Object.entries(tokenizers).forEach(([label, _]) => {
        const option = document.createElement("vscode-option");
        option.setAttribute("value", label);
        option.textContent = label;
        tokenizerSelect.append(option);
      });

      // Get the configured value for the format for the currently selected provider.
      vscode.postMessage({ type: "get", value: { key: `${currentProviderLabel}.tokenizer` } });

      break;
    }

    case "get": {
      const { key, value } = message.value;

      $(`[name="${key}"]`).val(value);

      break;
    }
  }
});

// The response to this message is considered the entrypoint for this panel's logic.
vscode.postMessage({ type: "get-current-provider" });
