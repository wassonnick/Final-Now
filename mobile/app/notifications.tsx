import React from 'react';
import { AppHeader, AppScreen, EmptyState } from '../src/components';

export default function NotificationsScreen() {
  return (
    <AppScreen>
      <AppHeader title="Notifications" subtitle="Alerts for matching homes and saved searches." />
      <EmptyState title="No notifications yet" body="Push notification permissions and saved-search alerts belong in a future phase." />
    </AppScreen>
  );
}
