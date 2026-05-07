import {TooltipProvider} from '@/components/ui/tooltip';
import {AppShell} from './components/AppShell';
import {ThemeProvider} from './components/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="app-ui-theme">
      <TooltipProvider delay={0}>
        <AppShell />
      </TooltipProvider>
    </ThemeProvider>
  );
}
