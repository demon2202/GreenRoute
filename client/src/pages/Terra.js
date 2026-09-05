import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TerraHome from './terra/TerraHome';
import TerraRecord from './terra/TerraRecord';
import TerraStory from './terra/TerraStory';
import TerraDetail from './terra/TerraDetail';
import './Terra.css';

/**
 * TERRA — GreenRoute's personal journey experience.
 * ?view=record|story|detail&id=...&mode=...  (survives refresh)
 */
export default function Terra({ user }) {
  const [sp, setSp] = useSearchParams();

  const nav = useCallback((next) => {
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    setSp(p, { replace: false });
  }, [setSp]);

  const view = sp.get('view') || 'home';
  const id = sp.get('id');
  const mode = sp.get('mode') || 'cycling';

  if (view === 'record') {
    return (
      <TerraRecord
        initialMode={mode}
        onCancel={() => nav({ view: 'home' })}
        onSaved={(act) => nav({ view: 'story', id: act._id })}
      />
    );
  }
  if (view === 'story' && id) {
    return (
      <TerraStory
        key={id}
        activityId={id}
        goHome={() => nav({ view: 'home' })}
        onOpenDetail={(aid) => nav({ view: 'detail', id: aid })}
        onDone={() => nav({ view: 'home' })}
      />
    );
  }
  if (view === 'detail' && id) {
    return (
      <TerraDetail
        key={id}
        activityId={id}
        goHome={() => nav({ view: 'home' })}
        onEditStory={(aid) => nav({ view: 'story', id: aid })}
      />
    );
  }
  return (
    <TerraHome
      key={user?.id || 'home'}
      goRecord={(m) => nav({ view: 'record', mode: m })}
      goDetail={(aid) => nav({ view: 'detail', id: aid })}
      goEdit={(aid) => nav({ view: 'story', id: aid })}
    />
  );
}
