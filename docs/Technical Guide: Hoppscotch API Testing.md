# Technical Guide: Hoppscotch API Testing

This guide walks you through setting up and running tests for the **MVET Songbook API** in **Hoppscotch** (or Postman) to verify the PSK authentication, token-based authorization, and catalog obfuscation mechanisms.

---

## 1. Quick Setup: Import the OpenAPI Schema

Because our API is fully OpenAPI-compliant, you can auto-generate the complete request collection:

1. Open **Hoppscotch** (e.g., `http://hoppscotch.local` or the public web client).
2. On the left sidebar, click the **Collections** icon (folder shape).
3. Click the **Import** button at the top of the Collections pane.
4. Select **Import from OpenAPI** (JSON/YAML) and choose **URL**.
5. Paste the local OpenAPI schema address:
   ```text
   http://mvet-api.test/openapi.json
   ```
6. Click **Import**. You now have a ready-made **MVET Songbook API** collection containing all endpoints, path parameters, and query shapes!

---

## 2. Test Step 1: Anonymous Catalog Retrieval (Obfuscation Check)

This verifies that public domain song files remain public, while copyrighted song files are masked from anonymous visitors.

1. In your collection, select the **GET Fetch songs catalog** request (`GET /api/songs`).
2. **URL:** Ensure it is `http://mvet-api.test/api/songs`.
3. **Headers / Auth:** Do **not** send any authorization credentials.
4. Click **Send**.
5. **Validation:**
   * Response status must be `200 OK`.
   * Examine the returned JSON. Locate `Armed_Forces_Medley_72` (copyrighted):
     * The `files` field must show:
       ```json
       "files": {
         "protected": true,
         "mtime": ""
       }
       ```
     * Individual parts (soprano, alto, etc.) must show `"files": { "protected": true }`.
   * Locate `Stars_and_Stripes_Forever` (public domain):
     * The `files` and parts file fields must display their actual local file paths (e.g. `"/songs/Stars_and_Stripes_Forever/Stars_and_Stripes_Forever-SATB.pdf"`).

---

## 3. Test Step 2: Anonymous File Download (Block Check)

This verifies that raw copyrighted media blocks unauthorized access.

1. Select or create a **GET Stream raw score or audio files** request.
2. Set the URL to:
   ```text
   http://mvet-api.test/api/songs/Armed_Forces_Medley_72/files/osmd
   ```
3. **Headers / Auth:** Send **no** credentials.
4. Click **Send**.
5. **Validation:**
   * Response status must be `401 Unauthorized`.
   * Body must contain: `{"error": "Missing or malformed Authorization header."}`.

---

## 4. Test Step 3: PSK Token Exchange (Authentication)

This exchanges a valid pre-shared key for a cryptographically signed token.

1. Select the **POST Exchange Choral Preshared Key (PSK)** request (`POST /api/auth/token`).
2. Set the URL to:
   ```text
   http://mvet-api.test/api/auth/token
   ```
3. Go to the **Body** tab, select **application/json**, and write:
   ```json
   {
     "psk": "mvet-local-key"
   }
   ```
   *(Note: `mvet-local-key` and `choir-secret` are the two active keys deployed in our local `k3s-local` secrets vault).*
4. Click **Send**.
5. **Validation:**
   * Response status must be `200 OK`.
   * Response body will return:
     ```json
     {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC...",
       "expires_at": "2026-08-23T14:09:48.881Z"
     }
     ```
6. **Action:** Copy the entire returned `"token"` string.

---

## 5. Test Step 4: Authenticated Catalog Retrieval (Reveal Check)

This verifies that a valid token grants full access to arrangements and URLs.

1. Go back to the **GET Fetch songs catalog** request (`GET /api/songs`).
2. Navigate to the **Authorization** tab.
3. Set the **Auth Type** to **Bearer Token**.
4. Paste the copied token string into the **Token** field.
5. Click **Send**.
6. **Validation:**
   * Response status must be `200 OK`.
   * Examine the returned JSON. Look at `Armed_Forces_Medley_72` (copyrighted):
     * The `files` field should now list actual disk paths, for example:
       ```json
       "files": {
         "mscz": "/songs/Armed_Forces_Medley_72/Armed_Forces_Medley_72.mscz",
         "mxl": "/songs/Armed_Forces_Medley_72/Armed_Forces_Medley_72.mxl",
         "osmd": "/songs/Armed_Forces_Medley_72/Armed_Forces_Medley_72-SATB.mxl",
         "pdf": "/songs/Armed_Forces_Medley_72/Armed_Forces_Medley_72-SATB.pdf",
         ...
       }
       ```

---

## 6. Test Step 5: Authenticated File Download (Serve Check)

This verifies that the server successfully streams raw music files to valid token holders.

1. Go back to the **GET Stream raw score** request:
   ```text
   http://mvet-api.test/api/songs/Armed_Forces_Medley_72/files/osmd
   ```
2. Navigate to the **Authorization** tab, select **Bearer Token**, and paste your token.
3. Click **Send**.
4. **Validation:**
   * Response status must be `200 OK`.
   * Content-Type header must read `application/vnd.recordare.musicxml` or `application/octet-stream`.
   * Cache-Control header must read `public, max-age=31536000, immutable`.
   * The response body will contain the raw parsed MusicXML document.

---

## 7. Test Step 6: Negative Token Validation (Security Check)

This verifies that invalid or tampered tokens are rejected.

1. Using the same request as **Step 5**, go to the **Authorization** tab.
2. Edit the token value (e.g. change a character or delete a character to corrupt the signature).
3. Click **Send**.
4. **Validation:**
   * Response status must be `401 Unauthorized`.
   * Response body must report: `{"error": "Invalid token."}`.
