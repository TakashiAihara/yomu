# Research: CLI Google OAuth Authentication

**Feature**: 002-cli-google-oauth
**Date**: 2026-01-04

## Research Topics

### 1. CLI Framework Selection

**Decision**: Commander.js

**Rationale**:
- Lightweight (~50KB) with minimal dependencies
- Well-maintained with active community (29k+ GitHub stars)
- Native TypeScript support
- Simple API for subcommands (`login`, `logout`, `status`, `switch`)
- Built-in help generation
- Pattern used by many popular CLIs (Vite, Create React App)

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| yargs | Heavier, more complex API for simple use case |
| oclif | Over-engineered for 4-command CLI, requires plugins |
| meow | Too minimal, no built-in subcommand support |
| cac | Less mature, smaller ecosystem |

### 2. Cross-Platform Keychain Access

**Decision**: keytar

**Rationale**:
- Cross-platform: macOS Keychain, Windows Credential Manager, Linux Secret Service
- Native bindings via node-gyp (secure, OS-level encryption)
- Used by VS Code, GitHub Desktop, other major Electron apps
- Simple API: `setPassword`, `getPassword`, `deletePassword`
- Service/account model maps well to multi-account requirements

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|-----------------|
| node-keychain | macOS only |
| wincred | Windows only |
| keyring | Python-based, not native Node.js |

**Fallback Strategy**:
When keytar is unavailable (no keychain, CI environment):
- Use `conf` package with AES-256-GCM encryption
- Encryption key derived from machine ID + user-provided password on first use
- Store in `~/.config/yomu/credentials.enc`

### 3. Browser Opening Strategy

**Decision**: `open` package

**Rationale**:
- Cross-platform browser opening (macOS, Windows, Linux)
- Automatically detects default browser
- Supports WSL (Windows Subsystem for Linux)
- Simple API: `await open(url)`
- Maintained by Sindre Sorhus (reliable ecosystem)

**Headless Detection**:
```typescript
function isHeadlessEnvironment(): boolean {
  // No DISPLAY on Linux = headless
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return true;
  }
  // SSH session detection
  if (process.env.SSH_CLIENT || process.env.SSH_TTY) {
    return true;
  }
  // CI environment
  if (process.env.CI) {
    return true;
  }
  return false;
}
```

### 4. Local Callback Server

**Decision**: Node.js built-in `http` module

**Rationale**:
- No external dependencies
- Full control over port selection and request handling
- Lightweight for single-request-then-shutdown pattern
- Standard practice for OAuth CLI flows

**Port Selection Strategy**:
1. Try default port 8085
2. If busy, try ports 8086-8099
3. Use dynamic port assignment if all fail
4. Include actual port in redirect_uri sent to backend

**Implementation Pattern**:
```typescript
async function startCallbackServer(): Promise<{ port: number; codePromise: Promise<string> }> {
  const server = http.createServer();
  const port = await findAvailablePort(8085, 8099);

  const codePromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Authentication timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    server.on('request', (req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      clearTimeout(timeout);

      if (error) {
        res.end(renderErrorPage(error));
        reject(new Error(error));
      } else if (code) {
        res.end(renderSuccessPage());
        resolve(code);
      }

      server.close();
    });
  });

  await new Promise<void>(resolve => server.listen(port, resolve));
  return { port, codePromise };
}
```

### 5. tRPC Client Setup

**Decision**: Direct @trpc/client with superjson

**Rationale**:
- Type-safe client using exported `AppRouter` type from `apps/api`
- Consistent with backend implementation
- superjson for Date/BigInt serialization

**Implementation**:
```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@yomu/api/trpc';
import superjson from 'superjson';

export function createApiClient(apiUrl: string, sessionToken?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${apiUrl}/trpc`,
        headers() {
          return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
        },
        transformer: superjson,
      }),
    ],
  });
}
```

**Type Sharing**:
- Export `AppRouter` type from `apps/api` package
- CLI imports type-only (no runtime dependency on API code)
- Add `@yomu/api` as dev dependency for types

### 6. Credential Storage Schema

**Decision**: JSON-based multi-account storage

**Schema**:
```typescript
interface CredentialStore {
  version: 1;
  activeAccount: string | null;  // email of active account
  accounts: {
    [email: string]: StoredAccount;
  };
}

interface StoredAccount {
  email: string;
  name: string;
  picture?: string;
  sessionToken: string;
  expiresAt: string;  // ISO 8601
  createdAt: string;  // ISO 8601
}
```

**Storage Locations**:
- Keytar: Service=`yomu`, Account=`credentials`
- File fallback: `~/.config/yomu/credentials.enc`

### 7. Logging Strategy

**Decision**: pino with pino-pretty

**Rationale**:
- Fast structured logging
- JSON output for production, pretty for development
- Configurable log levels via CLI flag or env var

**Log Levels**:
| Level | Usage |
|-------|-------|
| error | Auth failures, API errors |
| warn | Rate limiting, token expiring |
| info | Login/logout success, account switch |
| debug | OAuth flow steps, API calls |
| trace | Full request/response (never in prod) |

**Default**: `info` (can override with `--verbose` or `YOMU_LOG_LEVEL`)

### 8. Error Handling Patterns

**Decision**: Typed error classes with user-friendly messages

**Error Types**:
```typescript
class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'DENIED' | 'RATE_LIMITED' | 'NETWORK' | 'INVALID_TOKEN',
    public readonly retryable: boolean,
    public readonly userMessage: string
  ) {
    super(message);
  }
}
```

**User Message Examples**:
| Error Code | User Message |
|------------|--------------|
| TIMEOUT | "Login timed out. Please try again." |
| DENIED | "Access was denied. Please authorize the application." |
| RATE_LIMITED | "Too many attempts. Please wait 60 seconds and try again." |
| NETWORK | "Network error. Check your connection and try again." |
| INVALID_TOKEN | "Session expired. Please log in again." |

## Conclusions

All technical decisions have been made and documented. No NEEDS CLARIFICATION items remain. Ready to proceed to Phase 1: Design & Contracts.
