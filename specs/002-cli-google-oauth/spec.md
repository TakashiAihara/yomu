# Feature Specification: CLI Application with Google OAuth Authentication

**Feature Branch**: `002-cli-google-oauth`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "CLI application with Google OAuth authentication support. The CLI should support: 1) Localhost redirect method (like `gh auth login` - start local HTTP server, browser redirects to localhost callback), 2) Manual copy-paste method (display auth URL, user copies authorization code back to terminal), and eventually 3) Device Authorization Flow (RFC 8628) for headless/remote environments. CLI must use tRPC for backend communication per Constitution. Should be created in apps/cli/ directory."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Browser Login (Priority: P1)

A developer wants to authenticate with Yomu using their existing Google account. They run a login command and their default browser automatically opens to Google's login page. After granting permission, they are redirected back to the CLI which receives the authorization code automatically and completes the authentication.

**Why this priority**: This is the most seamless and user-friendly authentication experience for desktop users. It follows the familiar pattern established by tools like GitHub CLI (`gh auth login`), providing a low-friction login experience that most developers expect.

**Independent Test**: Can be fully tested by running the login command on a machine with a desktop browser and verifying the user is authenticated and can access protected resources.

**Acceptance Scenarios**:

1. **Given** a user is not authenticated, **When** they run the login command, **Then** their default browser opens to Google OAuth consent screen
2. **Given** a user grants permission in the browser, **When** Google redirects to the local callback, **Then** the CLI receives the authorization code and completes authentication
3. **Given** authentication is successful, **When** the CLI confirms login, **Then** user credentials are securely stored locally
4. **Given** a user is already authenticated, **When** they run the login command, **Then** they are informed of their current authentication status and asked if they want to re-authenticate

---

### User Story 2 - Manual Code Entry (Priority: P1)

A developer on a remote server (via SSH) or a machine without direct browser access needs to authenticate. They run the login command with an option for manual authentication. The CLI displays an authorization URL which they can open in any browser. After granting permission, they copy the authorization code from the browser and paste it into the CLI prompt.

**Why this priority**: This method is essential for headless environments and provides a fallback when browser integration is not possible. It ensures the CLI is usable in all environments.

**Independent Test**: Can be fully tested by running the login command in manual mode, opening the provided URL in a separate browser, completing OAuth flow, and copying the code back to the CLI.

**Acceptance Scenarios**:

1. **Given** a user runs login with manual mode option, **When** the CLI starts, **Then** it displays a clear authorization URL and prompts for the code
2. **Given** a user opens the URL in any browser, **When** they complete Google OAuth consent, **Then** they see an authorization code to copy
3. **Given** a user has copied the code, **When** they paste it into the CLI prompt, **Then** the CLI validates and exchanges it for tokens
4. **Given** a user enters an invalid or expired code, **When** the CLI attempts to validate, **Then** a clear error message is displayed with instructions to retry

---

### User Story 3 - Authentication Status Check (Priority: P2)

A user wants to verify their current authentication status, see which Google account they're logged in with, and check when their session expires.

**Why this priority**: Users need visibility into their authentication state to troubleshoot issues and confirm their identity, especially in multi-account scenarios.

**Independent Test**: Can be tested by running the status command both when authenticated and when not authenticated, verifying correct information is displayed.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they check status, **Then** they see their Google account email and session validity
2. **Given** a user is not authenticated, **When** they check status, **Then** they are informed they need to login and shown how
3. **Given** a user's session is about to expire, **When** they check status, **Then** they are notified of upcoming expiration

---

### User Story 4 - Logout (Priority: P2)

A user wants to sign out and remove their local credentials, either to switch accounts or for security purposes when leaving a shared machine.

**Why this priority**: Essential for account management and security best practices.

**Independent Test**: Can be tested by logging in, then logging out, and verifying credentials are removed and protected resources are no longer accessible.

**Acceptance Scenarios**:

