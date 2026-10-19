import { useState } from 'react';
import { devMark } from '../game/engine/flow';
import { useGame } from '../state/store';

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const save = useGame((state) => state.save);
  if (!import.meta.env.DEV || !save) return null;
  const commit = useGame.getState().commit;
  return (
    <div style={{ position: 'absolute', right: 8, bottom: 72, zIndex: 7 }}>
      {open ? (
        <div className="panel stack" style={{ width: 220, background: '#fbf7ee' }}>
          <strong>开发工具</strong>
          <button className="btn" onClick={() => commit((current) => devMark(current, (next) => {
            next.world.flags.rain_done = true;
            next.world.flags.qi_taught = true;
            next.world.flags.tutorial_completed = true;
            next.world.flags.school_sword = true;
            if (!next.player.learnedTechniqueIds.includes('tech_songfeng')) next.player.learnedTechniqueIds.push('tech_songfeng');
            next.player.equipment.techniqueId = next.player.equipment.techniqueId ?? 'tech_songfeng';
            next.player.cultivation = Math.max(next.player.cultivation, 50);
          }))}>备好引气条件</button>
          <button className="btn" onClick={() => commit((current) => devMark(current, (next) => {
            next.player.cultivation += 10;
          }))}>修为 +10</button>
          <p className="muted">只在开发构建出现，不发放正式奖励。</p>
          <button className="btn ghost" onClick={() => setOpen(false)}>收起</button>
        </div>
      ) : <button className="icon-btn" onClick={() => setOpen(true)}>测</button>}
    </div>
  );
}
