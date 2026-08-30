# IntentLock — AI-Commerce Transaction Safety Gateway

> **Core Philosophy:**
> **THE AI PROPOSES. THE USER AUTHORIZES. INTENTLOCK ENFORCES. RAZORPAY EXECUTES.**

---

## 1. What is IntentLock?

**IntentLock** is an enterprise-grade transaction safety gateway for autonomous AI-driven commerce. As AI shopping agents gain autonomy to interact with e-commerce platforms, IntentLock ensures AI output never becomes direct payment authority. 

It enforces machine-readable, single-use user authorization contracts that mathematically bind AI intent to explicit user decisions, preventing price escalation, unauthorized add-ons, quantity tampering, replay attacks, and merchant state manipulation.

---

## 2. Problem Solved

Traditional AI commerce risks prompt injection, price drift between proposal and checkout, hallucinated merchant offers, and unauthorized spending. IntentLock solves this by establishing a strict, immutable boundary between **AI Proposal Generation**, **User Decision Approval**, and **Transaction Verification**.

---

## 3. Core Architecture & Phase Overview

IntentLock is built as a Python FastAPI REST monolith backed by SQLAlchemy ORM and an append-only audit trail.

```
       Step 1: AI Proposal
Intent + MerchantState + Product ──► Proposal Snapshot
                                          │
       Step 2: User Approval              ▼
Explicit User Decision ──────────► Authorization Contract (ACTIVE)
                                          │
       Step 3: Verification               ▼
Transaction Request ─────────────► Verification Engine (21 Checks)
                                          │
                        ┌─────────────────┼─────────────────┐
                        ▼                 ▼                 ▼
                    [ ALLOW ]         [ REVIEW ]        [ BLOCK ]
                        │                 │                 │
             Atomically Consumes   Requires Human     Fails Closed
               Authorization        Intervention      Security Check
```

### Phase Responsibilities
- **Phase 1 (Foundation)**: Core domain database schema (Users, Agents, Merchants, Products, MerchantStates, Intents, Authorizations, Transactions, VerificationResults, AuditEvents) with `Decimal` financial precision and append-only audit logs.
- **Phase 2 (Workflow)**: Intent resolution, authoritative `MerchantState` price calculation, immutable `ProposalSnapshot` binding, explicit user approval state machine, single-use authorization contracts, and tamper-proof price freezing.
- **Phase 3 (Deterministic Engine)**: A 21-check verification engine enforcing Category A (Auth Integrity), Category B (Merchant Validity), and Category C (Temporal/Operational Checks) with database-backed idempotency first, atomic `ALLOW` consumption, strict whitelist add-on parsing, and fail-closed decision aggregation.

---

## 4. Decision Semantics

1. **`ALLOW`**: All 21 security and operational checks pass. Atomically updates `Authorization.status` from `"ACTIVE"` to `"USED"` in a single database transaction boundary, authorizing payment gateway execution.
2. **`REVIEW`**: Operational flags detected (e.g. live merchant price changed within total authorized limit, or stale `MerchantState`). Preserves `Authorization.status = "ACTIVE"` for human review or merchant state refresh.
3. **`BLOCK`**: Hard security check failed (e.g. amount breach, quantity breach, expired authorization, currency mismatch, unauthorized add-on, replay attempt, or invalid hierarchy). Fails closed immediately without consuming the authorization contract.

---

## 5. Installation & Setup

### Prerequisites
- Python 3.10+
- Windows / Linux / macOS

### Installation Steps
```bash
# Clone/navigate to project root
cd D:\Razorpay_productthon\backend

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

---

## 6. Running the Backend Server

To start the FastAPI server with auto-reload:

```bash
cd D:\Razorpay_productthon\backend
.\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Documentation (Swagger)**: http://127.0.0.1:8000/docs
- **Health Check Endpoint**: http://127.0.0.1:8000/health

---

## 7. Running the Automated Test Suite

To run the complete automated test suite on a fresh database:

```powershell
cd D:\Razorpay_productthon\backend

# Reset test database
Remove-Item -Path "*.db" -Force -ErrorAction SilentlyContinue

# Execute pytest
$env:PYTHONPATH="."
.\venv\Scripts\python -m pytest tests/ -v
```

---

## 8. Frontend & Implementation Status

> [!NOTE]
> **Frontend Status**: The Web Frontend UI is **NOT YET IMPLEMENTED** in Phase 1–3. Frontend design and React component reference will be supplied separately for subsequent development phases.

---

## 9. Prototype & Architectural Limitations

- **Database Concurrency**: The prototype uses SQLite with `foreign_keys=ON` and single-writer file locking for single-use state transitions. Production deployments will transition to PostgreSQL using `SELECT ... FOR UPDATE NOWAIT` for high-throughput concurrent transaction locking.
- **Simulated Payment Gateway**: Razorpay SDK payment capture and execution are simulated stub endpoints in Phase 1–3 and will be integrated in subsequent phases following verification engine approval.