1. **Given** a user is authenticated, **When** they run the logout command, **Then** local credentials are removed
2. **Given** logout is complete, **When** a user attempts to access protected resources, **Then** they are prompted to authenticate
3. **Given** a user is not authenticated, **When** they run logout, **Then** they are informed there is nothing to log out from

---

### User Story 5 - Device Authorization Flow for Headless Environments (Priority: P3)

A user on a headless server or in an environment where they cannot paste codes wants to authenticate. They run the login command with device flow option. The CLI displays a short URL and a user code. They navigate to the URL on any device, enter the code, and complete authentication. The CLI automatically detects when authorization is complete.

**Why this priority**: While manual copy-paste works for most headless scenarios, device flow provides a better experience for truly headless environments where clipboard access is also limited. This is a future enhancement.

**Independent Test**: Can be tested by running login in device mode, opening the verification URL on a separate device (e.g., phone), entering the code, and verifying the CLI detects completion.

**Acceptance Scenarios**:

1. **Given** a user runs login with device flow option, **When** the CLI starts, **Then** it displays a verification URL and a short user code
2. **Given** a user opens the URL on any device, **When** they enter the code and authorize, **Then** the CLI polls for completion and receives tokens
3. **Given** the user doesn't complete authorization within the timeout period, **When** the CLI polls, **Then** it shows a timeout message and instructions to retry
4. **Given** the user denies authorization, **When** the CLI polls, **Then** it shows a clear denial message

---

### Edge Cases

- What happens when the local server port (for callback) is already in use?
  - CLI should try alternative ports and display the actual port being used
- How does the system handle network interruption during authentication?
  - CLI should show a clear timeout message and allow retry
- What happens if the user closes the browser without completing OAuth?
  - CLI should timeout after a reasonable period and inform the user
- How does the system handle expired refresh tokens?
  - CLI should detect expired tokens on next operation and prompt for re-authentication
- What happens when credentials file is corrupted or manually edited?
  - CLI should detect invalid credentials and prompt for fresh login
- What happens in a containerized environment with no browser?
  - CLI should detect this and suggest manual or device flow options

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: CLI MUST provide a login command that initiates Google OAuth authentication
- **FR-002**: CLI MUST support localhost redirect authentication method (browser-based flow)
- **FR-003**: CLI MUST support manual code entry authentication method (copy-paste flow)
- **FR-004**: CLI MUST securely store authentication credentials locally after successful login
- **FR-005**: CLI MUST provide a logout command that removes local credentials
- **FR-006**: CLI MUST provide a status command that displays current authentication state
- **FR-007**: CLI MUST communicate with the backend service for token exchange and validation
- **FR-008**: CLI MUST handle authentication errors gracefully with clear user messages
- **FR-009**: CLI MUST automatically refresh access tokens when they are about to expire
- **FR-010**: CLI MUST detect headless/browser-less environments and suggest appropriate auth methods
- **FR-011**: CLI MUST validate tokens before making authenticated requests
- **FR-012**: CLI MUST support Device Authorization Flow (RFC 8628) for headless authentication (future enhancement)

### Key Entities

- **User Session**: Represents an authenticated user's local session, containing identity information and token validity period
- **Credentials Store**: Local secure storage for authentication tokens, associated with a user identity
- **Authentication Method**: The chosen approach for completing OAuth (localhost redirect, manual code, or device flow)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete browser-based login in under 30 seconds (from command to authenticated)
- **SC-002**: Users can complete manual code entry login in under 60 seconds
- **SC-003**: 95% of login attempts complete successfully on first try (no retries needed)
- **SC-004**: CLI correctly detects and handles token expiration without user intervention
- **SC-005**: Users can check their authentication status in under 1 second
- **SC-006**: Logout completely removes credentials with no residual data left behind
- **SC-007**: Error messages are clear enough that users can resolve issues without documentation

## Assumptions

- Users have a valid Google account configured for the Yomu service
- The backend API server with Google OAuth support is already deployed and accessible
- Standard operating systems (Linux, macOS, Windows) with common shells are targeted
- Users have network access to Google's OAuth endpoints and the Yomu backend service
- Credential storage follows operating system conventions for secure local storage
