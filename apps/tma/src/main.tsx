import "./polyfill";
import { AppRoot } from "@telegram-apps/telegram-ui";
import "@telegram-apps/telegram-ui/dist/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { authenticate } from "./api";
import "./i18n";
import "./styles.css";
import { bootstrapTelegram } from "./telegram";

async function start() {
  await bootstrapTelegram();
  void authenticate().catch(() => undefined);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppRoot>
        <App />
      </AppRoot>
    </React.StrictMode>,
  );
}

void start();
