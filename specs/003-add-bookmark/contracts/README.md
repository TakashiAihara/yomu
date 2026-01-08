# API Contracts: ブックマーク機能

**Feature**: 003-add-bookmark
**Date**: 2026-01-04

## Overview

This directory contains the API contract specifications for the bookmark feature. These contracts define the tRPC API endpoints, input/output schemas, and expected behaviors.

## Schema-First Workflow

According to the project constitution, all API changes MUST follow the schema-first workflow:

1. ✅ **Schema Definition**: Contracts are defined first (this directory)
2. ⏳ **PR & Review**: Contract changes must be submitted and approved via PR
3. ⏳ **Implementation**: Code implementation happens after schema approval
4. ⏳ **Contract Tests**: Tests validate implementation against approved contract

## Files

### `bookmark-router.contract.ts`

Defines the tRPC router contract for bookmark operations:

- **Input Schemas**: Zod schemas for request validation
- **Output Schemas**: Zod schemas for response structure
- **Type Exports**: TypeScript types inferred from schemas
- **Error Codes**: Expected error codes for each operation
- **Documentation**: JSDoc comments for each endpoint

### Contract Test Template

Contract tests will be implemented at `tests/contract/bookmarks.test.ts` and should validate:

```typescript
describe('Bookmark Router Contract', () => {
  describe('bookmarks.create', () => {
    it('creates bookmark with valid input', async () => {
      // Validate input schema
      // Call endpoint
      // Validate output schema
      // Verify database state
    });

    it('returns CONFLICT for duplicate URL', async () => {
      // Create bookmark
      // Attempt to create same URL again
      // Expect CONFLICT error
    });

    it('returns BAD_REQUEST for invalid URL', async () => {
      // Attempt to create with file:// URL
      // Expect BAD_REQUEST error
    });

    it('returns UNAUTHORIZED without authentication', async () => {
      // Call without auth header
      // Expect UNAUTHORIZED error
    });
  });

  describe('bookmarks.list', () => {
    it('returns paginated bookmarks', async () => {
      // Create test bookmarks
      // Call endpoint with pagination
      // Validate output schema
      // Verify pagination metadata
    });

    it('returns newest bookmarks first', async () => {
      // Create bookmarks with different timestamps
      // Call endpoint
      // Verify descending order by createdAt
    });
  });

  describe('bookmarks.delete', () => {
    it('deletes owned bookmark', async () => {
      // Create bookmark
      // Delete it
      // Verify success response
      // Verify bookmark removed from DB
    });

    it('returns NOT_FOUND for non-existent bookmark', async () => {
      // Call with random UUID
      // Expect NOT_FOUND error
    });

    it('returns NOT_FOUND for other user\'s bookmark', async () => {
      // Create bookmark as user A
      // Attempt to delete as user B
      // Expect NOT_FOUND error (not FORBIDDEN, to avoid leaking existence)
    });
  });
});
```

## Validation Rules

### URL Validation

- Must be valid URL format (RFC 3986)
- Protocol must be `http://` or `https://` only
- Rejects `file://`, `javascript://`, `data:`, etc. for security

### Title Validation

- Optional field
- Maximum 500 characters
- Can be null

### Pagination Validation

- `limit`: Integer, 1-100 (default: 20)
- `offset`: Integer, ≥ 0 (default: 0)

## Error Handling

### Expected Error Codes

| Operation | Error Code | Condition |
|-----------|-----------|-----------|
| create | CONFLICT | Duplicate URL for user |
| create | BAD_REQUEST | Invalid URL format |
| create | UNAUTHORIZED | Not authenticated |
| list | BAD_REQUEST | Invalid pagination params |
| list | UNAUTHORIZED | Not authenticated |
| delete | NOT_FOUND | Bookmark not found or not owned |
| delete | BAD_REQUEST | Invalid UUID format |
| delete | UNAUTHORIZED | Not authenticated |

## Implementation Checklist

- [ ] Implement `apps/api/src/bookmarks/presentation/bookmark-router.ts`
- [ ] Implement use-cases (create, list, delete)
- [ ] Implement repository (Drizzle ORM)
- [ ] Mount router in `apps/api/src/trpc.ts`
- [ ] Implement contract tests in `tests/contract/bookmarks.test.ts`
- [ ] Verify all tests pass
- [ ] Update API documentation (Docusaurus)

## Breaking Changes

None - this is a new feature with no existing API surface.

## Migration Notes

No migration required for API consumers, as this is a new router being added to the existing tRPC API.

CLI implementation should use the types exported from this contract file to ensure type safety across the API boundary.
