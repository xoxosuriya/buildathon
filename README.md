# IntentLock — AI-Commerce Transaction Safety Gateway

> **Core Philosophy:**
> **THE AI PROPOSES. THE USER AUTHORIZES. INTENTLOCK ENFORCES. RAZORPAY EXECUTES.**

---

## 1. What is IntentLock?

**IntentLock** is an enterprise-grade transaction safety gateway for autonomous AI-driven commerce. As AI shopping agents gain autonomy to interact with e-commerce platforms, IntentLock ensures AI output **never** becomes direct payment authority.

It enforces machine-readable, single-use user authorization contracts that mathematically bind AI intent to explicit user decisions, preventing price escalation, unauthorized add-ons, quantity tampering, replay attacks, hallucinated offers, and merchant state manipulation.

---

## 2. Problem Solved

Traditional AI commerce risks prompt injection, price drift between proposal and checkout, hallucinated merchant offers, and unauthorized spending. IntentLock solves this by establishing a strict, immutable boundary between **AI Intent Interpretation**, **AI Proposal Generation**, **User Decision Approval**, **Deterministic Verification**, and **Payment Gateway Execution**.

---

## 3. Project Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Backend Foundation & DB Models | **COMPLETE** |
| **Phase 2** | Intent → Authorization Workflow | **COMPLETE** |
| **Phase 3** | Deterministic Verification Engine (21 Checks) | **COMPLETE** |
| **Phase 4** | Adversarial Test Suite | **COMPLETE** |
| **Phase 5** | LLM Semantic Layer | **COMPLETE** |
| **Phase 6** | React Frontend | **COMPLETE / FROZEN** |
| **Phase 7** | Razorpay Test Mode Integration | **COMPLETE** |
| **Phase 8** | Evaluation Suite & Final Documentation | **IN PROGRESS** |

---

## 4. Complete System Architecture

```
USER NATURAL LANGUAGE
        ↓
LLM SEMANTIC LAYER
        ↓
STRICT STRUCTURED OUTPUT
        ↓
DOMAIN/CATALOG VALIDATION
        ↓
INTENT
        ↓
AUTHORIZATION
        ↓
AI AGENT PROPOSAL
        ↓
21-CHECK DETERMINISTIC VERIFICATION ENGINE
        ↓
 ┌──────┴──────┬──────────────┐
 ▼             ▼              ▼
[ ALLOW ]  [ REVIEW ]    [ BLOCK ]
 │             │              │
Atomically  Requires Human   Fails Closed
Consumes   Intervention     Security Check
 │
 ▼
ALLOW ONLY
        ↓
RAZORPAY TEST MODE (`rzp_test_` Key Enforcement)
        ↓
PAYMENT ORDER
```

> [!IMPORTANT]
> **CRITICAL ARCHITECTURAL PRINCIPLE:**
> - The **LLM interprets intent**.
> - The **Deterministic Verification Engine enforces intent**.
> - The **LLM must NEVER be presented as the final security authority**.

---

## 5. Phase 5 — LLM Semantic Layer

Phase 5 adds natural-language processing capabilities to IntentLock without compromising the deterministic security boundary:

- **Natural-Language Intent Parsing**: Converts free-form text user prompts into structured intent models via `/intent/semantic/parse` and `/intent/semantic/create`.
- **Pydantic Structured Validation**: Uses strict Pydantic schemas (`SemanticIntentRequest`, `SemanticIntentResponse`) to guarantee structural integrity before intent persistence.
- **Domain/Catalog Resolution**: Resolves user product requests strictly against authoritative catalog records (`Product` & `MerchantState`).
- **Clarity Gate**: Rejects ambiguous, underspecified, or multi-option prompts until clarified.
- **Missing Financial-Bound Protection**: Rejects prompts missing explicit monetary spending limits (`max_amount`).
- **Prompt-Injection Resistance**: Sanitizes and isolates user input, discarding system instruction overrides or unauthorized action escalations.
- **Offline / Heuristic Fallback**: Provides deterministic pattern-matching fallbacks for offline testing environments without requiring external API keys.

---

## 6. Phase 7 — Razorpay Test Mode Integration

Phase 7 completes payment order creation behind IntentLock's 21-check verification engine:

- **Razorpay SDK Integration**: Integrated `razorpay>=1.4.0` client SDK in payment execution pipeline.
- **Strict Test Mode Key Enforcement**: Credentials must start with `rzp_test_`. 
- **Production-Key Rejection**: Any credential using `rzp_live_...` or malformed key formats is rejected with HTTP 400 (`NON_TEST_KEY_REJECTED`) before initializing the Razorpay client.
- **Verification Security Gate**:
  - `BLOCK` decision: HTTP 400 Bad Request — payment execution is blocked before calling Razorpay.
  - `REVIEW` decision: HTTP 400 Bad Request — payment execution is blocked before calling Razorpay.
  - `ALLOW` decision: Required to initiate Razorpay Test Mode order creation (`client.order.create`).
