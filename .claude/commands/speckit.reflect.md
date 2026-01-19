---
description: Post-implementation reflection - analyze what happened during implementation and create follow-up issues
tools: ['github/github-mcp-server/issue_write']
---

# Post-Implementation Reflection

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Purpose

After completing implementation with `/speckit.implement`, this command:

1. Analyzes what actually happened during implementation
2. Compares implementation with original plan
3. Extracts insights, decisions, and concerns
4. Generates structured reflection document
5. Optionally creates GitHub issues for follow-up work

## Outline

### 1. Prerequisites Check

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks \
--include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS
list. All paths must be absolute.

### 2. Gather Implementation Context

**Required Files**:

- `tasks.md` - Original task plan
- `plan.md` - Original technical plan

**Implementation Artifacts** (if exist):

- `artifacts/decisions.md` - Autonomous decisions made during implementation
- `artifacts/concerns.md` - Issues discovered and mitigated during
    implementation

**Optional Spec Files** (if exist):

- `data-model.md` - Data model spec
- `contracts/` - API contracts
- `research.md` - Technical research

**Git Information**:

- Get list of files changed during implementation:

```bash
git diff --name-only <base-branch>
```

- Get commit messages related to this feature:

```bash
git log --oneline --grep="<feature-name>" --since="<implementation-start-date>"
```

### 3. Code Analysis

Analyze the actual implementation to discover:

**3.1. Changed Files**:

- List all modified/created files
- Compare with planned file structure in plan.md
- Identify unexpected files or missing planned files

**3.2. Dependencies**:

- Extract new dependencies from package.json, requirements.txt, go.mod,
    Cargo.toml, etc.
- Compare with dependencies mentioned in plan.md
- Flag unexpected or missing dependencies

**3.3. Code Patterns**:

- Scan for TODO/FIXME/HACK comments
- Identify error handling patterns
- Look for performance-related code (caching, optimization)
- Find security-related code (auth, validation, sanitization)

**3.4. Test Coverage**:

- Check if tests exist for new code
- Identify untested areas
- Note test types (unit, integration, e2e)

### 4. Generate Reflection Document

Create `FEATURE_DIR/artifacts/reflection.md` with comprehensive analysis:

```markdown
# Implementation Reflection

**Feature**: [feature name]
**Implementation Date**: [date range]
**Implemented By**: [from git commits]
**Status**: ✅ Complete | ⚠️ Complete with Concerns | ❌ Incomplete

---

## Executive Summary

[2-3 paragraph summary of what was implemented, major decisions, and key outcomes]

---

## Plan vs Reality

### What Went As Planned ✅
- [List items that matched the original plan]

### What Changed 🔄
| Aspect | Planned | Actual | Reason |
|--------|---------|--------|--------|
| Architecture | REST API | GraphQL | Client flexibility requirements |
| Database | PostgreSQL | MongoDB | Document-oriented data model fit better |
| ... | ... | ... | ... |

### What Was Added ➕
- [Unexpected features, files, or dependencies added]

### What Was Skipped ➖
- [Planned items not implemented]
- [Reason for skipping]

---

## Technical Decisions

### [Decision 1: Title]
**Context**: [What situation required this decision]

**Options Considered**:
1. **Option A**: [Description]
   - ✅ Pros: [list]
   - ❌ Cons: [list]
2. **Option B**: [Description]
   - ✅ Pros: [list]
   - ❌ Cons: [list]

**Decision**: [Chosen option]

**Rationale**: [Why this was chosen]

**Impact**: 
- Files affected: [list]
- Future implications: [description]
- Reversibility: High | Medium | Low

**Source**: Implementation Log | Code Analysis | Commit Messages

---

## Concerns & Risks

### 🔴 Critical
[None identified] OR [List with details]

### 🟠 High
[None identified] OR [List with details]

### 🟡 Medium
[None identified] OR [List with details]

### 🟢 Low
[None identified] OR [List with details]

**Each concern should include**:

- **Type**: Performance | Security | Maintainability | Scalability | UX |
  Technical Debt
- **Description**: [Detailed description]
- **Current State**: [What exists now]
- **Recommended Action**: [What should be done]
- **Urgency**: Immediate | Short-term | Long-term

---

## Code Quality Insights

### TODOs & FIXMEs
| File | Line | Type | Description | Priority |
|------|------|------|-------------|----------|
| ... | ... | TODO | ... | High/Medium/Low |

### Test Coverage
- **Total Files**: [n]
- **Files with Tests**: [n] ([percentage]%)
- **Untested Areas**: [list critical untested code]

### Code Smells
- [List any concerning patterns found]
- [Duplicated code]
- [Complex functions that need refactoring]

---

## Dependencies Analysis

### New Dependencies Added
| Package | Version | Purpose | Planned? |
|---------|---------|---------|----------|
| ... | ... | ... | ✅ Yes / ❌ No |

### Security Considerations
- [Any dependencies with known vulnerabilities]
- [Licenses that need review]

---

## Knowledge Captured

### Key Learnings
1. [Important discovery or learning from implementation]
2. [Another learning]

### Gotchas & Pitfalls
1. [Things that were tricky or non-obvious]
2. [Edge cases discovered]

### Best Practices Applied
1. [Good patterns or practices used]
2. [Another practice]

---

## Follow-Up Work

### Immediate (Do Now)
- [ ] [Critical issues that block or risk production]

### Short-Term (Next Sprint)
- [ ] [Important improvements or fixes]

### Long-Term (Backlog)
- [ ] [Nice-to-have improvements]
- [ ] [Technical debt to address]

### Documentation Needed
- [ ] [API documentation]
- [ ] [Architecture diagrams]
- [ ] [User guides]

---

## Metrics

- **Tasks Planned**: [n]
- **Tasks Completed**: [n]
- **Tasks Skipped**: [n]
- **Files Changed**: [n]
- **Lines Added**: [n]
- **Lines Removed**: [n]
- **Commits**: [n]
- **Implementation Duration**: [n days]

---

## Recommendations

### For Next Implementation
1. [What to do differently next time]
2. [Process improvements]

### For This Feature
1. [Immediate next steps]
2. [Future enhancements]

---

## Appendix

### Files Changed

```text
[Full list of changed files from git]
```

### Commit History

```text
[Relevant commit messages]
```

### Implementation Decisions

[If artifacts/decisions.md exists, include summary or full content here]

### Concerns & Mitigations

[If artifacts/concerns.md exists, include summary or full content here]

```markdown

