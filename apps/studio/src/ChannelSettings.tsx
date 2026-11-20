/**
 * Settings → Updates: the release channel and what beta adds. Switching takes effect without a
 * restart. The server features are in development builds only, where Dev is a third choice.
 */

import { alphaOpen, type Channel, ChannelTag, setChannel, useChannel } from '@bezier/lessons';
import { isTauri } from '@tauri-apps/api/core';
import { CHANNEL_FEATURES } from './channel-features.js';
import { openExternal } from './open-external.js';
import { Group, Row, Segmented, Switch } from './PrefsControls.js';
import type { AppPrefs } from './preferences.js';
import { checkForUpdate, installUpdate, useUpdateState } from './use-update-check.js';

const NOTES: Record<Channel, string> = {
  stable: 'Stable is what is finished. The new parts below are not shown.',
  beta: 'Beta is for what is new and still being proved. It may change, and may break.',
  alpha:
    'Dev is this development build: everything that reaches a server, not in a published Bezier.',
};

const NEWEST: Record<string, string> = {
  idle: 'Not looked yet.',
  checking: 'Looking…',
  current: 'This is the newest version.',
  failed: 'Could not reach GitHub. Try again later.',
};

const percent = (progress: number | null) =>
  progress === null ? 'Downloading…' : `Downloading… ${Math.round(progress * 100)}%`;

/** Looking for a newer version, and installing it. The desktop app only: the browser always loads the newest. */
function UpdateCheck({
  version,
  prefs,
  onCheck,
}: {
  version: string;
  prefs: AppPrefs;
  onCheck: (value: boolean) => void;
}) {
  const update = useUpdateState();
  if (!isTauri()) {
    return (
      <Group label="Updates" note="This is the browser version. Reload the page to get the newest.">
        <Row label="Installed version">
          <span className="prefs-value">Bezier {version}</span>
        </Row>
      </Group>
    );
  }
  const release = update.release;
  const installing = update.status === 'installing';
  return (
    <>
      <Group
        label="Updates"
        note="Looking reads one file from github.com. GitHub sees your address and the name of the app; nothing about you or your projects is sent."
      >
        <Row label="Installed version">
          <span className="prefs-value">Bezier {version}</span>
        </Row>
        <Row
          label="Look at start"
          note="Once, when the app opens. A newer version is mentioned, never installed without you."
        >
          <Switch
            checked={prefs.checkForUpdates}
            label="Look for updates at start"
            onChange={onCheck}
          />
        </Row>
        <Row
          label="Newest version"
          note={
            release !== null && update.status !== 'current'
              ? `Bezier ${release.version} is out.`
              : (NEWEST[update.status] ?? '')
          }
        >
          <button
            className="prefs-button"
            disabled={update.status === 'checking' || installing}
            onClick={() => void checkForUpdate()}
            type="button"
          >
            Look now
          </button>
        </Row>
        {release !== null && update.status !== 'current' && (
          <Row
            label={`Bezier ${release.version}`}
            note={
              update.status === 'installing'
                ? `${percent(update.progress)} Bezier restarts when it is done. Save your work first.`
                : update.status === 'not-installed'
                  ? 'This install cannot update itself. Download the installer from the release page and run it over this one.'
                  : 'Downloads the new version, installs it and restarts Bezier. Save your work first.'
            }
          >
            {update.status === 'not-installed' ? (
              <button
                className="prefs-button"
                onClick={() => openExternal(release.url)}
                type="button"
              >
                Release page
              </button>
            ) : (
              <button
                className="prefs-button"
                disabled={installing}
                onClick={() => void installUpdate()}
                type="button"
              >
                {installing ? 'Installing…' : 'Update now'}
              </button>
            )}
          </Row>
        )}
      </Group>
      {release !== null && update.status !== 'current' && release.notes !== '' && (
        <Group label="What changed">
          <pre className="prefs-notes">{release.notes}</pre>
        </Group>
      )}
    </>
  );
}

export function ChannelSettings({
  version,
  prefs,
  onCheck,
}: {
  version: string;
  prefs: AppPrefs;
  onCheck: (value: boolean) => void;
}) {
  const channel = useChannel();
  // A development build adds Dev, with the features that reach a server.
  const dev = alphaOpen();
  const options: [Channel, string][] = [
    ['stable', 'Stable'],
    ['beta', 'Beta'],
  ];
  if (dev) options.push(['alpha', 'Dev']);

  return (
    <>
      <UpdateCheck onCheck={onCheck} prefs={prefs} version={version} />
      <Group
        label="Release channel"
        note="Bezier does not install updates by itself. Which parts you see depends on the channel."
      >
        <Row label="Channel" note={NOTES[channel]}>
          <Segmented<Channel>
            name="release-channel"
            onChange={setChannel}
            options={options}
            value={channel}
          />
        </Row>
      </Group>
      {dev && (
        <Group
          label="What is in Dev"
          note="These reach a server, so they are in development builds only, with a Dev mark."
        >
          {CHANNEL_FEATURES.map((feature) => (
            <Row key={feature.id} label={feature.name} note={feature.summary}>
              <ChannelTag gate={feature.gate} />
            </Row>
          ))}
        </Group>
      )}
    </>
  );
}
