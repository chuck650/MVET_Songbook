# Copyright, Licensing, and Metadata Research

This document serves as the authoritative legal reference and technical guide for the **MVET Songbook** digital copyright and licensing engine. It outlines the schema architecture, details the exhaustive copyright research for our five initial works, and provides guidelines for future score acquisitions.

---

## 🖥️ 1. Technical Metadata Engine

The MVET Songbook PWA uses an automated sidecar compiler system to generate static metadata and drive live UI visual feedback.

### 1.1 The `CopyrightInfo` Schema
Each song directory (e.g., `public/songs/God_Bless_America/`) includes a `metadata.json` sidecar. The compiler merges these properties directly into the consolidated `public/songs.json` catalog list. The types are defined in `src/types/songbook.ts`:

```typescript
export interface CopyrightInfo {
  // Broad classification of the legal category
  type: 'public_domain' | 'copyrighted' | 'creative_commons' | 'permissive_license';
  
  // Specific license code/name (renders inside the badge on the card)
  license?: string;       // e.g., "CC BY-NC 4.0", "Educational Use Only"
  
  holder?: string;        // The legal copyright owner or administrator
  year?: string | number; // Year of original publication or licensing
  statement?: string;     // Explanatory licensing terms or custom legal notice
  links?: string[];       // Array of reference URLs (e.g., copyright records, deeds)
}
```

### 1.2 UI Theme Architecture
The catalog page maps each classification to premium, curated high-contrast HSL color variables:
- **`public_domain` (Emerald Green)**: Fits open historical works. Displays a static `Public Domain` badge.
- **`copyrighted` (Amber Orange)**: Reserved for commercial copyright. Displays a static `Copyrighted` badge.
- **`creative_commons` (Cyan Blue)**: Renders the precise CC license dynamically (e.g., `CC BY-NC-ND 4.0`).
- **`permissive_license` (Indigo Purple)**: Renders custom rehearsal permissions dynamically (e.g., `Educational Waiver`).

---

## 🎼 2. Expose Research: Initial Song Library

Below is the verified legal and historical audit of the initial works currently residing in the songbook:

| Song ID & Folder | Title & Key | Legal Status | Core Copyright & Expiration Audits |
| :--- | :--- | :--- | :--- |
| `Armed_Forces_Medley_72` | **Armed Forces Medley**<br>(SATB Transposed) | **Public Domain** | Created by Chief Arranger **Thomas Knox** in 1972 while serving on active duty in the **United States Marine Band**. As a work prepared by an officer of the U.S. Government as part of their official duties, it is exempt from copyright under **17 U.S.C. § 105** and resides in the Public Domain. |
| `God_Bless_America` | **God Bless America**<br>(F Major) | **Copyrighted** | Composed by **Irving Berlin** in 1918 and heavily revised/published in 1938. The copyright was registered in 1938, renewed in 1965, and is owned by **Irving Berlin Music Corp.** (administered by Concord Music). Under the Sonny Bono Copyright Term Extension Act, the work is protected for 95 years from publication, expiring on **December 31, 2033**. All royalties are directed to the *God Bless America Fund*, supporting the Boy/Girl Scouts of America. |
| `God_Bless_America-G_Major` | **God Bless America**<br>(G Major Transposed) | **Copyrighted** | Share's the identical copyright, ownership, and **December 31, 2033** expiration constraints of the F-Major master composition. |
| `Star_Spangled_Banner` | **The Star-Spangled Banner**<br>(Ab Major) | **Public Domain** | Music composed by **John Stafford Smith** (1780) and lyrics written by **Francis Scott Key** (1814). Officially designated as the U.S. National Anthem in 1931. As a work published long before January 1, 1929, both the composition and standard traditional SATB voicings are fully in the Public Domain. |
| `Stars_and_Stripes_Forever` | **The Stars and Stripes Forever**<br>(Eb Major) | **Public Domain** | Patriotic march composed by **John Philip Sousa** in 1896. As a traditional public domain work published before 1929, it has no domestic or international copyright restrictions. |

---

## 📄 3. Verification & Historical Records