### 5. Interactive Review

Present the reflection document to the user and ask:

```text
📊 Implementation Reflection Generated

I've analyzed the implementation and created a detailed reflection document at:
FEATURE_DIR/artifacts/reflection.md

Summary:
- ✅ [n] tasks completed as planned
- 🔄 [n] deviations from original plan
- ⚠️ [n] concerns identified (Critical: [n], High: [n], Medium: [n], Low: [n])
- 📝 [n] follow-up items identified

Would you like me to:
1. Create GitHub issues for follow-up work? (yes/no)
2. Update plan.md or research.md with new insights? (yes/no)
3. Generate a summary for team communication? (yes/no)
```

Wait for user response before proceeding.

### 6. Create GitHub Issues (If Requested)

**6.1. Check Git Remote**:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED IF THE REMOTE IS A GITHUB URL

**6.2. Issue Creation Strategy**:

For each follow-up item in the reflection:

**Immediate Priority Issues** (Critical/High concerns):

- **Title**: `[URGENT] <concern description>`
- **Labels**: `bug`, `urgent`, `tech-debt` (as appropriate)
- **Body**:

  ```markdown
  ## Context

  [From reflection document]

  ## Problem

  [Detailed description]

  ## Impact

  [Why this is urgent]

  ## Recommended Action

  [What should be done]

  ## Related

  - Feature: [feature name]
  - Files: [affected files]
  - Reflection: [link to reflection.md]
  ```

**Short-Term Issues** (Medium concerns, TODOs):

- **Title**: `<improvement description>`
- **Labels**: `enhancement`, `tech-debt`
- **Body**: Similar structure, less urgent tone

**Long-Term Issues** (Low priority, future enhancements):

- **Title**: `[FUTURE] <enhancement description>`
- **Labels**: `enhancement`, `backlog`
- **Body**: Similar structure, future-focused

**Documentation Issues**:

- **Title**: `📚 Document: <what needs documentation>`
- **Labels**: `documentation`
- **Body**: What needs to be documented and why

**6.3. Issue Linking**:

- Link all created issues back to the original feature issue (if exists)
- Cross-reference related issues
- Tag with feature milestone (if exists)

### 7. Update Documentation (If Requested)

**7.1. Update plan.md**:

- Add "Implementation Notes" section
- Document significant deviations
- Update architecture if changed

**7.2. Update research.md**:

- Add learnings and discoveries
- Document technical decisions
- Add references to new patterns or approaches

**7.3. Create/Update CHANGELOG.md**:

- Add entry for this feature
- Note breaking changes
- Document new capabilities

### 8. Generate Team Summary (If Requested)

Create `FEATURE_DIR/artifacts/implementation-summary.md` for team communication:

```markdown
# [Feature Name] - Implementation Summary

**Status**: ✅ Complete
**Duration**: [n days]
**Completed**: [date]

## What Was Built

[2-3 sentences describing the feature]

## Key Achievements
- ✅ [Achievement 1]
- ✅ [Achievement 2]

## Notable Decisions
- [Decision 1 with brief rationale]
- [Decision 2 with brief rationale]

## Known Limitations
- [Limitation 1]
- [Limitation 2]

## Next Steps
- [ ] [Follow-up item 1]
- [ ] [Follow-up item 2]

## Testing
- [Test coverage summary]
- [How to test the feature]

## Documentation
- [Links to relevant docs]

---

For full details, see: [link to reflection.md]
```

### 9. Final Report

Provide a summary of all actions taken:

```text
✅ Reflection Complete

Generated:
- 📄 reflection.md - Detailed implementation analysis
- 🐛 [n] GitHub issues created ([n] urgent, [n] short-term, [n] long-term)
- 📝 Updated plan.md and research.md
- 📊 implementation-summary.md for team sharing

Next recommended actions:
1. Review and triage created issues
2. Share implementation-summary.md with team
3. Schedule follow-up for urgent issues
4. Update project documentation

Reflection artifacts saved to: FEATURE_DIR/artifacts/
```

---

## Notes

- This command is designed to run AFTER `/speckit.implement` completes
- It's non-intrusive to the implementation process
- All analysis is based on actual code and git history
- Manual implementation-log.md entries enhance but are not required
- GitHub issue creation is optional and requires user confirmation
- The reflection document serves as permanent record of implementation
  decisions
