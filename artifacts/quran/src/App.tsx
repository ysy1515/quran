import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import KhatmahSetup from "@/pages/KhatmahSetup";
import KhatmahPortions from "@/pages/KhatmahPortions";
import Mushaf from "@/pages/Mushaf";
import IndexPage from "@/pages/Index";
import Search from "@/pages/Search";
import Bookmarks from "@/pages/Bookmarks";
import Favorites from "@/pages/Favorites";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import More from "@/pages/More";
import Dhikr from "@/pages/Dhikr";
import Adhan from "@/pages/Adhan";
import AdhanSettings from "@/pages/AdhanSettings";
import Athkar from "@/pages/Athkar";
import AthkarCategory from "@/pages/AthkarCategory";
import TafsirPage from "@/pages/TafsirPage";
import Support from "@/pages/Support";
import Privacy from "@/pages/Privacy";
import AppShell from "@/components/shell/AppShell";
import AppEffects from "@/components/AppEffects";
import SplashScreen from "@/components/SplashScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/khatmah/new" component={KhatmahSetup} />
        <Route path="/khatmah/portions/:kind" component={KhatmahPortions} />
        <Route path="/mushaf" component={Mushaf} />
        <Route path="/mushaf/:surah" component={Mushaf} />
        <Route path="/index" component={IndexPage} />
        <Route path="/surahs">
          <Redirect to="/index" replace />
        </Route>
        <Route path="/juz">
          <Redirect to="/index?tab=juz" replace />
        </Route>
        <Route path="/search" component={Search} />
        <Route path="/bookmarks" component={Bookmarks} />
        <Route path="/favorites" component={Favorites} />
        <Route path="/more" component={More} />
        <Route path="/settings" component={Settings} />
        <Route path="/about" component={About} />
        <Route path="/dhikr" component={Dhikr} />
        <Route path="/adhan" component={Adhan} />
        <Route path="/adhan/settings" component={AdhanSettings} />
        <Route path="/athkar" component={Athkar} />
        <Route path="/athkar/:id" component={AthkarCategory} />
        <Route path="/tafsir-translations" component={TafsirPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

interface AppProps {
  onMounted?: () => void;
}

// The public support and privacy pages (App Store URLs) are plain web pages: no splash.
function isPublicPagePath(): boolean {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return /^\/(support|privacy)\/?$/.test(window.location.pathname.slice(base.length));
}

function App({ onMounted }: AppProps) {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (isPublicPagePath()) return false;
    try {
      if (sessionStorage.getItem("splash-shown")) return false;
      sessionStorage.setItem("splash-shown", "1");
    } catch {
      return false;
    }
    return true;
  });

  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/support">
              <Support />
            </Route>
            <Route path="/privacy">
              <Privacy />
            </Route>
            <Route>
              <AppEffects />
              <Router />
            </Route>
          </Switch>
          <Toaster position="top-center" richColors />
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
