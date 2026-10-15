'use client';

import { useState } from 'react';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import {
  TournamentListCards,
  type TournamentListItem,
} from '@/components/tournament/tournament-list-cards';

export function TournamentsTabs({
  mine,
  open,
}: {
  mine: TournamentListItem[];
  open: TournamentListItem[];
}) {
  const [tab, setTab] = useState<'mine' | 'open'>('mine');

  return (
    <div className="space-y-4">
      <SegmentedTabs
        aria-label="Tournament lists"
        value={tab}
        onValueChange={setTab}
        items={[
          { id: 'mine', label: 'My tournaments', count: mine.length },
          { id: 'open', label: 'Open', count: open.length },
        ]}
      />
      <TournamentListCards items={tab === 'mine' ? mine : open} />
    </div>
  );
}
