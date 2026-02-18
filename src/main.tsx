import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force favicon override — runs after any platform head injection
const setFavicon = () => {
  document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());

  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/png";
  icon.href = "/nythic-logo.png?v=3";
  document.head.appendChild(icon);

  const shortcut = document.createElement("link");
  shortcut.rel = "shortcut icon";
  shortcut.type = "image/png";
  shortcut.href = "/nythic-logo.png?v=3";
  document.head.appendChild(shortcut);

  const apple = document.createElement("link");
  apple.rel = "apple-touch-icon";
  apple.href = "/nythic-logo.png?v=3";
  document.head.appendChild(apple);
};

setFavicon();

createRoot(document.getElementById("root")!).render(<App />);
