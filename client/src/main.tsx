import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import "./styles/academic.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "./components/ui/toaster";
import HomePage from "./pages/HomePage";
import { ThemeProvider } from "./hooks/use-theme";
import { ThemeToggle } from "./components/ui/theme-toggle";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <SWRConfig value={{ fetcher }}>
        <div className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
              <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="container">
            <Switch>
              <Route path="/" component={HomePage} />
              <Route>404 - Page Not Found</Route>
            </Switch>
          </main>
        </div>
        <Toaster />
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>,
);
