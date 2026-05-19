import React, { useState } from "react";
import "./Landing.css";
import { resolvePath } from "../utils/resolvePath";

function App() {
  const [view, setView] = useState("home");

  if (view === "learn-more") {
    return (
      <div className="landing-container info-view">
        <header className="info-header">
          <button className="btn-text" onClick={() => setView("home")}>
            ← Back to Home
          </button>
          <h1 className="title-small">
            About the <span className="highlight">Songbook</span>
          </h1>
        </header>

        <main className="info-content">
          <section className="info-section">
            <h2>The Digital Rehearsal Suite</h2>
            <p>
              The MVET Choral Songbook is more than just a viewer—it's a
              precision practice tool designed for the rigors of
              veteran-focused vocal performance. Whether you're at home or in a
              group rehearsal, the app provides the tools you need to master
              your part.
            </p>
            <div className="info-grid">
              <div className="info-card">
                <h4>Individual Practice</h4>
                <p>
                  Use the <strong>Rehearsal Focus</strong> tool to isolate your
                  specific vocal line (Soprano, Alto, Tenor, or Bass) with
                  perfect notation and isolation.
                </p>
              </div>
              <div className="info-card">
                <h4>Group Rehearsals</h4>
                <p>
                  Render the <strong>Full Score</strong> in high-fidelity to see
                  how your part fits into the broader SATB arrangement.
                </p>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h2>Supported Formats</h2>
            <p>
              Our library maintains the highest standards of musical integrity
              by providing multiple formats for every arrangement:
            </p>
            <ul className="format-list">
              <li>
                <strong>MusicXML (.mxl)</strong>: The core of our interactive
                engine. Provides dynamic rendering, zoom, and part-isolation.
              </li>
              <li>
                <strong>MuseScore (.mscz)</strong>: Original source files for
                those who wish to open the arrangements in MuseScore for deep
                editing or transposition.
              </li>
              <li>
                <strong>PDF</strong>: High-resolution, print-ready sheets for
                traditional rehearsal needs.
              </li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Always Ready, Always Offline</h2>
            <p>
              The app is built as a <strong>Progressive Web App (PWA)</strong>.
              Once you open it, you can install it to your home screen. All
              sheet music is cached locally, ensuring you have access to the
              full library even when performing in remote venues or aircraft
              hangars without an internet connection.
            </p>
          </section>

          <div className="info-footer">
            <a href={resolvePath("/songbook/")} className="btn btn-primary">
              Enter the Songbook
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-container">
      <header className="hero">
        <div className="glow-orb"></div>
        <div className="hero-content">
          <div className="org-label">Military Voices of East Tennessee</div>
          <h1 className="title">
            Choral <span className="highlight">Songbook</span>
          </h1>
          <p className="subtitle">
            The premier digital resource for veteran-focused vocal arrangements.
            Honor through Harmony.
          </p>
          <div className="cta-group">
            <a href={resolvePath("/songbook/")} className="btn btn-primary">
              Open Songbook
            </a>
            <button
              className="btn btn-secondary"
              onClick={() => setView("learn-more")}
            >
              Learn More
            </button>
          </div>
          <div className="hero-image-frame">
            <img src={resolvePath("/mvet_hero.png")} alt="MVET Patriotic Branding" />
          </div>
        </div>
      </header>

      <section className="features">
        <div className="feature-card">
          <h3>SATB Optimized</h3>
          <p>
            Carefully curated arrangements respecting vocal ranges and
            sustainability.
          </p>
        </div>
        <div className="feature-card">
          <h3>MusicXML Powered</h3>
          <p>High-fidelity rendering and interactive playback for practice.</p>
        </div>
        <div className="feature-card">
          <h3>PWA Ready</h3>
          <p>Install to your device for offline access during rehearsals.</p>
        </div>
      </section>
    </div>
  );
}

export default App;
