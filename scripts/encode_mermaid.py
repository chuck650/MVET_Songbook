import zlib
import base64
import json

def get_mermaid_url(code):
    state = {
        "code": code,
        "mermaid": "{\n  \"theme\": \"dark\"\n}", # Using dark theme to match glassmorphism aesthetics
        "autoSync": True,
        "updateEditor": False,
        "updateDiagram": True
    }
    json_str = json.dumps(state)
    compressed = zlib.compress(json_str.encode('utf-8'), level=9)
    encoded = base64.urlsafe_b64encode(compressed).decode('utf-8').replace('=', '')
    return f"http://mermaid.tools.test/edit#pako:{encoded}"

diagram1 = """flowchart TD
    subgraph "Build Time (Admin Laptop or CI/CD)"
        A[Raw MusicXML & Audio Assets] --> B[AES-256-GCM Encryptor]
        C[Admin Password] -->|PBKDF2 Derivation| D[Symmetric Key]
        D --> B
        B --> E[Encrypted Assets *.enc]
    end

    subgraph "Static Host (GitHub Pages / Netlify)"
        E --> F[Public CDN /dist]
    end

    subgraph "Client Runtime (PWA Offline)"
        F -->|Fetch Encrypted Files| G[Web Crypto API AES Decoder]
        H[Singer inputs Password] -->|Same PBKDF2 Derivation| I[Derived Key]
        I --> G
        G --> J[Decrypted In-Memory Buffer]
        J --> K[Web Audio / OSMD Engraver]
    end"""

diagram2 = """sequenceDiagram
    autonumber
    actor Admin
    actor Singer
    participant PWA as "PWA (Client Browser)"
    participant Server as "Static CDN"

    Note over Admin: Generates ECDSA Public/Private Key Pair
    Note over Admin: Hardcodes Public Key into Vite Bundle

    Admin->>Singer: Issues Token String (Signed with Private Key)
    Note over Singer: Token contains: user, role, expiresAt, and encrypted AES key

    Singer->>PWA: Pastes Token into App Lockscreen
    PWA->>PWA: Verifies Signature using Hardcoded Public Key via Web Crypto API
    
    alt Signature is Valid & Not Expired
        PWA->>PWA: Extracts AES Decryption Key from Token Payload
        PWA->>PWA: Saves Token to local storage (IndexedDB)
        PWA->>Server: Requests Encrypted Assets (.enc)
        Server-->>PWA: Returns Encrypted Bytes
        PWA->>PWA: Decrypts assets in-memory and renders score/audio
    else Invalid or Expired
        PWA-->>Singer: Displays "Access Expired or Altered"
    end"""

print("DIAGRAM 1 URL:")
print(get_mermaid_url(diagram1))
print("\nDIAGRAM 2 URL:")
print(get_mermaid_url(diagram2))