### 3.1 God Bless America Copyright Lore
The U.S. Copyright Office has published detailed accounts of the licensing lore surrounding Irving Berlin's composition. During the war build-up, Berlin patriotically formed the *God Bless America Fund*, executing a trust agreement assigning all royalties to the Boy Scouts and Girl Scouts. 
- **Lore PDF Record**: [U.S. Copyright Office historical document (August 2014)](https://www.copyright.gov/history/lore/pdfs/201408%20CLore_August2014.pdf)

### 3.2 Thomas Knox Medley Status
Under United States copyright law, works created by federal government employees (such as members of the official premier military bands on active service) are considered **Works of the United States Government**. Under 17 U.S.C. § 105, these works are not eligible for copyright protection inside the United States. Knox's famous 1972 arrangement for the U.S. Marine Band is thus freely reproducible and adaptable for domestic choral performance.

---

## 🛠️ 4. Guidelines for Adding Future Songs

When expanding the songbook, Chuck Nelson or assisting editors should follow this checklist to assign metadata correctly:

### Step 1: Establish Legal Status
- **Is the composition published before January 1, 1929?** Yes $\rightarrow$ Categorize as `public_domain`.
- **Is the score an original arrangement created by a federal military band member on active service?** Yes $\rightarrow$ Categorize as `public_domain`.
- **Is the score copyrighted but shared on MuseScore/IMSLP under a Creative Commons license?** Yes $\rightarrow$ Categorize as `creative_commons` and add the specific license code (e.g. `CC BY-NC 4.0`).
- **Is the arrangement copyrighted, but the author has sent written permission/waiver for veteran rehearsal use?** Yes $\rightarrow$ Categorize as `permissive_license` and write `Educational Waiver` or `Permissive Rehearsal Waiver` under `license`.
- **Is the work under traditional commercial copyright with "All Rights Reserved"?** Yes $\rightarrow$ Categorize as `copyrighted` and obtain formal sync licensing.

### Step 2: Write the `metadata.json` Overlay
Place a `metadata.json` file inside the new song's folder alongside the scores:

```json
{
  "title": "Song Title",
  "composer": "Composer Name",
  "arranger": "Arranger Name",
  "copyrightInfo": {
    "type": "creative_commons",
    "license": "CC BY-NC 4.0",
    "holder": "Original Arranger Name",
    "year": 2026,
    "statement": "This score is licensed under Creative Commons Attribution-NonCommercial 4.0.",
    "links": [
      "https://creativecommons.org/licenses/by-nc/4.0/"
    ]
  }
}
```

### Step 3: Compile
Run the compiler from the project root:
```bash
npm run build
```
The PWA engine will register the new song, establish its caching hashes, and render its badges and detail drawers dynamically!

---

## ⚖️ 5. DMCA Safe Harbor Compliance

To protect the platform administrator from direct and secondary copyright liabilities under federal copyright law, a formal **DMCA Takedown Statement** has been drafted and embedded into the application.

### 5.1 Safe Harbor Protection Requirements
Under the Digital Millennium Copyright Act (17 U.S.C. § 512), the songbook qualifies for **Safe Harbor Protection** if it meets the following criteria:
1. **Designated DMCA Agent**: A specific, contactable individual (Chuck Nelson) is designated to receive infringement notices.
2. **Clear Takedown Pathway**: The site publishes a clear checklist of requirements for submitting copyright notices (now listed in both the built-in `About.tsx` page and the `legal.md` notice).
3. **Expeditious Removal**: The administrator acts promptly to remove or disable access to materials claimed to be infringing upon receiving a valid notice.

### 5.2 Handling Takedown Request Actions
If a takedown notice is received:
1. **Verify**: Ensure the notice includes the 4 core requirements (identification of work, identification of URL/file path, contact info, and perjury statement).
2. **Take Down**: Remove or rename the matching directory inside `public/songs/` to disable public viewing.
3. **Rebuild**: Run `npm run build` to compile a fresh manifest (`songs.json`), automatically removing the work from all client-side PWA databases.
4. **Notify**: Inform the complaining party and, if necessary, the arranger who submitted the score.
