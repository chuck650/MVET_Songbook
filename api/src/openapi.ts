export const openApiSpec: object = {
  openapi: "3.0.0",
  info: {
    title: "MVET Songbook API",
    description: "Stateless TypeScript Express Gateway for Secure MusicXML and Audio Access Control",
    version: "1.1.1"
  },
  servers: [
    {
      url: "http://mvet-api.test",
      description: "Local Development DNS (dnsmasq)"
    },
    {
      url: "https://mvet-api.cminfosec.com",
      description: "Production Cluster VPS"
    }
  ],
  paths: {
    "/api/v1/auth/token": {
      post: {
        summary: "Exchange Choral or Admin Preshared Key (PSK) for a signed JWT",
        description: "Validates Choral Member PSK or Admin PSK and returns secure cryptographically signed 90-day JWT with role claims ('member' or 'admin'). Legacy `/api/auth/token` endpoint is also supported for backward compatibility.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  psk: {
                    type: "string",
                    description: "Active choir preshared key or administrative preshared key"
                  }
                },
                required: ["psk"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    expires_at: { type: "string", format: "date-time" },
                    role: { type: "string", enum: ["member", "admin"] }
                  }
                }
              }
            }
          },
          401: { description: "Invalid Key" },
          500: { description: "Server Configuration Error" }
        }
      }
    },
    "/api/v1/songs": {
      get: {
        summary: "Fetch songs catalog",
        description: "Returns metadata of arrangements. By default, archived selections are omitted unless `include_archived=true` is requested. If authenticated, serves full media URLs. If anonymous, obfuscates protected assets.",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Bearer <JWT_TOKEN>",
            schema: { type: "string" }
          },
          {
            name: "include_archived",
            in: "query",
            required: false,
            description: "Pass 'true' to include archived repertoire in the catalog response",
            schema: { type: "boolean" }
          }
        ],
        responses: {
          200: {
            description: "Catalog successfully returned."
          }
        }
      }
    },
    "/api/v1/songs/{song_id}/files/{file_type}": {
      get: {
        summary: "Stream raw score or audio files",
        description: "Serves MusicXML, PDF, FLAC, or video files. Enforces strict JWT verification on copyrighted selections. Legacy `/api/songs/{song_id}/files/{file_type}` endpoint is also supported.",
        parameters: [
          { name: "song_id", in: "path", required: true, schema: { type: "string" } },
          { name: "file_type", in: "path", required: true, schema: { type: "string" } },
          { name: "Authorization", in: "header", required: false, schema: { type: "string" } },
          { 
            name: "disposition", 
            in: "query", 
            required: false, 
            description: "Force file content-disposition behavior ('inline' to display in browser or 'attachment' to trigger download)", 
            schema: { type: "string", enum: ["inline", "attachment"] } 
          }
        ],
        responses: {
          200: { description: "File data stream" },
          401: { description: "Unauthorized" },
          404: { description: "Not Found" }
        }
      }
    },
    "/api/v1/songs/{song_id}/archive": {
      post: {
        summary: "Archive song from public/default repertoire view",
        description: "Sets `archived: true` on the target song in catalog metadata. Requires either Bearer JWT with `role: 'admin'` or administrative `x-admin-key` header.",
        parameters: [
          { name: "song_id", in: "path", required: true, schema: { type: "string" } },
          { name: "Authorization", in: "header", required: false, description: "Bearer <ADMIN_JWT_TOKEN>", schema: { type: "string" } },
          { name: "x-admin-key", in: "header", required: false, description: "Administrative preshared key fallback", schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Song archived successfully." },
          401: { description: "Missing or invalid administrative credentials." },
          403: { description: "Forbidden: Requires administrator privileges." },
          404: { description: "Song not found in catalog." }
        }
      }
    },
    "/api/v1/songs/{song_id}/restore": {
      post: {
        summary: "Restore archived song to public/default repertoire view",
        description: "Removes `archived` flag from the target song in catalog metadata. Requires either Bearer JWT with `role: 'admin'` or administrative `x-admin-key` header.",
        parameters: [
          { name: "song_id", in: "path", required: true, schema: { type: "string" } },
          { name: "Authorization", in: "header", required: false, description: "Bearer <ADMIN_JWT_TOKEN>", schema: { type: "string" } },
          { name: "x-admin-key", in: "header", required: false, description: "Administrative preshared key fallback", schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Song restored successfully." },
          401: { description: "Missing or invalid administrative credentials." },
          403: { description: "Forbidden: Requires administrator privileges." },
          404: { description: "Song not found in catalog." }
        }
      }
    },
    "/api/v1/repertoire-state": {
      get: {
        summary: "Retrieve runtime repertoire state overrides",
        description: "Returns the persistent runtime catalog state overrides (such as archival status changes) that survive git and rsync re-deployments.",
        responses: {
          200: {
            description: "Repertoire state map successfully returned.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      archived: { type: "boolean" },
                      updatedAt: { type: "string", format: "date-time" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
