import { createRoot } from "react-dom/client";
import App from "./App";
import { initPersistence } from "./lib/persistence";
import "./fonts";
import "./index.css";

// Saved data is loaded from native storage before the first render, so no screen
// ever starts from empty defaults and writes them over the user's data.
void initPersistence().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
