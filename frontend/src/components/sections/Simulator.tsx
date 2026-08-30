import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MOCK_VERIFICATION_RESULTS } from '../../data/mockData';

export const Simulator: React.FC = () => {
  const [running, setRunning] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<typeof MOCK_VERIFICATION_RESULTS['legitimate'] | null>(null);
  const [driftResolved, setDriftResolved] = useState<boolean>(false);

  const runScenario = (type: 'legitimate' | 'price_attack' | 'delegation_attack' | 'replay_attack' | 'price_drift') => {
    setRunning(true);
    setActiveScenario(type);
    setLogs([]);
    setResult(null);
    setDriftResolved(false);

    const steps = {
      legitimate: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Verifying Agent ShoppingBuddy credentials (CHK-05 passed)",
        "EVAL: Comparing requested amount (₹1,200.00) against maximum bounded limit (₹1,200.00) (CHK-08 passed)",
        "EVAL: Verifying live merchant catalog price match (CHK-19 passed)",
        "RESULT: All 21 security gate checks passed cleanly.",
        "GATEWAY: Initializing payment dispatch in Razorpay Test Mode...",
        "SUCCESS: Razorpay Order Created (order_test_rzp_9d0eed64). Contract marked as USED."
      ],
      price_attack: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Verifying Agent ShoppingBuddy credentials (CHK-05 passed)",
        "EVAL: Evaluating transaction request amount (₹2,500.00) against capability bound limit (₹1,200.00)",
        "FAIL: CHK-08 (Amount Within Bounded Limit) violation detected! Request exceeds max amount by ₹1,300.00",
        "RESULT: Security boundary violation. Terminating pipeline execution.",
        "GATEWAY: Execution blocked. Contract state remains ACTIVE (unspent)."
      ],
      delegation_attack: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Evaluating executing agent: Agent-B",
        "FAIL: CHK-05 (Agent Non-Delegation Match) violation! Contract is bound to Agent-A and is non-delegable.",
        "RESULT: Security boundary violation. Terminating pipeline execution.",
        "GATEWAY: Execution blocked. Contract state remains ACTIVE (unspent)."
      ],
      replay_attack: [
        "PARSE: Request received to execute authorization AUTH-CONSUMED",
        "EVAL: Checking contract auth_consumed_90d status...",
        "FAIL: CHK-02 (Authorization Status Active) and CHK-21 (Replay Protection Lock) failed.",
        "REJECT: Capability contract has already been spent. Double-spend attempt detected.",
        "RESULT: Security boundary violation. Terminating pipeline execution.",
        "GATEWAY: Execution blocked."
      ],
      price_drift: [
        "PARSE: Request received to execute authorization AUTH-82F",
        "EVAL: Checking contract auth_legit_82f validity (CHK-01 to CHK-03 passed)",
        "EVAL: Comparing signed proposal price (₹1,200.00) against live merchant checkout price (₹1,400.00)",
        "WARN: CHK-19 (Live Merchant Price Discrepancy) triggered. Live checkout price has shifted.",
        "RESULT: Operational variance detected. Halting for user review."
      ]
    };

    const runLogs = steps[type];
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < runLogs.length) {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${runLogs[currentIdx]}`]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setRunning(false);
        setResult(MOCK_VERIFICATION_RESULTS[type]);
      }
    }, 400);
  };

  const resolveDrift = () => {
    setRunning(true);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] USER RESOLVED: Accept price drift to ₹1,400.00`,
      `[${new Date().toLocaleTimeString()}] MINTING: Superseding AUTH-82F ➔ Minting new capability AUTH-83G`,
      `[${new Date().toLocaleTimeString()}] RE-EVAL: Evaluating AUTH-83G on 21-check gateway...`,
      `[${new Date().toLocaleTimeString()}] SUCCESS: Re-verification ALLOW. Creating Razorpay order...`
    ]);

    setTimeout(() => {
      setRunning(false);
      setDriftResolved(true);
      setResult({
        id: "vr_drift_resolved",
        transaction_id: "txn_drift_resolved",
        authorization_id: "auth_legit_83g",
        decision: "ALLOW",
        reason: "User accepted price increase to ₹1,400.00. Newly minted capability verified successfully.",
        checks_evaluated: 21,
        checks_passed: 21,
        created_at: new Date().toISOString()
      });
    }, 1200);
  };

  return (
    <div className="grid-two-col">
      {/* Left column: Scenarios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: 'var(--font-size-subheading)',
              fontWeight: 'var(--font-weight-bold)',
              textTransform: 'uppercase',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-xs)'
            }}
          >
            GATEWAY DEMO SIMULATOR
          </h3>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-muted)' }}>
            Select any execution scenario below to trace the evaluation logic and watch how the IntentLock engine enforces strict capability bounds.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'legitimate', label: 'Legitimate Purchase', badge: 'ALLOW', var: 'success' },
            { id: 'price_attack', label: 'Price Inflation Attack', badge: 'BLOCK', var: 'error' },
            { id: 'delegation_attack', label: 'Agent Delegation Attack', badge: 'BLOCK', var: 'error' },
            { id: 'replay_attack', label: 'Replay Protection Lock', badge: 'BLOCK', var: 'error' },
            { id: 'price_drift', label: 'Live Price Drift', badge: 'REVIEW', var: 'warning' }
          ].map((scen) => (
            <button
              key={scen.id}
              onClick={() => runScenario(scen.id as any)}
              disabled={running}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeScenario === scen.id ? 'var(--color-surface-elevated)' : 'var(--color-surface)',
                border: `1px solid ${activeScenario === scen.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                cursor: running ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all var(--motion-duration-fast) var(--motion-easing-default)'
              }}
              className="animate-transition"
            >
              <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-medium)', textTransform: 'uppercase' }}>
                {scen.label}
              </span>
              <Badge variant={scen.var as any}>{scen.badge}</Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Right column: Trace & Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {/* Terminal logs */}
        <Card variant="default" padding="none">
          <div
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              padding: '12px 16px',
              borderBottom: 'var(--border-width-thin) solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-family-sans)',
                fontSize: 'var(--font-size-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                textTransform: 'uppercase'
              }}
            >
              EVALUATION PIPELINE TRACE LOGS
            </span>
            {running && (
              <span
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: 'var(--font-size-micro)',
                  color: 'var(--color-accent)'
                }}
              >
                RUNNING...
              </span>
            )}
          </div>
          <div
            style={{
              padding: '16px',
              fontFamily: 'var(--font-family-mono)',
              fontSize: '11px',
              backgroundColor: '#05070c',
              height: '180px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              textAlign: 'left'
            }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'var(--color-text-disabled)', fontStyle: 'italic' }}>
                &gt; Select an execution scenario on the left to initiate the trace.
              </span>
            ) : (
              logs.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', textTransform: 'none' }}>
                  <span style={{ color: 'var(--color-text-disabled)' }}>&gt;</span>
                  <span style={{ color: l.includes('FAIL') || l.includes('blocked') ? 'var(--color-error)' : l.includes('SUCCESS') || l.includes('passed') ? 'var(--color-success)' : l.includes('WARN') ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                    {l}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Evaluation Output */}
        {result && (
          <Card variant="elevated" padding="md" style={{ borderLeft: `4px solid ${result.decision === 'ALLOW' ? 'var(--color-success)' : result.decision === 'BLOCK' ? 'var(--color-error)' : 'var(--color-accent)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-family-sans)', fontSize: 'var(--font-size-caption)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase' }}>
                GATEWAY FINAL DECISION:
              </span>
              <Badge variant={result.decision === 'ALLOW' ? 'success' : result.decision === 'BLOCK' ? 'error' : 'warning'}>
                {result.decision}
              </Badge>
            </div>
            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-primary)', marginBottom: '12px', textAlign: 'left' }}>
              {result.reason}
            </p>

            {/* Price Drift Interactive resolution */}
            {result.decision === 'REVIEW' && !driftResolved && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
                <Button onClick={resolveDrift} variant="primary" size="sm">
                  ACCEPT drift ₹1,400.00 &amp; RE-MINT CONTRACT
                </Button>
              </div>
            )}

            {/* Payment details */}
            {result.decision === 'ALLOW' && (
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px dashed var(--color-border)',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '11px',
                  color: 'var(--color-success)',
                  textAlign: 'left'
                }}
              >
                ✓ RAZORPAY TEST ORDER CREATED: {result.id === 'vr_drift_resolved' ? 'order_test_rzp_e1e7b1fa' : 'order_test_rzp_9d0eed64'}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};
