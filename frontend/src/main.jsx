// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Initialisation du thème
if (!localStorage.getItem("theme")) {
  localStorage.setItem("theme", "light");
}
document.documentElement.classList.add(localStorage.getItem("theme"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);