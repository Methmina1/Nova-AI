/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, Users, Cpu, ShieldAlert, Sparkles, Database } from 'lucide-react';

interface HeaderProps {
  onNewChat: () => void;
  isOffline: boolean;
}

export default function Header({ onNewChat, isOffline }: HeaderProps) {
  return (
    <header 
      id="app-header"
      className="sticky top-0 z-40 w-full flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm"
    >
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white shadow-md shadow-teal-600/20">
          <Users className="w-5 h-5" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">HR Team Builder Nova</h1>
            <span className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full transition-colors cursor-default border border-slate-200 flex items-center gap-0.5">
              <Database className="w-2.5 h-2.5 text-slate-400" />
              v1.2.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Intelligent Corporate Resource Optimizer</p>
        </div>
      </div>

      {/* Model & Control Actions */}
      <div className="flex items-center gap-3">
        {/* Model Engine Indicator Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50/50 shadow-inner">
          {isOffline ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">AI Mode</p>
                <p className="text-xs text-amber-600 font-bold leading-tight">Offline Simulator</p>
              </div>
            </>
          ) : (
            <>
              <Cpu className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">AI Engine</p>
                <p className="text-xs text-teal-600 font-bold leading-tight flex items-center gap-0.5">
                  Groq
                  <Sparkles className="w-2.5 h-2.5 text-teal-400" />
                </p>
              </div>
            </>
          )}
        </div>

        {/* Action Button: New Chat */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-slate-900/10 active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>
    </header>
  );
}
