export const openApiSpec: object = {
  openapi: "3.0.0",
  info: {
    title: "MVET Songbook API",
    description: "Stateless TypeScript Express Gateway for Secure MusicXML and Audio Access Control",
    version: "1.0.0"
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
        summary: "Exchange Choral Preshared Key (PSK) for a signed JWT",
        description: "Validates Choral PSK and returns secure cryptographically signed 90-day JWT. Legacy `/api/auth/token` endpoint is also supported for backward compatibility.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  psk: {
                    type: "string",
                    description: "Active choir preshared key"
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
                    expires_at: { type: "string", format: "date-time" }
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
        description: "Returns metadata of all active arrangements. If authenticated, serves full media URLs. If anonymous, obfuscates protected assets. Legacy `/api/songs` endpoint is also supported.",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: false,
            description: "Bearer <JWT_TOKEN>",
            schema: { type: "string" }
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
    }
  }
};
