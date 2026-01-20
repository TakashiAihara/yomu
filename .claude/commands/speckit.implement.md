---
description: Execute the implementation plan by processing and executing all
tasks defined in tasks.md
---

# Implementation Execution

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks
   --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS
   list. All paths must be absolute. For single quotes in args like "I'm
   Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible:
   "I'm Groot").

2. **Check checklists status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in the checklists/ directory
   - For each checklist, count:
     - Total items: All lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   - Create a status table:

     ```text
     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | test.md   | 8     | 5         | 3          | ✗ FAIL |
     | security.md | 6   | 6         | 0          | ✓ PASS |
     ```

   - Calculate overall status:
     - **PASS**: All checklists have 0 incomplete items
     - **FAIL**: One or more checklists have incomplete items

   - **If any checklist is incomplete**:
     - Display the table with incomplete item counts
     - **STOP** and ask: "Some checklists are incomplete. Do you want to
       proceed with implementation anyway? (yes/no)"
     - Wait for user response before continuing
     - If user says "no" or "wait" or "stop", halt execution
     - If user says "yes" or "proceed" or "continue", proceed to step 3

   - **If all checklists are complete**:
     - Display the table showing all checklists passed
     - Automatically proceed to step 3

3. Load and analyze the implementation context:
   - **REQUIRED**: Read tasks.md for the complete task list and execution plan
   - **REQUIRED**: Read plan.md for tech stack, architecture, and file structure
   - **IF EXISTS**: Read data-model.md for entities and relationships
   - **IF EXISTS**: Read contracts/ for API specifications and test requirements
   - **IF EXISTS**: Read research.md for technical decisions and constraints
   - **IF EXISTS**: Read quickstart.md for integration scenarios

4. **Project Setup Verification**:
   - **REQUIRED**: Create/verify ignore files based on actual project setup:

   **Detection & Creation Logic**:
   - Check if the following command succeeds to determine if the repository
     is a git repo (create/verify .gitignore if so):

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - Check if Dockerfile* exists or Docker in plan.md → create/verify .dockerignore
   - Check if .eslintrc* exists → create/verify .eslintignore
   - Check if eslint.config.* exists → ensure the config's `ignores` entries
     cover required patterns
   - Check if .prettierrc* exists → create/verify .prettierignore
   - Check if .npmrc or package.json exists → create/verify .npmignore (if
     publishing)
   - Check if terraform files (*.tf) exist → create/verify .terraformignore
   - Check if .helmignore needed (helm charts present) → create/verify .helmignore

   **If ignore file already exists**: Verify it contains essential patterns,
   append missing critical patterns only

   **If ignore file missing**: Create with full pattern set for detected
   technology

   **Common Patterns by Technology** (from plan.md tech stack):
   - **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`,
     `*.log`, `.env*`
   - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`,
     `*.egg-info/`
   - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
   - **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
   - **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
   - **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
   - **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
   - **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`,
     `*.prof*`, `.idea/`, `*.log`, `.env*`
   - **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`,
     `*.iml`, `*.log`, `.env*`
   - **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`,
     `*.dll`, `.idea/`, `*.log`, `.env*`
   - **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`,
     `Makefile`, `config.log`, `.idea/`, `*.log`, `.env*`
   - **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
   - **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`,
     `packrat/`, `renv/`
   - **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`,
     `.idea/`

   **Tool-Specific Patterns**:
   - **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`,
     `*.log*`, `.env*`, `coverage/`
   - **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
   - **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`,
     `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`,
     `*.key`, `*.crt`

5. Parse tasks.md structure and extract:
   - **Task phases**: Setup, Tests, Core, Integration, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers [P]
   - **Execution flow**: Order and dependency requirements

6. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the
     next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks
     [P] can run together  
   - **Follow TDD approach**: Execute test tasks before their corresponding
     implementation tasks
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion before proceeding

