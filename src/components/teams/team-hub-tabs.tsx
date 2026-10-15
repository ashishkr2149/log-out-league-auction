'use client';

import { useRouter } from 'next/navigation';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'stats', label: 'Team stats' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function TeamHubTabs({
  teamId,
  active,
}: {
  teamId: string;
  active: string;
}) {
  const router = useRouter();
  const value = (TABS.some((t) => t.id === active) ? active : 'members') as TabId;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <SegmentedTabs
        aria-label="Team sections"
        value={value}
        onValueChange={(id) => {
          router.push(`/dashboard/teams/${teamId}?tab=${id}`);
        }}
        items={[...TABS]}
      />
    </div>
  );
}
