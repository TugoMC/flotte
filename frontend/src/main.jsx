// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "@/contexts/AuthContext";

// Initialisation du thème
if (!localStorage.getItem("theme")) {
  localStorage.setItem("theme", "light");
}
document.documentElement.classList.add(localStorage.getItem("theme"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);