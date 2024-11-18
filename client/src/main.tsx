import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import "./styles/academic.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "./components/ui/toaster";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import { ThemeProvider } from "./hooks/use-theme";
import { ThemeToggle } from "./components/ui/theme-toggle";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useUser } from "./hooks/use-user";
import { Button } from "./components/ui/button";
import { LogOut } from "lucide-react";

function Header() {
  const { user, logout } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between space-x-2">
          <div className="font-medium">Research Assistant</div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.username}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <SWRConfig 
        value={{ 
          fetcher,
          shouldRetryOnError: false
        }}
      >
        <div className="min-h-screen bg-background text-foreground">
          <Header />
          <main className="container">
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/">
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              </Route>
              <Route>404 - Page Not Found</Route>
            </Switch>
          </main>
        </div>
        <Toaster />
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>
);
