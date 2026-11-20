import React, {useState, type ReactNode} from 'react';
import {View} from 'react-native';
import {adminSnapshotStatus, bump, useDb, type AdminSnapshotDomain} from '../state/db';
import {hydrateAdminState} from '../lib/hydrateAdminState';
import {Card} from './Card';
import {OutlineBtn} from './Controls';
import {Txt} from './Txt';

const names = {operations: 'Applications', ecosystem: 'Business records', restrictions: 'Account restrictions'};

/** A failed required snapshot must not be rendered as an empty successful list. */
export function AdminSnapshotBoundary({domain, children}: {domain: AdminSnapshotDomain; children?: ReactNode}) {
  useDb();
  const [retrying, setRetrying] = useState(false);
  const status = adminSnapshotStatus[domain];
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await hydrateAdminState(); }
    catch { adminSnapshotStatus[domain] = 'error'; bump(); }
    finally { setRetrying(false); }
  };
  if (status === 'loading') return <Card><Txt size={11} mut>Loading {names[domain].toLowerCase()}…</Txt></Card>;
  if (status === 'error') return <Card><View accessibilityRole="alert"><Txt size={11}>{names[domain]} could not be loaded. Check your connection and access, then retry.</Txt><OutlineBtn disabled={retrying} onPress={() => { void retry(); }}>{retrying ? 'Refreshing…' : 'Try again'}</OutlineBtn></View></Card>;
  return <>{children}</>;
}
