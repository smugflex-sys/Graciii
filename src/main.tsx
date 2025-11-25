import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize security features
import { SessionSecurity, CSPHelper } from "./config/security";

// Apply Content Security Policy
CSPHelper.applyCSP();

// Initialize session security monitoring
SessionSecurity.initialize();

createRoot(document.getElementById("root")!).render(
  <App />
);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  SessionSecurity.cleanup();
});
  
