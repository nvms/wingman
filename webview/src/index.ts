import App from "./components/App.svelte";
import "./hljs.css";
import "./app.css";

// @ts-ignore
if (__APP_ENV__ === "development") {
  import("./dev.css");
}

const app = new App({ target: document.getElementById("app") as Element });

export default app;