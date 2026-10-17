import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import TabBar from "./TabBar";
import { noteRouteChange } from "./Screen";

/** Fixed three-region layout: [screen header + scrolling body] above a fixed tab bar. */
export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  useEffect(() => {
    noteRouteChange();
  }, [location]);

  return (
    <div className="app-shell" dir="rtl">
      <div className="app-shell__screen">{children}</div>
      <TabBar />
    </div>
  );
}
