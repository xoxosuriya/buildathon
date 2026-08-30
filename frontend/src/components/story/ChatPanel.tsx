import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MIcon } from './MIcon';

interface Message {
  sender: 'assistant' | 'user';
  text: string;
}

interface ChatPanelProps {
  initialScroll?: 'top' | 'bottom';
  animateMessagesIn?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  initialScroll = 'top',
  animateMessagesIn = true
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Welcome to the IntentLock Gateway! I can help you secure your AI agent transactions. What spend parameters would you like to configure first?"
    },
    {
      sender: 'user',
      text: "I want to allow my shopping agent to buy a wireless mouse, but restrict it under ₹1,500."
    },
    {
      sender: 'assistant',
      text: "Configuring intent boundary:\n\nTarget: MOUSE-ERG-01\nLimit: ₹1,500\nParameters: SINGLE-USE, NON-DELEGABLE\n\nThe agent can now propose matching items, but cannot spend beyond these bounds."
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      if (initialScroll === 'bottom' || messages.length > 3) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [messages, initialScroll]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setInputValue('');

    // Trigger canned security verification response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Proposal parsed for verification:
• Item: Wireless Ergonomic Mouse
• Price: ₹1,200.00
• Authority bounds: MAX ₹1,500.00 | SINGLE-USE

[IntentLock Audit]
CHK-01 to CHK-21 validation check success.
21 / 21 checks passed.

DECISION: ALLOW. Payment executes in Razorpay Test Mode.`
        }
      ]);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-neutral-950/60 backdrop-blur-[24px] overflow-hidden text-left">
      
      {/* Header Row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 select-none bg-white/[0.02]">
        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white">
          <MIcon name="auto_awesome" size={14} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-white text-sm font-semibold tracking-tight">IntentLock Agent</span>
          <span className="text-[10px] text-white/40 font-mono tracking-wide mt-0.5">Secure Gateway Simulation</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-hide"
      >
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const innerEl = (
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
              isUser 
                ? 'bg-white/15 text-white/90 border border-white/10 ml-auto rounded-tr-none' 
                : 'bg-white/5 text-white/70 border border-white/5 mr-auto rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          );

          if (animateMessagesIn) {
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={isUser ? 'text-right' : 'text-left'}
              >
                {innerEl}
              </motion.div>
            );
          }

          return (
            <div key={idx} className={isUser ? 'text-right' : 'text-left'}>
              {innerEl}
            </div>
          );
        })}
      </div>

      {/* Input row */}
      <div className="p-3 bg-white/[0.01] border-t border-white/5">
        <div className="liquid-glass rounded-xl flex items-end gap-2 p-2 bg-[#0a0d14]">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask agent to transact..."
            className="flex-1 bg-transparent border-none text-white placeholder-white/20 text-xs px-2 py-1 outline-none resize-none scrollbar-hide max-h-[60px]"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={handleSend}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-black flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <MIcon name="arrow_upward" size={16} />
          </button>
        </div>
      </div>

    </div>
  );
};
