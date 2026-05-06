/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { AppShell } from "./components/AppShell";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="app-ui-theme">
      <TooltipProvider delayDuration={0}>
        <AppShell />
      </TooltipProvider>
    </ThemeProvider>
  );
}
