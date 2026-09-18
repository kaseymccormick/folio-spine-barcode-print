import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { HelpDocPage } from "./app/components/HelpDocPage.tsx";
import { getHelpDocFromPath } from "./app/lib/helpDocs.tsx";
import "./styles/index.css";

const helpDoc = getHelpDocFromPath(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  helpDoc ? <HelpDocPage doc={helpDoc} /> : <App />
);
