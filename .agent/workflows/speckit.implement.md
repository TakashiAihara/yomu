---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

# Implementation Execution

## User Input

```text
$ARGUMENTS
```

You MUST consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: 'I'\''m Groot' (or double-quote: "I'm Groot").

2. Check checklists status (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in checklists/ directory
   - For each checklist count: Total items (lines matching `- [ ]` or `- [X]` or `- [x]`), Completed items (`- [X]` or `- [x]`), Incomplete items (`- [ ]`)
   - Create status table showing Checklist name, Total, Completed, Incomplete, Status (PASS/FAIL)
   - Calculate overall status: PASS (all checklists 0 incomplete), FAIL (one or more incomplete)
   - If any incomplete: Display table, STOP and ask "Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)", wait for response. If "no/wait/stop" halt, if "yes/proceed/continue" go to step 3
   - If all complete: Display table, automatically proceed to step 3

3. Load and analyze implementation context:
   - REQUIRED: Read tasks.md for complete task list and execution plan
   - REQUIRED: Read plan.md for tech stack, architecture, file structure
   - IF EXISTS: Read data-model.md for entities and relationships
   - IF EXISTS: Read contracts/ for API specs and test requirements
   - IF EXISTS: Read research.md for technical decisions and constraints
   - IF EXISTS: Read quickstart.md for integration scenarios

4. Project Setup Verification - Create/verify ignore files based on actual project setup:

   Detection & Creation Logic:
   - Check `git rev-parse --git-dir 2>/dev/null` succeeds → create/verify .gitignore
   - Check Dockerfile* exists or Docker in plan.md → create/verify .dockerignore
   - Check .eslintrc* exists → create/verify .eslintignore
   - Check eslint.config.* exists → ensure config's ignores entries cover required patterns
   - Check .prettierrc* exists → create/verify .prettierignore
   - Check .npmrc or package.json exists → create/verify .npmignore (if publishing)
   - Check terraform files (*.tf) exist → create/verify .terraformignore
   - Check helm charts present → create/verify .helmignore

   If ignore file exists: Verify essential patterns, append missing critical patterns only
   If ignore file missing: Create with full pattern set for detected technology

   Common Patterns by Technology (from plan.md tech stack):
   - Node.js/JavaScript/TypeScript: node_modules/, dist/, build/, *.log, .env*
   - Python: __pycache__/, *.pyc, .venv/, venv/, dist/,*.egg-info/
   - Java: target/, *.class,*.jar, .gradle/, build/
   - C#/.NET: bin/, obj/, *.user,*.suo, packages/
   - Go: *.exe,*.test, vendor/, *.out
   - Ruby: .bundle/, log/, tmp/, *.gem, vendor/bundle/
   - PHP: vendor/, *.log,*.cache, *.env
   - Rust: target/, debug/, release/, *.rs.bk,*.rlib, *.prof*, .idea/, *.log, .env*
   - Kotlin: build/, out/, .gradle/, .idea/, *.class,*.jar, *.iml, *.log, .env*
   - C++: build/, bin/, obj/, out/, *.o,*.so, *.a,*.exe, *.dll, .idea/, *.log, .env*
   - C: build/, bin/, obj/, out/, *.o,*.a, *.so,*.exe, Makefile, config.log, .idea/, *.log, .env*
   - Swift: .build/, DerivedData/, *.swiftpm/, Packages/
   - R: .Rproj.user/, .Rhistory, .RData, .Ruserdata, *.Rproj, packrat/, renv/
   - Universal: .DS_Store, Thumbs.db, *.tmp,*.swp, .vscode/, .idea/

   Tool-Specific Patterns:
   - Docker: node_modules/, .git/, Dockerfile*, .dockerignore, *.log*, .env*, coverage/
   - ESLint: node_modules/, dist/, build/, coverage/, *.min.js
   - Prettier: node_modules/, dist/, build/, coverage/, package-lock.json, yarn.lock, pnpm-lock.yaml
   - Terraform: .terraform/, *.tfstate*, *.tfvars, .terraform.lock.hcl
   - Kubernetes/k8s: *.secret.yaml, secrets/, .kube/, kubeconfig*, *.key,*.crt

5. Parse tasks.md structure and extract:
   - Task phases: Setup, Tests, Core, Integration, Polish
   - Task dependencies: Sequential vs parallel execution rules
   - Task details: ID, description, file paths, parallel markers [P]
   - Execution flow: Order and dependency requirements

6. Execute implementation following task plan:
   - Phase-by-phase execution: Complete each phase before next
   - Respect dependencies: Run sequential tasks in order, parallel tasks [P] together
   - Follow TDD approach: Execute test tasks before corresponding implementation
   - File-based coordination: Tasks affecting same files run sequentially
   - Validation checkpoints: Verify each phase completion before proceeding

7. Autonomous Decision Tracking (Detailed, Non-Blocking):

   Philosophy: Make smart decisions autonomously, record EVERYTHING for later review.

   7.1. Decision-Making Approach:
   - NEVER stop to ask questions - use best practices and make informed decisions
   - ALWAYS record the decision - document what was chosen and why
   - ALWAYS record alternatives - show what other options were considered
   - ALWAYS explain tradeoffs - make reasoning transparent

   7.2. When to Record:
   - Choosing between multiple valid implementation approaches
   - Adding dependencies not explicitly in plan.md
   - Modifying architecture or data structures
   - Handling edge cases or error scenarios
   - Making performance or security tradeoffs
   - Deviating from original plan due to technical constraints
   - Discovering and addressing potential issues

   7.3. Decision Log Format - Create/append to FEATURE_DIR/artifacts/decisions.md:

   ```markdown
   # Implementation Decisions
   > Auto-generated during implementation
   > Each decision made autonomously using best practices
   > Review with /speckit.reflect after implementation
   ---
   ## [YYYY-MM-DD HH:MM] Decision: <Short Title>
   Task: [Related task ID]
   Category: Architecture | Dependencies | Security | Performance | Error Handling | Data Model | API Design | Testing | DevOps
   
   Context: [What situation required decision - be specific about code/feature]
   
   Decision Made:
   Chosen: Option [X] - [Name]
   [1-2 sentence explanation why this was best choice]
   
   Options Evaluated:
   | Option | Description | Key Trade-off |
   |--------|-------------|---------------|
   | A ⭐ | [Chosen - concise] | [Main pro/con] |
   | B | [Alternative - concise] | [Why not chosen] |
   | C | [Another alternative] | [Why not chosen] |
   
   Implementation Details:
   Files affected: path/to/file1.ts - [what changed]
   Dependencies added: package-name@version - [purpose]
   Configuration changes: [describe updates]
   
   Verification:
   How to test: [Steps to verify]
   Expected behavior: [What should happen]
   
   Future Considerations:
   Reversibility: 🟢 Easy | 🟡 Moderate | 🔴 Difficult
   If we need to change later: [What switching to Option B/C involves]
   Watch out for: [Potential issues, limitations, edge cases to monitor]
   
   References: [Docs, Stack Overflow, RFCs, blog posts]
   ---
   ```

   7.4. Concern/Risk Log Format - Append to FEATURE_DIR/artifacts/concerns.md:

   ```markdown
   # Implementation Concerns & Risks
   > Issues discovered and addressed during implementation
   > All concerns mitigated or documented
   > Review with /speckit.reflect for follow-up planning
   ---
   ## [YYYY-MM-DD HH:MM] Concern: <Short Title>
   Task: [Related task ID]
   Type: Performance | Security | Maintainability | Scalability | UX | Technical Debt
   Severity: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
   
   What Was Discovered: [Detailed description]
   Why This Matters: [Impact on users, system, future development]
   
   Current Mitigation:
   Status: ✅ Mitigated | ⚠️ Partially Mitigated | ❌ Accepted Risk | 📋 Needs Follow-up
   What was done: [Actions taken]
   Code changes: [Files modified, specific implementation]
   
   Remaining Risk: [What risk remains if any]
   
   Recommended Follow-up:
   - [ ] [Action item 1]
   Priority: Immediate | Short-term | Long-term
   
   References: [Security advisories, performance benchmarks]
   ---
   ```

   7.5. Recording Guidelines:
   - Be specific: Include file names, function names, line numbers
   - Be honest: Document limitations and tradeoffs, not just successes
   - Be forward-looking: Note what future developers should know
   - Be referenced: Link to external docs, RFCs, Stack Overflow
   - Be connected: Reference related decisions and tasks

   7.6. Example Scenarios:

   Scenario 1 - Need to choose database ORM:
   ✅ DO: Evaluate options, choose best fit, record with table format
   ❌ DON'T: Ask user "which ORM should I use?"

   Scenario 2 - Discover potential SQL injection risk:
   ✅ DO: Implement parameterized queries, record concern and mitigation
   ❌ DON'T: Ask user "is SQL injection a concern here?"

   Scenario 3 - Plan says "API" but doesn't specify REST vs GraphQL:
   ✅ DO: Choose REST (simpler for CRUD), record decision with rationale
   ❌ DON'T: Stop and ask "should this be REST or GraphQL?"

   Scenario 4 - Test fails due to timing issue:
   ✅ DO: Add proper async handling, record issue and fix
   ❌ DON'T: Ask user "how should I fix this test?"

8. Implementation execution rules:
   - Setup first: Initialize project structure, dependencies, configuration
   - Tests before code: Write tests for contracts, entities, integration scenarios
   - Core development: Implement models, services, CLI commands, endpoints
   - Integration work: Database connections, middleware, logging, external services
   - Polish and validation: Unit tests, performance optimization, documentation

9. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - IMPORTANT: Mark completed tasks as [X] in tasks file
   - Decision Tracking: Log all significant decisions to artifacts/decisions.md
   - Concern Tracking: Log all discovered issues to artifacts/concerns.md
   - Continue implementation without stopping for questions - make informed decisions autonomously

10. Completion validation:
    - Verify all required tasks completed
    - Check implemented features match original specification
    - Validate tests pass and coverage meets requirements
    - Confirm implementation follows technical plan
    - __Generate implementation_summary.md__: Document completed work, technical decisions made, files changed, pending actions, and verification checklist
    - Report final status with summary of completed work
    - Next Step: Suggest running /speckit.reflect to analyze implementation and create follow-up issues

11. __Create Pull Request__ (if on feature branch):
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

__Output Files__:

- Updated source code files per tasks.md
- implementation_summary.md - Comprehensive summary of implementation work

Note: This command assumes complete task breakdown exists in tasks.md. If tasks incomplete or missing, suggest running /speckit.tasks first to regenerate task list.
