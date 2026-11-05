/**
 * The landing page that the logo, name and first breadcrumb lead to: what the app is, the intro
 * film, its contents, what's new and where to go next. Numbers are counted from the app, pictures
 * are its own, and anything not available yet says so.
 */

import './landing.css';
import { ChannelTag, reaches, useChannel } from '@bezier/lessons';
import { type FilmId, replayFilm } from '../intro/film.js';
import { openExternal } from '../open-external.js';
import { NEWS, type NewsTarget } from './news.js';
import { facts, REPOSITORY_URL, useDownloads } from './stats.js';

export interface LandingGo {
  newProject: () => void;
  projects: () => void;
  to: (target: NewsTarget) => void;
}

/** The films on the start page, side by side: each a frame of the film that plays on a click. */
const FILMS: readonly {
  id: FilmId;
  poster: string;
  alt: string;
  aria: string;
  label: string;
}[] = [
  {
    id: 'intro',
    poster: '/film/intro-poster.webp',
    alt: "Nib, Bezier's robot, at his laptop: a frame of the intro film",
    aria: 'Play the intro film',
    label: 'Watch the intro · 1:24',
  },
  {
    id: 'trailer',
    poster: '/film/trailer-poster.webp',
    alt: 'A metal bracket on a dark floor: a frame of the trailer',
    aria: 'Play the trailer',
    label: 'Watch the trailer · 0:58',
  },
];

export function Landing({ go, version }: { go: LandingGo; version: string }) {
  const channel = useChannel();
  const downloads = useDownloads();
  const news = NEWS.filter((item) => item.gate === undefined || reaches(channel, item.gate));

  return (
    <div className="landing">
      <section aria-label="Bezier" className="landing__hero">
        <div className="landing__intro">
          <h1>
            CAD you'll
            <br />
            want to use.
          </h1>
          <p>Parametric 3D modeling. Free for people. All of the code is public.</p>
          <div className="landing__actions">
            <button
              className="library__action library__action--primary"
              onClick={go.newProject}
              type="button"
            >
              New Project
            </button>
            <button className="library__action" onClick={go.projects} type="button">
              Your projects
            </button>
            <button
              className="library__action"
              onClick={() => go.to({ kind: 'wiki' })}
              type="button"
            >
              Read the wiki
            </button>
            <button
              className="library__action"
              onClick={() => openExternal(REPOSITORY_URL)}
              type="button"
            >
              The code on GitHub
            </button>
          </div>
          <p className="landing__version">
            Bezier {version} {channel !== 'stable' && <ChannelTag gate={channel} />}
          </p>
        </div>
        <div className="landing__stage">
          {FILMS.map((film) => (
            <figure className="landing__film" key={film.id}>
              {/* A frame of the film, showing what the button plays. */}
              <img alt={film.alt} className="landing__film-poster" src={film.poster} />
              {/* The whole picture plays the film full screen, with a working skip. */}
              <button
                aria-label={film.aria}
                className="landing__film-play"
                onClick={() => replayFilm(film.id)}
                type="button"
              >
                <span aria-hidden="true" className="landing__film-icon">
                  <svg aria-hidden="true" height="22" viewBox="0 0 24 24" width="22">
                    <title>Play</title>
                    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                  </svg>
                </span>
                <span className="landing__film-label">{film.label}</span>
              </button>
            </figure>
          ))}
        </div>
      </section>

      <section aria-label="In numbers" className="landing__numbers">
        {facts().map((fact) => (
          <div className="landing__number" key={fact.id}>
            <strong>{fact.value}</strong>
            <span>{fact.label}</span>
          </div>
        ))}
        <div className="landing__number" data-quiet={downloads === null ? '' : undefined}>
          <strong>{downloads === null ? '–' : downloads.toLocaleString('en')}</strong>
          <span>{downloads === null ? 'downloads, counted from the launch' : 'downloads'}</span>
        </div>
      </section>

      <section aria-label="What's new" className="landing__news">
        <h2>What's New?</h2>
        <div className="landing__cards">
          {news.map((item) => (
            <button
              className="landing__card"
              key={item.id}
              onClick={() => go.to(item.go)}
              type="button"
            >
              <span className="landing__card-text">
                <small>
                  {item.label}
                  {item.gate !== undefined && <ChannelTag gate={item.gate} />}
                </small>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
              <img alt="" draggable={false} loading="lazy" src={item.image} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
