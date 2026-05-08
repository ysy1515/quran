import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Mushaf from "@/pages/Mushaf";
import Surahs from "@/pages/Surahs";
import JuzPage from "@/pages/Juz";
import Search from "@/pages/Search";
import Bookmarks from "@/pages/Bookmarks";
import Settings from "@/pages/Settings";
import About from "@/pages/About";
import Dhikr from "@/pages/Dhikr";
import Navigation from "@/components/Navigation";

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
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pb-20 md:pb-0 md:pr-64">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/mushaf" component={Mushaf} />
          <Route path="/mushaf/:surah" component={Mushaf} />
          <Route path="/surahs" component={Surahs} />
          <Route path="/juz" component={JuzPage} />
          <Route path="/search" component={Search} />
          <Route path="/bookmarks" component={Bookmarks} />
          <Route path="/settings" component={Settings} />
          <Route path="/about" component={About} />
          <Route path="/dhikr" component={Dhikr} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          <Toaster position="top-center" richColors />
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