- **Fail-Closed Gateway Behavior**: Network or gateway errors return HTTP 502 Bad Gateway and emit a `PAYMENT_FAILED` audit log without creating fake order IDs.
- **Idempotency**: Repeated payment requests for the same transaction return the existing stored `PaymentOrder`.
- **Audit Logging**: Emits immutable `PAYMENT_EXECUTED`, `PAYMENT_REJECTED`, `PAYMENT_FAILED`, and `PAYMENT_REPEATED` audit events.
- **Secret Protection**: `.env.example` contains non-sensitive placeholders only; `.env` is gitignored; zero API credentials exposed in logs or API responses.

> [!CAUTION]
> **NO REAL-MONEY PAYMENT FLOW IS USED.** IntentLock operates strictly in Razorpay Test Mode (`rzp_test_...`).

---

## 7. Decision Semantics

1. **`ALLOW`**: All 21 security and operational checks pass. Atomically updates `Authorization.status` from `"ACTIVE"` to `"USED"` in a single database transaction boundary, authorizing payment gateway execution.
2. **`REVIEW`**: Operational flags detected (e.g. live merchant price changed within total authorized limit, or stale `MerchantState`). Preserves `Authorization.status = "ACTIVE"` for human review or merchant state refresh.
3. **`BLOCK`**: Hard security check failed (e.g. amount breach, quantity breach, expired authorization, currency mismatch, unauthorized add-on, replay attempt, or invalid hierarchy). Fails closed immediately without consuming the authorization contract.

---

## 8. Verification & Testing Baseline

IntentLock includes an extensive automated security and functional verification suite:

```
Full Backend Test Suite:
✅ 995 passed
❌ 0 failed
⚠️ 0 errors

Phase 5 LLM Semantic Layer Tests:
✅ 13 passed

Phase 7 Payment & Security Enforcement Tests:
✅ 42 passed
```

The test suite validates:
- Domain database modeling & relationships (Phase 1)
- State machine workflows & authorization generation (Phase 2)
- 21-check deterministic verification logic (Phase 3)
- Comprehensive adversarial attack scenarios (Phase 4)
- LLM semantic parsing, Pydantic validation, and injection resistance (Phase 5)
- Razorpay Test Mode enforcement, fail-closed boundaries, and key validation (Phase 7)

---

## 9. Security Controls

- **Deterministic Authority**: The 21-check verification engine evaluates hard constraints independently of LLM reasoning.
- **Untrusted LLM Output Isolation**: LLM output is parsed as unverified draft proposals and strictly validated against catalog entity schemas.
- **No Fabricated Financial Bounds**: Intents without explicit user financial constraints are rejected.
- **Catalog-Backed Entity Resolution**: Product and merchant references are resolved directly against verified database records.
- **Replay Protection**: Single-use authorizations transition atomically from `ACTIVE` to `USED` on `ALLOW`.
- **Fail-Closed Gateway Execution**: Failures during payment gateway order creation abort execution without generating fallback order tokens.
- **Append-Only SHA-256 Audit Trail**: Every authorization state change, verification decision, and payment attempt is logged in an append-only event log with cryptographic SHA-256 hash chaining.

---

## 10. Metrics & Evaluation Infrastructure

IntentLock exposes runtime telemetry and decision counters via `GET /audit/stats`:

- `total_transactions`: Total transactions evaluated
- `allowed_count`: Total `ALLOW` decisions
- `review_count`: Total `REVIEW` decisions
- `blocked_count`: Total `BLOCK` decisions
- `total_amount_blocked`: Cumulative monetary value prevented from unauthorized spending (in INR)
- `active_agents`: Number of active AI agents interacting with the gateway
- `GET /audit/events`: Complete append-only SHA-256 hash-chained AuditEvent stream

*Note: Automated latency benchmarks (p50/p95/p99) and ROC confusion-matrix reports are documented evaluation roadmap items for future production releases.*

---

## 11. Installation & Setup

### Prerequisites
- Python 3.10+
- Windows / Linux / macOS

### Installation Steps
```bash
# Clone/navigate to project root
cd backend

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

---

## 12. Running the Backend Server

To start the FastAPI server with auto-reload:

```powershell
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Documentation (Swagger)**: http://127.0.0.1:8000/docs
- **Health Check Endpoint**: http://127.0.0.1:8000/health

---

## 13. Running the Automated Test Suite

To execute the verified pytest suite:

```powershell
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\python -m pytest
```

---

## 14. Frontend & Prototype Status

- **Frontend Status**: The React frontend in `frontend/` is **FROZEN** and remains untouched by backend security enhancements.
- **Database Architecture**: Uses SQLite with `PRAGMA foreign_keys=ON` for local execution and testing. Ready for PostgreSQL migration using `SELECT ... FOR UPDATE NOWAIT` for high-throughput concurrent transaction locking in production environments.
