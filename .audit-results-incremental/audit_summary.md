# QA Security Audit Report

**Generated**: 2026-07-06T06:19:31.796026+00:00
**Total Findings**: 15

## Severity Overview

| Severity | Count |
|---|---|
| P0 (Critical) | 0 |
| P1 (High) | 1 |
| P2 (Medium) | 14 |

## Suppressions and Baseline

- Active rules: 0
- Suppressed findings: 0
- Sources: none

## Scanner Results

| Scanner | Status | Duration | Findings |
|---|---|---|---|
| structure_analyzer | success | 113ms | 0 |
| static_analyzer | success | 132ms | 448 |
| security_scanner | success | 261ms | 1 |
| coverage_matrix | success | 75ms | 0 |
| external_security_scanner | success | 2696ms | 0 |
| secret_history_scanner | success | 97ms | 1 |
| manual_review_planner | success | 155ms | 10 |
| ai_manual_review_runner | success | 1519ms | 0 |
| contract_checker | success | 179ms | 0 |
| dep_scanner | success | 1195ms | 0 |
| complexity_scanner | success | 111ms | 4 |
| testability_scanner | success | 103ms | 5 |
| duplication_scanner | success | 162ms | 88 |
| business_flow_scanner | success | 156ms | 3 |
| error_handling_scanner | success | 84ms | 2 |
| observability_scanner | success | 102ms | 59 |
| agent_skill_security_scanner | success | 803ms | 14 |

## Scanner Coverage Matrix

| Coverage Status | Count |
|---|---|
| automated | 8 |
| ai-first | 2 |
| external-tool | 3 |

## Manual Review Targets

These are not confirmed vulnerabilities. They mark code that requires AI-agent authorization, state-machine, interleaving, lifetime, or taint-flow verification first. Escalate to human review only when the agent cannot close the evidence chain.

| Class | Severity | Location | AI Review Stage | Verification Focus |
|---|---|---|---|---|
| race_condition_or_toctou | P1 | `src/content/index.js:233` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| race_condition_or_toctou | P1 | `src/core/downloader.js:33` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| race_condition_or_toctou | P1 | `src/lib/file-saver.min.js:1` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| state_machine_logic | P1 | `src/lib/jszip.min.js:13` | AI_AGENT_REVIEW_PENDING | List all allowed states and transitions. |
| race_condition_or_toctou | P2 | `src/lib/jszip.min.js:13` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| race_condition_or_toctou | P1 | `src/options/options.js:77` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| race_condition_or_toctou | P1 | `src/platforms/base.js:58` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| state_machine_logic | P1 | `src/popup/popup.js:21` | AI_AGENT_REVIEW_PENDING | List all allowed states and transitions. |
| race_condition_or_toctou | P1 | `src/popup/popup.js:88` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |
| race_condition_or_toctou | P1 | `userscript/zhipu-exporter.user.js:395` | AI_AGENT_REVIEW_PENDING | List every shared variable read/written by concurrent tasks. |

## AI-First Review Packets

The harness generated AI-agent review packets with nearby code context and suggested-grep evidence. These packets are not final verdicts; the AI agent must fill the result slots before human review escalation.

- Packets ready: 10
- Pending AI review: 10

| Target | Class | Severity | Location |
|---|---|---|---|
| `AI-REVIEW-001-race_condition_or_toctou-src_content_index.js-233` | race_condition_or_toctou | P1 | `src/content/index.js:233` |
| `AI-REVIEW-002-race_condition_or_toctou-src_core_downloader.js-33` | race_condition_or_toctou | P1 | `src/core/downloader.js:33` |
| `AI-REVIEW-003-race_condition_or_toctou-src_lib_file-saver.min.js-1` | race_condition_or_toctou | P1 | `src/lib/file-saver.min.js:1` |
| `AI-REVIEW-004-state_machine_logic-src_lib_jszip.min.js-13` | state_machine_logic | P1 | `src/lib/jszip.min.js:13` |
| `AI-REVIEW-005-race_condition_or_toctou-src_lib_jszip.min.js-13` | race_condition_or_toctou | P2 | `src/lib/jszip.min.js:13` |
| `AI-REVIEW-006-race_condition_or_toctou-src_options_options.js-77` | race_condition_or_toctou | P1 | `src/options/options.js:77` |
| `AI-REVIEW-007-race_condition_or_toctou-src_platforms_base.js-58` | race_condition_or_toctou | P1 | `src/platforms/base.js:58` |
| `AI-REVIEW-008-state_machine_logic-src_popup_popup.js-21` | state_machine_logic | P1 | `src/popup/popup.js:21` |
| `AI-REVIEW-009-race_condition_or_toctou-src_popup_popup.js-88` | race_condition_or_toctou | P1 | `src/popup/popup.js:88` |
| `AI-REVIEW-010-race_condition_or_toctou-userscript_zhipu-exporter.user.js-395` | race_condition_or_toctou | P1 | `userscript/zhipu-exporter.user.js:395` |

## Top Findings (sorted by severity)

### [P1] No health-check endpoint found (/health, /healthz, /readyz, or Spring actuator) — orchestrators cannot determine service liveness
- **Location**: N/A
- **Scanner**: observability_scanner
- **Suggestion**: Add a /health or /healthz endpoint that checks critical dependencies (DB, cache) and returns 200/503 accordingly

### [P2] No Dockerfile found for deployable project
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add a Dockerfile with multi-stage build for production

### [P2] No CI/CD configuration found
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add CI/CD configuration (GitHub Actions, GitLab CI, etc.)

### [P2] Source directory 'src\background' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\background'

### [P2] Source directory 'src\content' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\content'

### [P2] Source directory 'src\core' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\core'

### [P2] Source directory 'src\lib' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\lib'

### [P2] Source directory 'src\options' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\options'

### [P2] Source directory 'src\platforms' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\platforms'

### [P2] Source directory 'src\popup' has no sibling or nested test directory
- **Location**: N/A
- **Scanner**: structure_analyzer
- **Suggestion**: Add tests/ or __tests__/ alongside 'src\popup'

### [P2] Git history secret scanning did not run; gitleaks/trufflehog unavailable or failed.
- **Location**: N/A
- **Scanner**: secret_history_scanner
- **Suggestion**: Install gitleaks or trufflehog and rerun the audit to check committed/deleted secrets.

### [P2] Dev dependency 'copy-webpack-plugin' should not be in production dependencies
- **Location**: N/A
- **Scanner**: dep_scanner
- **Suggestion**: Move to devDependencies and ensure build process excludes it

### [P2] Dev dependency 'jsdom' should not be in production dependencies
- **Location**: N/A
- **Scanner**: dep_scanner
- **Suggestion**: Move to devDependencies and ensure build process excludes it

### [P2] Dev dependency 'webpack' should not be in production dependencies
- **Location**: N/A
- **Scanner**: dep_scanner
- **Suggestion**: Move to devDependencies and ensure build process excludes it

### [P2] Dev dependency 'webpack-cli' should not be in production dependencies
- **Location**: N/A
- **Scanner**: dep_scanner
- **Suggestion**: Move to devDependencies and ensure build process excludes it
