/**
 * The intro film shown on first launch, and the trailer beside it on the start page. Release builds
 * bundle them (`public/film/intro.mp4`, 21 MB, and `trailer.mp4`, 15 MB) so they play offline;
 * `bezier.film.url` (`bezier.film.trailer.url`) in storage and, for the intro, `VITE_FILM_URL` at build override the address. A film
 * that cannot load or play never blocks the app.
 */

export type FilmId = 'intro' | 'trailer';

const SEEN = 'bezier.film.seen';
const REPLAY = 'bezier:film-replay';
/** Dispatched when the film ends or is skipped, so the introduction can start. */
export const FILM_DONE = 'bezier:film-done';

/** The film's address; empty means there is no film. */
export function filmUrl(id: FilmId = 'intro'): string {
  try {
    const fromStorage = window.localStorage.getItem(
      id === 'intro' ? 'bezier.film.url' : `bezier.film.${id}.url`,
    );
    if (fromStorage !== null && fromStorage !== '') return fromStorage;
  } catch {
    // Without storage, the build's address.
  }
  try {
    // Browser tests of a built app mark themselves; none are about the film.
    if (window.localStorage.getItem('bezier.e2e') === '1') return '';
  } catch {
    // Not marked.
  }
  const env = (import.meta as ImportMeta & { env?: { VITE_FILM_URL?: string; PROD?: boolean } })
    .env;
  // The dev server has no film; the one in `public/` is for builds.
  const bundled = env?.PROD === true ? `/film/${id}.mp4` : '';
  return (id === 'intro' ? env?.VITE_FILM_URL : undefined) ?? bundled;
}

/**
 * Film files to try, best first. Builds carry H.264/AAC (`.mp4`, hardware-decoded on Mac and
 * Windows) and VP9/Opus (`.webm`, the only pair Linux distributions like Fedora play by default:
 * no AAC decoder, and openh264 reads only the baseline profile). Each desktop build carries only
 * its own (vite.config.ts); the other is still tried for the web build, which has both.
 */
export function filmSources(url: string, served: string | null = null): string[] {
  if (!/\/film\/[a-z]+\.mp4$/.test(url)) return url === '' ? [] : [url];
  const webm = url.replace(/\.mp4$/, '.webm');
  const linux = /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
  // The Linux and Windows apps serve the film file on loopback with byte ranges (`film.rs`).
  // WebKitGTK cannot play WebM from a blob or from Tauri's asset protocol, and WebView2 fails on
  // files served without byte ranges (shows 0:00 of 0:00 and closes).
  if (served !== null) return [served, ...(linux ? [webm, url] : [url, webm])];
  return linux ? [webm, url] : [url, webm];
}

/**
 * A film's address in the Linux and Windows apps, set before the page loads (`main.rs`). The app
 * names the intro; the trailer is served beside it.
 */
export function servedFilm(id: FilmId = 'intro'): string | null {
  const said = (globalThis as { __bezierFilm?: unknown }).__bezierFilm;
  if (typeof said !== 'string' || !said.startsWith('http://127.0.0.1:')) return null;
  return said.replace(/\/intro\.webm$/, `/${id}.webm`);
}

export function filmSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN) !== null;
  } catch {
    // Unknown counts as seen: showing the film on every start is worse than missing it.
    return true;
  }
}

export function markFilmSeen(): void {
  try {
    window.localStorage.setItem(SEEN, new Date().toISOString());
  } catch {
    // Shown again next time.
  }
}

/** Plays a film again, or the trailer, from a menu or the start page: the same overlay, with Skip enabled. */
export function replayFilm(id: FilmId = 'intro'): void {
  window.dispatchEvent(new CustomEvent<FilmId>(REPLAY, { detail: id }));
}

export const REPLAY_EVENT = REPLAY;
