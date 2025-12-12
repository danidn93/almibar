// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Toasters
import { Toaster as ShadToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>

    <AuthProvider>
      <BrowserRouter>

        <App />

        {/* Toasters deben estar DENTRO del provider y router */}
        <ShadToaster />
        <SonnerToaster position="bottom-right" richColors closeButton expand />

      </BrowserRouter>
    </AuthProvider>

  </React.StrictMode>
);
