/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, Mic, CornerDownLeft } from 'lucide-react';

interface InputBoxProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

const SUGGESTIONS = [
  { text: "List 100% available staff", icon: "🟢" },
  { text: "Staff 'Stellar Mobile Companion' project", icon: "📱" },
  { text: "Match React & Node engineers", icon: "⚛️" },
  { text: "Tell me about Alex Rivera", icon: "👤" }
];

export default function InputBox({ onSend, disabled }: InputBoxProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize the text input box
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3 bg-white border-t border-slate-100 shadow-xl" id="chat-input-wrapper">
      {/* Quick Suggestion Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none scroll-smooth">
        <span className="text-[10px] uppercase font-bold text-slate-400 select-none mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-500 animate-pulse" />
          Prompts:
        </span>
        {SUGGESTIONS.map((sug, index) => (
          <button
            key={index}
            onClick={() => onSend(sug.text)}
            disabled={disabled}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-teal-50/50 hover:border-teal-200 border border-slate-200 rounded-full text-xs text-slate-600 hover:text-teal-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95 shadow-sm"
          >
            <span>{sug.icon}</span>
            <span>{sug.text}</span>
          </button>
        ))}
      </div>

      {/* Actual Message Input Card */}
      <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-teal-500 rounded-2xl p-2 transition-all shadow-inner">
        {/* Attachment button - not yet implemented */}
        <button
          type="button"
          disabled
          className="p-2 text-slate-300 rounded-xl cursor-not-allowed"
          title="Attach assets (coming soon)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Floating Texarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Match engineers, form a team, or explore roster credentials..."
          disabled={disabled}
          className="flex-1 max-h-36 bg-transparent outline-none border-none py-2 px-1 text-slate-800 placeholder-slate-400 text-sm resize-none disabled:opacity-60"
        />

        {/* Dictation button - not yet implemented */}
        <button
          type="button"
          disabled
          className="p-2 text-slate-300 rounded-xl cursor-not-allowed hidden sm:block"
          title="Voice dictation (coming soon)"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Send Action */}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className={`p-2.5 rounded-xl text-white shadow-md flex items-center justify-center transition-all focus:outline-none ${
            input.trim() && !disabled
              ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/10 hover:shadow-teal-600/20 active:scale-[0.95]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
          aria-label="Send query"
        >
          {disabled ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Enter Hint text */}
      <div className="hidden sm:flex justify-between items-center px-1 text-[10px] text-slate-400 font-medium">
        <span>AI matches are based on current database availability ratios.</span>
        <span className="flex items-center gap-0.5">
          Press <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</span> to send, <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Shift + Enter</span> for line breaks.
          <CornerDownLeft className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
}
