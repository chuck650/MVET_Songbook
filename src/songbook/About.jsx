import React from 'react';
import './About.css';

const About = ({ onBack }) => {
  return (
    <div className="about-container">
      <header className="about-header">
        <button onClick={onBack} className="btn-back">← Back</button>
        <h1 className="about-title">About & Legal</h1>
      </header>

      <main className="about-content glass">
        <section className="about-section">
          <div className="section-icon">🖥️</div>
          <h2>Website Source Code</h2>
          <p>
            The source code, engine, and interface powering this digital songbook website are open-source software. 
            The underlying codebase is licensed under the <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>.
          </p>
          <p className="copyright-line">Copyright (c) 2026 Chuck Nelson.</p>
          <p>
            You are free to copy, modify, and distribute this website framework under the condition that any modified 
            versions hosted over a network must make their complete source code publicly available under the same AGPL-3.0 terms.
          </p>
        </section>

        <hr className="about-divider" />

        <section className="about-section">
          <div className="section-icon">🎼</div>
          <h2>Musical Content and Copyright Notice</h2>
          <p>
            The musical content hosted on this platform—including sheet music, chord charts, lyrics, notation data files, 
            and audio previews—is treated separately from the software engine. This website does not claim ownership 
            over the underlying musical compositions unless otherwise stated. The music contained herein falls under 
            one of the following two categories:
          </p>
          <ul className="legal-list">
            <li>
              <strong>Public Domain Works:</strong> Many arrangements and compositions in this songbook are historically 
              in the public domain. These works are free of known copyright restrictions and may be used, shared, 
              or adapted freely.
            </li>
            <li>
              <strong>Proprietary & Copyrighted Works:</strong> For all contemporary, original, or copyrighted music 
              hosted on this platform, <strong>the original copyright holder (including Chuck Nelson for original works) 
              retains full ownership, exclusive rights, and licenses to the music.</strong>
            </li>
          </ul>
          <p className="warning-box">
            Your right to view or interact with copyrighted music on this website does not grant you a FOSS, 
            Creative Commons, or public domain license to redistribute, sell, or commercially exploit those musical works. 
            Any unauthorized duplication or distribution of copyrighted material remains strictly prohibited under 
            international copyright law.
          </p>
        </section>

        <hr className="about-divider" />

        <section className="about-section">
          <div className="section-icon">📬</div>
          <h2>Contact & Copyright Inquiries</h2>
          <p>
            If you have questions about the licensing of this project, wish to request permission for specific uses 
            of the musical content, or are a copyright holder with inquiries regarding material hosted here, please contact:
          </p>
          <div className="contact-card">
            <div className="contact-item">
              <span className="contact-label">Name:</span>
              <span className="contact-value">Chuck Nelson</span>
            </div>
            <div className="contact-item">
              <span className="contact-label">Email:</span>
              <a href="mailto:nelsonch650@gmail.com" className="contact-link">nelsonch650@gmail.com</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="about-footer">
        <p>© 2026 MVET Songbook Project • v1.1.53</p>
      </footer>
    </div>
  );
};

export default About;
