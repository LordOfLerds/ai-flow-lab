# Smart Import — Code Analysis for "aurena-k-list"

You are analyzing this codebase to produce draft documentation. You have Read, Glob, and Grep tools — USE THEM to inspect actual source files, not just the summaries below.

## Codebase Summary
- 106 files
- Technologies: Python

## Directory Structure
```
AGENTS.md
CLAUDE.md
Unbenannt.canvas
ai/
  briefs/
  current-state/
  followups/
  project.config.yaml
  reports/
  results/
  reviews/
  specs/
automation/
  state/
    chatgpt-worker.log
    decision_proposals/
    goals/
      G-0001.json
    prompts-queue/
    proposals/
    tasks/
      T-0001.json
      T-0002.json
      T-0003.json
      T-0004.json
      T-0005.json
      T-0006.json
      T-0007.json
data/
  exports/
    aurena_k_list_export_20260410_101213_fe6a4189.xlsx
    aurena_k_list_export_20260410_101238_443d4250.xlsx
    aurena_k_list_export_20260410_101314_86405fa4.xlsx
    aurena_k_list_export_20260410_101323_498493ff.xlsx
    aurena_k_list_export_20260410_101844_7d0543ea.xlsx
    aurena_k_list_export_20260410_102849_23904fb6.xlsx
    aurena_k_list_export_20260410_103829_3727084c.xlsx
    aurena_k_list_export_20260410_104810_552f0ed2.xlsx
    aurena_k_list_export_20260410_112543_32d49355.xlsx
  klist.db
docs/
  ARCHITECTURE.md
  DOMAIN_MODEL.md
  IMPLEMENTATION_PLAN.md
  INVARIANTS.md
  K_LIST_IMPORT.md
  REVIEW_AND_BIDWARE_SLICE.md
  RUNBOOK.md
  V1_RELEASE_REVIEW.md
goals/
  G-0001.md
pyproject.toml
src/
  klist/
    __init__.py
    bidware_adapter/
      __init__.py
      adapter.py
    domain/
      __init__.py
      enums.py
      models.py
      transitions.py
    dropbox_fallback_service/
      __init__.py
      fallback.py
    export_service/
      __init__.py
      exporter.py
      readiness.py
      reporting.py
    import_pipeline/
      __init__.py
      importer.py
      models.py
      persistence.py
    lot_check_service/
      __init__.py
      checker.py
      review.py
    matching_engine/
      __init__.py
      searcher.py
      variant_generator.py
    repository/
      __init__.py
      auction_repo.py
      batch_repo.py
      case_repo.py
      conflict_analysis_repo.py
      database.py
      decision_repo.py
      dropbox_repo.py
      export_repo.py
      lot_repo.py
      match_repo.py
      review_repo.py
      schema
```

## Existing Documentation
### docs/ARCHITECTURE.md
---
type: architecture
created: 2026-04-10
tags: [ai-flow-lab, architecture]
---

# Architecture — aurena-k-list V1

## Overview

A locally operated Python web application that manages purchase cases
originating from a K-list, matches them against Bidware auctions,
evaluates revenue, runs lot checks, and exports the final result to Excel.

```
┌─────────────────────────────────────────────────────┐
│                   Browser (User)                    │
└────────────────────────┬────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────┐
│                  web_app (FastAPI)                   │
│  routes / templates / static                        │
└──┬───┬───┬───┬───┬───┬───┬───┬──────────────────────┘
   │   │   │   │   │   │   │   │
   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
┌─────────────────────────────────────────────────────┐
│                 Service Layer                        │
│                                                 

## Source Samples
### src/klist/bidware_adapter/__init__.py (14 lines)
```
from klist.bidware_adapter.adapter import (
    BidwareAdapter,
    BidwareAdapterError,
    deduplicate_candidates,
    parse_auction_result_row,
)

__all__ = [
    "BidwareAdapter",
    "BidwareAdapterError",
    "deduplicate_candidates",
    "parse_auction_result_row",
]

```
### src/klist/bidware_adapter/adapter.py (262 lines)
```
"""Read-only Bidware title search adapter.

All selector, timing, and row parsing logic stays in this module.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping, Sequence
from typing import Any

from klist.domain.models import AuctionCandidate

TITLE_SEARCH_INPUT_SELECTORS = (
    'input[name="titel"]',
    'input[name="title"]',
    'input[placeholder*="Titel"]',
    'input[placeholder*="Title"]',
)
SEARCH_BUTTON_SELECTORS = (
    'button:has-text("Suchen")',
    'button:has-text("Suche")',
    'button:has-text("Search")',
    'input[type="submit
```
### src/klist/domain/__init__.py (24 lines)
```
from klist.domain.enums import CaseStatus, TaxType, RevenueAction
from klist.domain.models import (
    PurchaseCase,
    AuctionCandidate,
    ConfirmedAuctionMatch,
    RevenueDecision,
    LotCandidate,
    ImportBatch,
)
from klist.domain.transitions import can_transition

__all__ = [
    "CaseStatus",
    "TaxType",
    "RevenueAction",
    "PurchaseCase",
    "AuctionCandidate",
    "ConfirmedAuctionMatch",
    "RevenueDecision",
    "LotCandidate",
    "ImportBatch",
    "can_transition",
]

```

## Your Task

Use your tools to read key source files (models, routes, config, main entry points). Then output:

### SECTION: DRAFT_DOMAIN_MODEL
A draft domain model based on what you find in the code (entities, types, relationships).

### SECTION: DRAFT_ARCHITECTURE
A draft architecture doc based on the actual code structure.

### SECTION: DRAFT_INVARIANTS
Any invariants or constraints you can infer from validations, guards, types.

### SECTION: GAP_QUESTIONS
A numbered list of 5-15 specific questions that you CANNOT answer from code alone. These should be about:
- Business rules and domain logic not visible in code
- User stories and workflows
- Deployment environment and infrastructure
- Naming conventions and terminology
- Compliance, security, or legal requirements
- Performance requirements and SLAs
- Third-party service configurations
- Target audience and user personas

Format each question as:
1. **<short topic>**: <specific question>

Focus on questions whose answers would most improve the documentation quality.

### SECTION: CODE_SUMMARY
A 3-5 sentence summary of what this project does, based on your code analysis. This will be shown to the user to confirm accuracy.