7. **Autonomous Decision Tracking** (Detailed, Non-Blocking):

   **Philosophy**: Make smart decisions autonomously, but record EVERYTHING for
   later review.

   **7.1. Decision-Making Approach**:
   - **NEVER stop to ask questions** - use best practices and make informed
     decisions
   - **ALWAYS record the decision** - document what was chosen and why
   - **ALWAYS record alternatives** - show what other options were considered
   - **ALWAYS explain tradeoffs** - make the reasoning transparent

   **7.2. When to Record**:
   Record decisions in these situations:
   - Choosing between multiple valid implementation approaches
   - Adding dependencies not explicitly in plan.md
   - Modifying architecture or data structures
   - Handling edge cases or error scenarios
   - Making performance or security tradeoffs
   - Deviating from original plan due to technical constraints
   - Discovering and addressing potential issues

   **7.3. Decision Log Format**:

   Create/append to `FEATURE_DIR/artifacts/decisions.md`:

   ```markdown
   # Implementation Decisions
   
   > Auto-generated during implementation
   > Each decision made autonomously using best practices
   > Review with `/speckit.reflect` after implementation
   
   ---
   
   ## [YYYY-MM-DD HH:MM] Decision: <Short Title>
   
   **Task**: [Related task ID]
   **Category**: Architecture | Dependencies | Security | Performance | Error
   Handling | Data Model | API Design | Testing | DevOps
   
   ### Context
   [What situation required a decision - be specific about the code/feature
   being implemented]
   
   ### Decision Made
   
   **Chosen: Option [X] - [Name]**
   
   [1-2 sentence explanation of why this was the best choice for this
   situation]
   
   ### Options Evaluated
   
   | Option | Description | Key Trade-off |
   |--------|-------------|---------------|
   | **A** ⭐ | [Chosen option - concise description] | [Main pro/con
   consideration] |
   | **B** | [Alternative option - concise description] | [Why not chosen -
   key reason] |
   | **C** | [Another alternative - if applicable] | [Why not chosen - key
   reason] |
   
   ### Implementation Details
   
   **Files affected**:
   - `path/to/file1.ts` - [what changed]
   - `path/to/file2.ts` - [what changed]
   
   **Dependencies added** (if any):
   - `package-name@version` - [purpose]
   
   **Configuration changes** (if any):
   - [describe config updates]
   
   ### Verification
   
   **How to test this works**:
   - [Step 1 to verify]
   - [Step 2 to verify]
   
   **Expected behavior**:
   - [What should happen]
   
   ### Future Considerations
   
   **Reversibility**: 🟢 Easy | 🟡 Moderate | 🔴 Difficult
   
   **If we need to change later**:
   - [What would be involved in switching to Option B or C]
   
   **Watch out for**:
   - [Potential issues, limitations, or edge cases to monitor]
   
   ### References
   - [Documentation links]
   - [Stack Overflow, RFCs, blog posts that informed this decision]
   - Related: [#Decision-ID if this builds on or relates to another decision]
   
   ---
   ```

   **7.4. Concern/Risk Log Format**:

   When discovering potential issues, append to
   `FEATURE_DIR/artifacts/concerns.md`:

   ```markdown
   # Implementation Concerns & Risks
   
   > Issues discovered and addressed during implementation
   > All concerns have been mitigated or documented
   > Review with `/speckit.reflect` for follow-up planning
   
   ---
   
   ## [YYYY-MM-DD HH:MM] Concern: <Short Title>
   
   **Task**: [Related task ID]
   **Type**: Performance | Security | Maintainability | Scalability | UX |
   Technical Debt
   **Severity**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
   
   ### What Was Discovered
   [Detailed description of the concern or risk]
   
   ### Why This Matters
   [Impact on users, system, or future development]
   
   ### Current Mitigation
   **Status**: ✅ Mitigated | ⚠️ Partially Mitigated | ❌ Accepted Risk | 📋
   Needs Follow-up
   
   **What was done**:
   - [Action taken 1]
   - [Action taken 2]
   
   **Code changes**:
   - [Files modified to address this]
   - [Specific implementation]
   
   ### Remaining Risk
   [What risk remains, if any]
   
   ### Recommended Follow-up
   - [ ] [Action item 1]
   - [ ] [Action item 2]
   
   **Priority**: Immediate | Short-term | Long-term
   
   ### References
   - [Security advisories, performance benchmarks, etc.]
   
   ---
   ```

   **7.5. Recording Guidelines**:

   - **Be specific**: Include actual file names, function names, line numbers
     where relevant
   - **Be honest**: Document limitations and tradeoffs, not just successes
   - **Be forward-looking**: Note what future developers should know
   - **Be referenced**: Link to external docs, RFCs, Stack Overflow answers
   - **Be connected**: Reference related decisions and tasks

   **7.6. Example Scenarios**:

   **Scenario 1**: Need to choose database ORM
   - ✅ **DO**: Evaluate options, choose best fit, record with table format
   - ❌ **DON'T**: Ask user "which ORM should I use?"

   **Example Decision Entry**:

   ```markdown
   ## 2026-01-19 10:30 Decision: Database ORM Selection
   
   **Task**: TASK-003
   **Category**: Dependencies
   
   ### Context
   Implementing user data persistence for CRUD operations in
   `src/models/user.ts`. plan.md specifies PostgreSQL but doesn't specify ORM
   framework.
   
   ### Decision Made
   
   **Chosen: Option A - Prisma**
   
   Type-safe query builder with excellent TypeScript support and built-in
   migrations, aligning with project's emphasis on type safety in plan.md.
   
   ### Options Evaluated
   
   | Option | Description | Key Trade-off |
   |--------|-------------|---------------|
   | **A** ⭐ | Prisma - Type-safe query builder | Larger bundle, superior
   DX |
   | **B** | TypeORM - Decorator-based ORM | Less type-safe, more
   boilerplate |
   | **C** | Drizzle - Lightweight ORM | Newer ecosystem, less mature |
   
   ### Implementation Details
   
   **Files affected**:
   - `prisma/schema.prisma` - Created User model with fields from data-model.md
   - `src/lib/prisma.ts` - Singleton client instance
   - `package.json` - Added dependencies and migration scripts
   
   **Dependencies added**:
   - `@prisma/client@5.8.0` - Runtime client
   - `prisma@5.8.0` - CLI tool (dev dependency)
   
   ### Verification
   
   **How to test this works**:
   - Run `npm run prisma:migrate dev` to apply migrations
   - Check that `node_modules/.prisma/client` generates TypeScript types
   - Import PrismaClient in user service and verify autocomplete works
   
   **Expected behavior**:
   - Full type safety for all database queries
   - Automatic type generation on schema changes
   
   ### Future Considerations
   
   **Reversibility**: 🟡 Moderate
   
   **If we need to change later**:
   - Would require rewriting all database queries
   - Migration scripts would need conversion
   - Estimated effort: 2-3 days for current codebase
   
   **Watch out for**:
   - Bundle size impact on serverless deployments
   - Connection pooling in production (use PgBouncer)
   - N+1 query issues - use `include` carefully
   
   ### References
   - https://www.prisma.io/docs/concepts/components/prisma-schema
   - https://github.com/prisma/prisma/discussions/10037 (TypeORM
     comparison)
   ```

   **Scenario 2**: Discover potential SQL injection risk
   - ✅ **DO**: Implement parameterized queries, record the concern and
     mitigation
   - ❌ **DON'T**: Ask user "is SQL injection a concern here?"

   **Scenario 3**: Plan says "API" but doesn't specify REST vs GraphQL
   - ✅ **DO**: Choose REST (simpler for CRUD), record decision with rationale
   - ❌ **DON'T**: Stop and ask "should this be REST or GraphQL?"

   **Scenario 4**: Test fails due to timing issue
   - ✅ **DO**: Add proper async handling, record the issue and fix
   - ❌ **DON'T**: Ask user "how should I fix this test?"

8. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Tests before code**: If you need to write tests for contracts,
     entities, and integration scenarios
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external
     services
   - **Polish and validation**: Unit tests, performance optimization, documentation

9. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - **IMPORTANT** For completed tasks, make sure to mark the task off as [X]
     in the tasks file
   - **Decision Tracking**: Log all significant decisions to artifacts/decisions.md
   - **Concern Tracking**: Log all discovered issues to artifacts/concerns.md
   - Continue implementation without stopping for questions - make informed
     decisions autonomously

10. Completion validation:

- Verify all required tasks are completed
- Check that implemented features match the original specification
- Validate that tests pass and coverage meets requirements
- Confirm the implementation follows the technical plan
- **Generate implementation_summary.md**: Document completed work, technical decisions made, files changed, pending actions, and verification checklist
- Report final status with summary of completed work
- **Next Step**: Suggest running `/speckit.reflect` to analyze implementation
  and create follow-up issues

1. **Create Pull Request** (if on feature branch):
    - Commit all changes:

      ```bash
      git add .
      git commit -m "feat: <brief description from implementation_summary.md>"
      git push origin <current-branch>
      ```

    - Create PR to parent branch (usually `main`):

      ```bash
      gh pr create --title "<PR title from issue/feature>" \
                   --body "Closes #<issue-number>\n\nSee implementation_summary.md for details" \
                   --base main
      ```

    - Link PR to original GitHub issue if applicable

**Output Files**:

- Updated source code files per tasks.md
- implementation_summary.md - Comprehensive summary of implementation work

Note: This command assumes a complete task breakdown exists in tasks.md. If
tasks are incomplete or missing, suggest running `/speckit.tasks` first to
regenerate the task list.
