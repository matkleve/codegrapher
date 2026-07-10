import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { registerVscodeIcons } from "@/lib/registerVscodeIcons";
import { applyStoredTheme } from "@/lib/theme";
import "./index.css";

registerVscodeIcons();

applyStoredTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
