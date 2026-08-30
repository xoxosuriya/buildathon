import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Ticket,
  CreditCard,
  PenTool,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sliders,
  DollarSign,
  Package,
  Store,
  RefreshCw,
  Cpu,
  AlertCircle,
} from 'lucide-react';

type IntentCategory = 'buy' | 'book' | 'pay' | 'custom';
type DemoStep = 'config' | 'evaluating' | 'result';
type AttackType = 'none' | 'price' | 'product' | 'merchant' | 'replay';

// Helper to parse numeric values from currency string (e.g. "₹1,500" -> 1500)
function parseCurrencyNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper to format currency numbers to Indian Rupee (e.g. 1500 -> "₹1,500")
function formatCurrency(val: number): string {
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

// Simple deterministic parser for natural language custom intent
interface ParsedCustomIntent {
  success: boolean;
  item: string;
  maxAmount: number;
  target: string;
}

function parseCustomIntentText(text: string): ParsedCustomIntent {
  const trimmed = text.trim();
  if (!trimmed) return { success: false, item: '', maxAmount: 0, target: '' };

  // Match currency pattern like ₹70,000 or 70000 or ₹ 70000
  const amountMatch = trimmed.match(/(?:₹|\bRs\.?|\bINR\s*)\s*([\d,]+)|([\d,]+)\s*(?:rupees|INR)/i) || 
                      trimmed.match(/(?:below|under|up to|less than|max|budget of)\s*₹?\s*([\d,]+)/i);

  let maxAmount = 0;
  if (amountMatch) {
    const rawNum = amountMatch[1] || amountMatch[2];
    maxAmount = parseCurrencyNumber(rawNum);
  }

  // Match common actions & items
  let item = '';
  let target = 'Authorized Merchant';

  const buyMatch = trimmed.match(/(?:buy|purchase|order|get)\s+(?:a|an|the)?\s*([a-zA-Z0-9\s]+?)(?=\s+(?:below|under|from|for|up to|₹|\d|$))/i);
  const bookMatch = trimmed.match(/(?:book|reserve)\s+(?:a|an|the)?\s*([a-zA-Z0-9\s]+?)(?=\s+(?:below|under|for|up to|₹|\d|$))/i);
  const payMatch = trimmed.match(/(?:pay|transfer|send)\s+(?:to\s+)?([a-zA-Z0-9\s]+?)(?=\s+(?:up to|below|under|for|₹|\d|$))/i);

  if (buyMatch && buyMatch[1]) {
    item = buyMatch[1].trim();
  } else if (bookMatch && bookMatch[1]) {
    item = bookMatch[1].trim();
    target = 'Verified Booking Agent';
  } else if (payMatch && payMatch[1]) {
    item = `Payment to ${payMatch[1].trim()}`;
    target = payMatch[1].trim();
  }

  if (item && maxAmount > 0) {
    // Capitalize first letter
    item = item.charAt(0).toUpperCase() + item.slice(1);
    return { success: true, item, maxAmount, target };
  }

  return { success: false, item: '', maxAmount: 0, target: '' };
}

export function InteractiveDemoSection() {
  const [category, setCategory] = useState<IntentCategory>('buy');
  const [step, setStep] = useState<DemoStep>('config');
  const [activeAttack, setActiveAttack] = useState<AttackType>('none');

  // Input states per category (clean isolation)
  const [buyState, setBuyState] = useState({
    product: 'Wireless Mouse',
    maxBudget: '₹1,500',
    merchant: 'Authorized Merchant',
  });

  const [bookState, setBookState] = useState({
    item: 'Hotel',
    maxBudget: '₹2,000',
    classType: 'Economy',
    target: 'Verified Booking',
  });

  const [payState, setPayState] = useState({
    payee: 'Cisco',
    maxBudget: '₹5,000',
    frequency: 'One-time authorization',
  });

  const [customText, setCustomText] = useState('Buy a laptop below ₹70,000');

  // Handle Option Switching with complete fresh state cleanup
  const handleCategorySwitch = (newCategory: IntentCategory) => {
    setCategory(newCategory);
    setStep('config');
    setActiveAttack('none');
  };

  const handleReset = () => {
    setCategory('buy');
    setStep('config');
    setActiveAttack('none');
    setBuyState({
      product: 'Wireless Mouse',
      maxBudget: '₹1,500',
      merchant: 'Authorized Merchant',
    });
    setBookState({
      item: 'Hotel',
      maxBudget: '₹2,000',
      classType: 'Economy',
      target: 'Verified Booking',
    });
    setPayState({
      payee: 'Cisco',
      maxBudget: '₹5,000',
      frequency: 'One-time authorization',
    });
    setCustomText('Buy a laptop below ₹70,000');
  };

  const handleCreateIntent = () => {
    setStep('evaluating');
    setActiveAttack('none');
    setTimeout(() => {
      setStep('result');
    }, 1000);
  };

  const triggerAttack = (attack: AttackType) => {
    setStep('evaluating');
    setTimeout(() => {
      setActiveAttack(attack);
      setStep('result');
    }, 550);
  };

  // ── SINGLE SOURCE OF TRUTH EVALUATION ENGINE ──
  const evaluation = useMemo(() => {
    if (category === 'buy') {
      const maxLimit = parseCurrencyNumber(buyState.maxBudget) || 1500;
      const baseProduct = buyState.product || 'Wireless Mouse';
      const baseMerchant = buyState.merchant || 'Authorized Merchant';
      const userIntentSummary = {
        label: 'Purchase Intent',
        item: baseProduct,
        maxAmount: formatCurrency(maxLimit),
        target: baseMerchant,
        frequency: 'One-time authorization',
      };

      if (activeAttack === 'none') {
        const proposedCost = Math.round(maxLimit * 0.999);
        return {
          userIntentSummary,
          proposedAction: {
            item: baseProduct,
            amount: formatCurrency(proposedCost),
            target: baseMerchant,
          },
          status: 'AUTHORIZED' as const,
          checks: [
            { label: 'Intent matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Target valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'price') {
        const excessiveCost = Math.round(maxLimit * 1.233);
        return {
          userIntentSummary,
          proposedAction: {
            item: baseProduct,
            amount: formatCurrency(excessiveCost),
            target: baseMerchant,
          },
          status: 'BLOCKED' as const,
          reason: `Requested amount (${formatCurrency(excessiveCost)}) exceeds the authorized spending limit (${formatCurrency(maxLimit)}).`,
          checks: [
            { label: 'Intent matched', passed: true },
            { label: 'Limit verified', passed: false },
            { label: 'Target valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'product') {
        const wrongProduct = baseProduct.toLowerCase().includes('laptop') ? 'Gaming Console' : 'Laptop';
        const proposedCost = Math.round(maxLimit * 0.99);
        return {
          userIntentSummary,
          proposedAction: {
            item: wrongProduct,
            amount: formatCurrency(proposedCost),
            target: baseMerchant,
          },
          status: 'BLOCKED' as const,
          reason: `Proposed action '${wrongProduct}' does not match the authorized intent '${baseProduct}'.`,
          checks: [
            { label: 'Intent matched', passed: false },
            { label: 'Limit verified', passed: true },
            { label: 'Target valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'merchant') {
        const proposedCost = Math.round(maxLimit * 0.99);
        return {
          userIntentSummary,
          proposedAction: {
            item: baseProduct,
            amount: formatCurrency(proposedCost),
            target: 'Unverified Third-Party Marketplace',
          },
          status: 'BLOCKED' as const,
          reason: `Target merchant 'Unverified Third-Party Marketplace' is outside the authorized scope.`,
          checks: [
            { label: 'Intent matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Target valid', passed: false },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else {
        // Replay Attack
        const proposedCost = Math.round(maxLimit * 0.99);
        return {
          userIntentSummary,
          proposedAction: {
            item: `${baseProduct} (Replay Attempt)`,
            amount: formatCurrency(proposedCost),
            target: baseMerchant,
          },
          status: 'BLOCKED' as const,
          reason: `Authorization token has already been consumed by a previous transaction.`,
          checks: [
            { label: 'Intent matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Target valid', passed: true },
            { label: 'Token fresh', passed: false },
          ],
        };
      }
    }

    if (category === 'book') {
      const maxLimit = parseCurrencyNumber(bookState.maxBudget) || 2000;
      const baseItem = bookState.item || 'Hotel';
      const baseTarget = bookState.target || 'Verified Booking';
      const userIntentSummary = {
        label: 'Booking Intent',
        item: `${baseItem} (${bookState.classType})`,
        maxAmount: formatCurrency(maxLimit),
        target: baseTarget,
        frequency: 'One-time reservation',
      };

      if (activeAttack === 'none') {
        const proposedCost = Math.round(maxLimit * 0.925);
        return {
          userIntentSummary,
          proposedAction: {
            item: `${baseItem} (${bookState.classType})`,
            amount: formatCurrency(proposedCost),
            target: baseTarget,
          },
          status: 'AUTHORIZED' as const,
          checks: [
            { label: 'Booking matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Class valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'price') {
        const excessiveCost = Math.round(maxLimit * 1.25);
        return {
          userIntentSummary,
          proposedAction: {
            item: `${baseItem} (${bookState.classType})`,
            amount: formatCurrency(excessiveCost),
            target: baseTarget,
          },
          status: 'BLOCKED' as const,
          reason: `Requested amount (${formatCurrency(excessiveCost)}) exceeds the authorized limit (${formatCurrency(maxLimit)}).`,
          checks: [
            { label: 'Booking matched', passed: true },
            { label: 'Limit verified', passed: false },
            { label: 'Class valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'product') {
        const wrongItem = 'First Class Flight Ticket';
        const proposedCost = Math.round(maxLimit * 0.95);
        return {
          userIntentSummary,
          proposedAction: {
            item: wrongItem,
            amount: formatCurrency(proposedCost),
            target: baseTarget,
          },
          status: 'BLOCKED' as const,
          reason: `Proposed booking '${wrongItem}' does not match the authorized intent '${baseItem}'.`,
          checks: [
            { label: 'Booking matched', passed: false },
            { label: 'Limit verified', passed: true },
            { label: 'Class valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'merchant') {
        const proposedCost = Math.round(maxLimit * 0.95);
        return {
          userIntentSummary,
          proposedAction: {
            item: `${baseItem} (${bookState.classType})`,
            amount: formatCurrency(proposedCost),
            target: 'Unverified Booking Agent',
          },
          status: 'BLOCKED' as const,
          reason: `Target booking agent 'Unverified Booking Agent' is outside the authorized scope.`,
          checks: [
            { label: 'Booking matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Target valid', passed: false },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else {
        const proposedCost = Math.round(maxLimit * 0.95);
        return {
          userIntentSummary,
          proposedAction: {
            item: `${baseItem} (Replay Attempt)`,
            amount: formatCurrency(proposedCost),
            target: baseTarget,
          },
          status: 'BLOCKED' as const,
          reason: `Authorization token has already been consumed.`,
          checks: [
            { label: 'Booking matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Token fresh', passed: false },
          ],
        };
      }
    }

    if (category === 'pay') {
      const maxLimit = parseCurrencyNumber(payState.maxBudget) || 5000;
      const basePayee = payState.payee || 'Cisco';
      const userIntentSummary = {
        label: 'Payment Intent',
        item: `Payment to ${basePayee}`,
        maxAmount: formatCurrency(maxLimit),
        target: basePayee,
        frequency: payState.frequency,
      };

      if (activeAttack === 'none') {
        const proposedCost = Math.round(maxLimit * 0.9);
        return {
          userIntentSummary,
          proposedAction: {
            item: `Payment to ${basePayee}`,
            amount: formatCurrency(proposedCost),
            target: 'Direct Wire',
          },
          status: 'AUTHORIZED' as const,
          checks: [
            { label: 'Payee matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Frequency valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'price') {
        const excessiveCost = Math.round(maxLimit * 1.24);
        return {
          userIntentSummary,
          proposedAction: {
            item: `Payment to ${basePayee}`,
            amount: formatCurrency(excessiveCost),
            target: 'Direct Wire',
          },
          status: 'BLOCKED' as const,
          reason: `Requested payment (${formatCurrency(excessiveCost)}) exceeds authorized limit (${formatCurrency(maxLimit)}).`,
          checks: [
            { label: 'Payee matched', passed: true },
            { label: 'Limit verified', passed: false },
            { label: 'Frequency valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'product') {
        const wrongPayee = 'Oracle';
        const proposedCost = Math.round(maxLimit * 0.9);
        return {
          userIntentSummary,
          proposedAction: {
            item: `Payment to ${wrongPayee}`,
            amount: formatCurrency(proposedCost),
            target: 'Direct Wire',
          },
          status: 'BLOCKED' as const,
          reason: `Proposed payee '${wrongPayee}' does not match authorized payee '${basePayee}'.`,
          checks: [
            { label: 'Payee matched', passed: false },
            { label: 'Limit verified', passed: true },
            { label: 'Frequency valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else if (activeAttack === 'merchant') {
        const proposedCost = Math.round(maxLimit * 0.9);
        return {
          userIntentSummary,
          proposedAction: {
            item: `Payment to ${basePayee}`,
            amount: formatCurrency(proposedCost),
            target: 'Unverified Wire Relay',
          },
          status: 'BLOCKED' as const,
          reason: `Payment relay 'Unverified Wire Relay' is outside the authorized scope.`,
          checks: [
            { label: 'Payee matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Target valid', passed: false },
            { label: 'Scope bound', passed: true },
          ],
        };
      } else {
        const proposedCost = Math.round(maxLimit * 0.9);
        return {
          userIntentSummary,
          proposedAction: {
            item: `Duplicate Payment to ${basePayee}`,
            amount: formatCurrency(proposedCost),
            target: 'Direct Wire',
          },
          status: 'BLOCKED' as const,
          reason: `Authorization token has already been consumed.`,
          checks: [
            { label: 'Payee matched', passed: true },
            { label: 'Limit verified', passed: true },
            { label: 'Token fresh', passed: false },
          ],
        };
      }
    }

    // Category === 'custom'
    const parsed = parseCustomIntentText(customText);
    if (!parsed.success) {
      return {
        userIntentSummary: {
          label: 'Custom Intent',
          item: customText || 'Unspecified Intent',
          maxAmount: 'Unspecified',
          target: 'Unspecified',
          frequency: 'One-time authorization',
        },
        proposedAction: {
          item: 'Pending Evaluation',
          amount: '₹0',
          target: 'Unspecified',
        },
        status: 'REQUIRES_INFO' as const,
        reason: 'Intent requires additional information (such as item and maximum amount) before an action can be evaluated.',
        checks: [],
      };
    }

    const maxLimit = parsed.maxAmount;
    const baseItem = parsed.item;
    const baseTarget = parsed.target;

    const userIntentSummary = {
      label: 'Natural Language Intent',
      item: baseItem,
      maxAmount: formatCurrency(maxLimit),
      target: baseTarget,
      frequency: 'One-time authorization',
    };

    if (activeAttack === 'none') {
      const proposedCost = Math.round(maxLimit * 0.978);
      return {
        userIntentSummary,
        proposedAction: {
          item: baseItem,
          amount: formatCurrency(proposedCost),
          target: baseTarget,
        },
        status: 'AUTHORIZED' as const,
        checks: [
          { label: 'Intent matched', passed: true },
          { label: 'Amount within limit', passed: true },
          { label: 'Target valid', passed: true },
          { label: 'Scope bound', passed: true },
        ],
      };
    } else if (activeAttack === 'price') {
      const excessiveCost = Math.round(maxLimit * 1.25);
      return {
        userIntentSummary,
        proposedAction: {
          item: baseItem,
          amount: formatCurrency(excessiveCost),
          target: baseTarget,
        },
        status: 'BLOCKED' as const,
        reason: `Requested amount (${formatCurrency(excessiveCost)}) exceeds the authorized spending limit (${formatCurrency(maxLimit)}).`,
        checks: [
          { label: 'Intent matched', passed: true },
          { label: 'Amount within limit', passed: false },
          { label: 'Target valid', passed: true },
          { label: 'Scope bound', passed: true },
        ],
      };
    } else if (activeAttack === 'product') {
        const wrongItem = baseItem.toLowerCase().includes('laptop') ? 'Luxury Watch' : 'Server Rack';
        const proposedCost = Math.round(maxLimit * 0.95);
        return {
          userIntentSummary,
          proposedAction: {
            item: wrongItem,
            amount: formatCurrency(proposedCost),
            target: baseTarget,
          },
          status: 'BLOCKED' as const,
          reason: `Requested action '${wrongItem}' does not match the authorized intent '${baseItem}'.`,
          checks: [
            { label: 'Intent matched', passed: false },
            { label: 'Amount within limit', passed: true },
            { label: 'Target valid', passed: true },
            { label: 'Scope bound', passed: true },
          ],
        };
    } else if (activeAttack === 'merchant') {
      const proposedCost = Math.round(maxLimit * 0.95);
      return {
        userIntentSummary,
        proposedAction: {
          item: baseItem,
          amount: formatCurrency(proposedCost),
          target: 'Unverified Vendor',
        },
        status: 'BLOCKED' as const,
        reason: `Target vendor 'Unverified Vendor' is outside the authorized scope.`,
        checks: [
          { label: 'Intent matched', passed: true },
          { label: 'Amount within limit', passed: true },
          { label: 'Target valid', passed: false },
          { label: 'Scope bound', passed: true },
        ],
      };
    } else {
      const proposedCost = Math.round(maxLimit * 0.95);
      return {
        userIntentSummary,
        proposedAction: {
          item: `${baseItem} (Replay Attempt)`,
          amount: formatCurrency(proposedCost),
          target: baseTarget,
        },
        status: 'BLOCKED' as const,
        reason: `Authorization token has already been consumed.`,
        checks: [
          { label: 'Intent matched', passed: true },
          { label: 'Amount within limit', passed: true },
          { label: 'Token fresh', passed: false },
        ],
      };
    }
  }, [category, buyState, bookState, payState, customText, activeAttack]);

  return (
    <section
      id="demo"
      className="relative w-full bg-[#000000] text-white font-sans antialiased px-4 sm:px-6 md:px-10 lg:px-14 py-20 sm:py-24 md:py-28 selection:bg-white/20 overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
        
        {/* ── SECTION HEADER ── */}
        <p className="text-xs sm:text-sm font-medium tracking-[0.22em] text-white/55 uppercase mb-3 font-mono">
          TRY INTENTLOCK
        </p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] leading-[1.12] font-light tracking-tight text-white mb-4 max-w-3xl"
        >
          Define what your AI agent is allowed to do.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base sm:text-lg text-white/60 font-normal mb-8 sm:mb-10 max-w-xl"
        >
          What would you like your AI agent to do?
        </motion.p>

        {/* ── ELEGANT INTENT SELECTION PILLS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2.5 sm:gap-3.5 mb-10 w-full max-w-2xl"
        >
          <button
            onClick={() => handleCategorySwitch('buy')}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'buy'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4 stroke-[1.8]" />
            <span>Buy something</span>
          </button>

          <button
            onClick={() => handleCategorySwitch('book')}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'book'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <Ticket className="h-4 w-4 stroke-[1.8]" />
            <span>Book something</span>
          </button>

          <button
            onClick={() => handleCategorySwitch('pay')}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'pay'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <CreditCard className="h-4 w-4 stroke-[1.8]" />
            <span>Make a payment</span>
          </button>

          <button
            onClick={() => handleCategorySwitch('custom')}
            className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2.5 cursor-pointer border ${
              category === 'custom'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                : 'liquid-glass text-white/70 border-white/10 hover:border-white/30 hover:text-white'
            }`}
          >
            <PenTool className="h-4 w-4 stroke-[1.8]" />
            <span>Custom intent</span>
          </button>
        </motion.div>

        {/* ── MAIN INTERACTIVE CONTAINER ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-3xl rounded-3xl bg-[#0d0d0d] border border-white/10 noise-overlay p-6 sm:p-8 md:p-10 text-left relative overflow-hidden shadow-2xl"
        >
          <AnimatePresence mode="wait">
            
            {/* ── STATE 1: INTENT CONFIGURATION FORM ── */}
            {step === 'config' && (
              <motion.div
                key={`config-${category}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5 text-xs tracking-[0.2em] text-white/60 uppercase font-mono">
                    <Sliders className="h-3.5 w-3.5 text-white/70" />
                    <span>INTENT CONFIGURATION</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/40">STEP 1 OF 2</span>
                </div>

                {/* Progressive Disclosure Fields based on Category */}
                {category === 'buy' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        What should it buy?
                      </label>
                      <input
                        type="text"
                        value={buyState.product}
                        onChange={(e) => setBuyState({ ...buyState, product: e.target.value })}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                        placeholder="e.g. Wireless Mouse"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Maximum budget?
                        </label>
                        <input
                          type="text"
                          value={buyState.maxBudget}
                          onChange={(e) => setBuyState({ ...buyState, maxBudget: e.target.value })}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                          placeholder="e.g. ₹1,500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Where can it buy?
                        </label>
                        <div className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 font-sans flex items-center justify-between">
                          <span>{buyState.merchant}</span>
                          <CheckCircle2 className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === 'book' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        What should it book?
                      </label>
                      <input
                        type="text"
                        value={bookState.item}
                        onChange={(e) => setBookState({ ...bookState, item: e.target.value })}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                        placeholder="e.g. Hotel"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Maximum budget?
                        </label>
                        <input
                          type="text"
                          value={bookState.maxBudget}
                          onChange={(e) => setBookState({ ...bookState, maxBudget: e.target.value })}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                          placeholder="e.g. ₹2,000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Class
                        </label>
                        <div className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 font-sans flex items-center justify-between">
                          <span>{bookState.classType}</span>
                          <CheckCircle2 className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === 'pay' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        Payee Name
                      </label>
                      <input
                        type="text"
                        value={payState.payee}
                        onChange={(e) => setPayState({ ...payState, payee: e.target.value })}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                        placeholder="e.g. Cisco"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Maximum limit?
                        </label>
                        <input
                          type="text"
                          value={payState.maxBudget}
                          onChange={(e) => setPayState({ ...payState, maxBudget: e.target.value })}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans"
                          placeholder="e.g. ₹5,000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                          Authorization Frequency
                        </label>
                        <div className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 font-sans flex items-center justify-between">
                          <span>{payState.frequency}</span>
                          <CheckCircle2 className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {category === 'custom' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-2">
                        Describe what your agent is allowed to do
                      </label>
                      <textarea
                        rows={3}
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-colors font-sans resize-none leading-relaxed"
                        placeholder="e.g. Buy a laptop below ₹70,000"
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCreateIntent}
                    className="liquid-glass rounded-full px-7 py-3 text-sm font-medium tracking-wide text-white bg-white/10 hover:bg-white/20 transition-all duration-300 flex items-center gap-2 cursor-pointer border border-white/20 shadow-lg"
                  >
                    <span>{category === 'custom' ? 'Continue →' : 'Create Intent →'}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STATE 2: EVALUATING ANIMATION ── */}
            {step === 'evaluating' && (
              <motion.div
                key="evaluating-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="py-12 flex flex-col items-center text-center space-y-4"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <Cpu className="h-5 w-5 text-white/80 absolute" />
                </div>
                <p className="text-sm font-mono tracking-wider text-white/70 uppercase">
                  INTENTLOCK EVALUATING AUTHORIZATION...
                </p>
              </motion.div>
            )}

            {/* ── STATE 3: VERIFICATION SEQUENCE & SECURITY RESULTS ── */}
            {step === 'result' && (
              <motion.div
                key="result-state"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-white/60 uppercase font-mono">
                    <Sparkles className="h-3.5 w-3.5 text-white/70" />
                    <span>ENFORCEMENT AUDIT EVALUATION</span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>RESET</span>
                  </button>
                </div>

                {/* Case: REQUIRES INFO (For unparseable custom intent) */}
                {evaluation.status === 'REQUIRES_INFO' ? (
                  <div className="space-y-5">
                    <div className="bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-white/45 uppercase tracking-wider">
                        <span>INTENT RECEIVED</span>
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="text-white/90 italic font-sans text-sm">
                        "{customText}"
                      </div>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 text-amber-200/90 font-mono text-xs space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold uppercase tracking-wider text-xs">
                        <AlertCircle className="h-4 w-4" />
                        <span>MORE INFORMATION REQUIRED</span>
                      </div>
                      <p className="leading-relaxed font-sans text-xs sm:text-sm">
                        {evaluation.reason}
                      </p>
                      <p className="text-[11px] text-amber-400/80 pt-1">
                        Tip: Specify an item name and maximum amount (e.g. "Buy a laptop below ₹70,000").
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setStep('config')}
                        className="liquid-glass rounded-full px-6 py-2.5 text-xs font-mono text-white/90 hover:text-white cursor-pointer border border-white/20"
                      >
                        ← Edit Natural Language Intent
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Compact Sequential Flow: USER INTENT -> AI AGENT -> PROPOSED ACTION -> INTENTLOCK */
                  <div className="space-y-3">
                    
                    {/* 1. USER INTENT SUMMARY */}
                    <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 font-mono text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/45 uppercase tracking-wider">
                        <span>USER AUTHORIZED INTENT</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-white/50" />
                      </div>
                      <div className="text-white/90 font-normal leading-relaxed">
                        {category === 'custom' ? (
                          <span className="italic font-sans text-xs">"{customText}"</span>
                        ) : (
                          <>
                            <span className="text-white/50">Item:</span> {evaluation.userIntentSummary.item} |{' '}
                            <span className="text-white/50">Max:</span> {evaluation.userIntentSummary.maxAmount} |{' '}
                            <span className="text-white/50">Target:</span> {evaluation.userIntentSummary.target}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="h-4 w-4 text-white/30 rotate-90" />
                    </div>

                    {/* 2. PROPOSED ACTION (Strictly Matches Intent & Active Attack) */}
                    <div className="bg-black/60 border border-white/10 rounded-xl p-3.5 font-mono text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-white/45 uppercase tracking-wider">
                        <span>AI AGENT PROPOSED ACTION</span>
                        <Cpu className="h-3.5 w-3.5 text-white/50" />
                      </div>
                      <div className="text-white/90 font-normal flex items-center justify-between">
                        <span>
                          {evaluation.proposedAction.item} · {evaluation.proposedAction.amount} · {evaluation.proposedAction.target}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="h-4 w-4 text-white/30 rotate-90" />
                    </div>

                    {/* 3. INTENTLOCK EVALUATION & FINAL DECISION */}
                    <div
                      className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
                        evaluation.status === 'AUTHORIZED'
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-mono text-xs tracking-wider uppercase text-white/70">
                          {evaluation.status === 'AUTHORIZED' ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ShieldAlert className="h-4 w-4 text-rose-400" />
                          )}
                          <span>INTENTLOCK EVALUATION RESULT</span>
                        </div>

                        {/* Status Badge */}
                        {evaluation.status === 'AUTHORIZED' ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3.5 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>AUTHORIZED</span>
                          </div>
                        ) : (
                          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3.5 py-1 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>BLOCKED</span>
                          </div>
                        )}
                      </div>

                      {/* Checkmarks / Rejection Reason */}
                      {evaluation.status === 'AUTHORIZED' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-emerald-300/90 pt-1">
                          {evaluation.checks.map((check, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                              <span>{check.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5 font-mono text-xs text-rose-200/90 pt-1">
                          <p>
                            ✕ <span className="font-semibold">Security Enforcement:</span> {evaluation.reason}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ── SECURITY HOOK / TEST AUTHORIZATION INTERACTION ── */}
                {evaluation.status !== 'REQUIRES_INFO' && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                        Test the Authorization Boundary:
                      </span>
                      {activeAttack !== 'none' && (
                        <button
                          onClick={() => triggerAttack('none')}
                          className="text-xs font-mono text-emerald-400 hover:underline cursor-pointer text-left sm:text-right"
                        >
                          ← Return to Authorized State
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => triggerAttack('price')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                          activeAttack === 'price'
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <DollarSign className="h-3 w-3" />
                        <span>Increase price</span>
                      </button>

                      <button
                        onClick={() => triggerAttack('product')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                          activeAttack === 'product'
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        <span>Change product</span>
                      </button>

                      <button
                        onClick={() => triggerAttack('merchant')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                          activeAttack === 'merchant'
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Store className="h-3 w-3" />
                        <span>Change merchant</span>
                      </button>

                      <button
                        onClick={() => triggerAttack('replay')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border flex items-center gap-1.5 ${
                          activeAttack === 'replay'
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Replay transaction</span>
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
}
