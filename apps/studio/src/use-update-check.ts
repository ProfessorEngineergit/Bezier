/**
 * The result of the last look for a newer version, shared by the start-up hint and Settings →
 * Updates, and the install that follows. Nothing is asked unless `checkForUpdate` is called. The
 * updater (tauri-plugin-updater) reads `latest.json` from the release page, checks the package's
 * signature against the key built into the app, and installs it. With Beta switched on it reads the
 * beta channel's file instead (`updates.rs`), which names the newest beta or stable, whichever is
 * newer.
 */

import { chosenChannel } from '@bezier/lessons';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { useSyncExternalStore } from 'react';
import { type Release, releaseOf } from './updates.js';

export interface UpdateState {
  status: 'idle' | 'checking' | 'current' | 'available' | 'installing' | 'failed' | 'not-installed';
  release: Release | null;
  /** While installing: how much of the package has arrived, 0 to 1, or null when its size is unknown. */
  progress: number | null;
}

let state: UpdateState = { status: 'idle', release: null, progress: null };
let found: Update | null = null;
/** True when the last check was the beta channel's, so the install goes the same way. */
let foundOnBeta = false;

interface BetaUpdate {
  version: string;
  body: string | null;
  date: string | null;
}
const listeners = new Set<() => void>();

function set(next: UpdateState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Asks whether a newer version than the installed one is out. */
export async function checkForUpdate(): Promise<UpdateState> {
  if (state.status === 'checking' || state.status === 'installing') return state;
  set({ status: 'checking', release: state.release, progress: null });
  try {
    if (chosenChannel() !== 'stable') {
      const beta = await invoke<BetaUpdate | null>('check_beta_update');
      found = null;
      foundOnBeta = beta !== null;
      set(
        beta === null
          ? { status: 'current', release: null, progress: null }
          : {
              status: 'available',
              release: releaseOf({
                version: beta.version,
                ...(beta.body === null ? {} : { body: beta.body }),
                ...(beta.date === null ? {} : { date: beta.date }),
              }),
              progress: null,
            },
      );
      return state;
    }
    foundOnBeta = false;
    found = await check();
    set(
      found === null
        ? { status: 'current', release: null, progress: null }
        : { status: 'available', release: releaseOf(found), progress: null },
    );
  } catch {
    set({ status: 'failed', release: null, progress: null });
  }
  return state;
}

/** Downloads the newer version, installs it and starts it. When it cannot, the page says so. */
export async function installUpdate(): Promise<void> {
  if (foundOnBeta && state.status !== 'installing') return installBeta();
  const update = found;
  if (update === null || state.status === 'installing') return;
  const release = state.release;
  set({ status: 'installing', release, progress: null });
  let total = 0;
  let received = 0;
  try {
    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') total = event.data.contentLength ?? 0;
      else if (event.event === 'Progress') received += event.data.chunkLength;
      else return;
      set({ status: 'installing', release, progress: total > 0 ? received / total : null });
    });
    await relaunch();
  } catch {
    // This install cannot replace itself (a .deb or .rpm on Linux, or a download that broke).
    set({ status: 'not-installed', release, progress: null });
  }
}

/** The beta channel's install, done by the app (`updates.rs`), which reports progress as it goes. */
async function installBeta(): Promise<void> {
  const release = state.release;
  set({ status: 'installing', release, progress: null });
  const stop = await listen<[number, number | null]>('bezier:update-progress', (event) => {
    const [received, total] = event.payload;
    set({ status: 'installing', release, progress: total ? received / total : null });
  });
  try {
    await invoke('install_beta_update');
    await relaunch();
  } catch {
    set({ status: 'not-installed', release, progress: null });
  } finally {
    stop();
  }
}
