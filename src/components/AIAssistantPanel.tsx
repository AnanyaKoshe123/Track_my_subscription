import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, ArrowRight, Lightbulb } from 'lucide-react';
import { Subscription } from '../types';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  currentCurrency: string;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  subscriptions,
  currentCurrency,
}) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Subscription Assistant. Ask me anything about your monthly expenses, upcoming renewals, or ways to optimize your SaaS portfolio."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedPrompts = [
    "How much do I spend monthly?",
    "Where can I cut expenses?",
    "Show upcoming renewals",
    "Compare monthly vs yearly cost"
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: query }];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          subscriptionsContext: {
            currency: currentCurrency,
            count: subscriptions.length,
            subscriptions: subscriptions.map(s => ({
              name: s.service_name,
              plan: s.plan_name,
              amount: s.amount,
              currency: s.currency,
              cycle: s.billing_cycle,
              renewal: s.next_billing_date
            }))
          }
        })
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, I encountered an issue connecting to the AI assistant. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300">
      {/* Header */}
      <div className="p-4 bg-[#172B3A] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7657E8] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI Subscription Assistant</h3>
            <p className="text-[10px] text-white/60">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Prompts */}
      <div className="p-3 bg-gray-50 border-b border-gray-100 flex gap-1.5 overflow-x-auto scrollbar-none">
        {suggestedPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="text-[11px] bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg whitespace-nowrap hover:bg-[#F0EDFF] hover:text-[#7657E8] hover:border-[#7657E8]/30 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
              m.role === 'user' ? 'bg-[#7657E8] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#7657E8]/10 text-[#7657E8] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-gray-100 rounded-2xl text-xs text-gray-500 animate-pulse">
              Thinking about your subscription data...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your subscriptions..."
            className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20"
          />
          <button
            onClick={() => handleSend()}
            className="p-2 rounded-xl bg-[#7657E8] text-white hover:bg-[#6444d4] transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
