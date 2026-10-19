import { useEffect, useState, type ReactNode } from 'react';
import { useGame } from '../state/store';
import { ConfirmDialog, GameShell, ItemDetailSheet, LoadingState, Toast } from '../ui/components/ui';
import {
  BattleScreen,
  BondsScreen,
  BreakthroughScreen,
  CreateScreen,
  CultivateScreen,
  EventScreen,
  HomeScreen,
  InventoryScreen,
  JournalScreen,
  LoadError,
  MapScreen,
  OpeningScreen,
  PrepareScreen,
  RunScreen,
  SettingsScreen,
  SettlementScreen,
} from '../ui/screens/Screens';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  const ready = useGame((state) => state.ready);
  const loadError = useGame((state) => state.loadError);
  const save = useGame((state) => state.save);
  const guest = useGame((state) => state.guest);
  useEffect(() => {
    useGame.getState().boot();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'yinian.save.v1') useGame.getState().markStale();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  let body = <LoadingState />;
  if (ready && loadError && !save) body = <LoadError message={loadError} />;
  else if (ready && !save) body = guest === 'create' ? <CreateScreen /> : <OpeningScreen />;
  else if (ready && save) {
    switch (save.screen) {
      case 'opening': body = <OpeningScreen />; break;
      case 'create': body = <CreateScreen />; break;
      case 'home': body = <HomeScreen save={save} />; break;
      case 'map': body = <MapScreen save={save} />; break;
      case 'prepare': body = <PrepareScreen save={save} />; break;
      case 'run': body = <RunScreen save={save} />; break;
      case 'event': body = <EventScreen save={save} />; break;
      case 'battle': body = <BattleScreen save={save} />; break;
      case 'settlement': body = <SettlementScreen save={save} />; break;
      case 'cultivate': body = <CultivateScreen save={save} />; break;
      case 'inventory': body = <InventoryScreen save={save} />; break;
      case 'bonds': body = <BondsScreen save={save} />; break;
      case 'journal': body = <JournalScreen save={save} />; break;
      case 'settings': body = <SettingsScreen save={save} />; break;
      case 'breakthrough': body = <BreakthroughScreen save={save} />; break;
      default: body = <HomeScreen save={save} />;
    }
  }

  return (
    <ErrorBoundary>
      <GameShell save={save}>
        {body}
        <Toast />
        <ConfirmDialog />
        <ItemDetailSheet />
        <DevOnly />
      </GameShell>
    </ErrorBoundary>
  );
}

function DevOnly() {
  const [panel, setPanel] = useState<ReactNode>(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void import('../dev/DevPanel').then((mod) => {
      setPanel(<mod.DevPanel />);
    });
  }, []);
  if (!import.meta.env.DEV) return null;
  return panel;
}
