/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Message, Employee, Project } from '../types';
import MessageBubble from './MessageBubble';
import InputBox from './InputBox';
import { Sparkles, Compass, Rocket, Briefcase, Zap, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatContainerProps {
  messages: Message[];
  onSend: (text: string) => void;
  isLoading: boolean;
  employees: Employee[];
  projects: Project[];
  onViewEmployee: (id: string) => void;
  onViewProject: (id: string) => void;
}

export default function ChatContainer({
  messages,
  onSend,
  isLoading,
  employees,
  projects,
  onViewEmployee,
  onViewProject,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  const onboardingCards = [
    {
      title: "Draft Mobile Team",
      desc: "Form a complete React Native and security team for Stellar Mobile Companion.",
      prompt: "I need to build a 4-person team for 'Stellar Mobile Companion' project. Suggest available employees based on required skills.",
      icon: <Rocket className="w-5 h-5 text-teal-600" />,
      color: "from-teal-500/10 to-teal-100/10 hover:border-teal-200"
    },
    {
      title: "Skill Directory Matching",
      desc: "Find available full-stack engineers with React, PostgreSQL, and Node expertise.",
      prompt: "Find all available engineers who have experience with React, TypeScript, and Node.js.",
      icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
      color: "from-indigo-500/10 to-indigo-100/10 hover:border-indigo-200"
    },
    {
      title: "Availability Analytics",
      desc: "Discover who is fully loaded, partially allocated, or 100% available.",
      prompt: "Provide an availability report. Who is 100% available and who is fully allocated?",
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      color: "from-amber-500/10 to-amber-100/10 hover:border-amber-200"
    },
    {
      title: "Fill Project Horizon Slots",
      desc: "Horizon is missing a QA Engineer and Full-Stack lead. Fill those positions.",
      prompt: "Recommend available employees to fill the vacant slots in 'Project Horizon' (requires QA and Senior Full-Stack).",
      icon: <Compass className="w-5 h-5 text-sky-600" />,
      color: "from-sky-500/10 to-sky-100/10 hover:border-sky-200"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden flex-1" id="chat-workspace">
      {/* Scrollable Message viewport */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {messages.length === 0 ? (
          /* Empty / Welcome Onboarding state */
          <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 select-none">
            {/* Logo hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-4 bg-white shadow-xl shadow-teal-600/5 border border-slate-100 rounded-3xl relative">
                <Sparkles className="w-10 h-10 text-teal-600 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to Nova HR workspace</h2>
              <p className="text-sm text-slate-500 max-w-lg mx-auto font-medium leading-relaxed">
                Consult Groq intelligence to draft custom project team assignments, review available skills, and balance allocations from our database of record.
              </p>
            </div>

            {/* Quick Action Bento Grid */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Select a workspace Directive to begin
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {onboardingCards.map((card, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSend(card.prompt)}
                    className={`p-5 rounded-2xl border border-slate-200 hover:border-teal-500 bg-gradient-to-tr ${card.color} hover:bg-white cursor-pointer transition-all shadow-sm hover:shadow-lg active:scale-[0.98] group flex gap-3`}
                  >
                    <div className="p-3 bg-white border border-slate-150 rounded-xl shadow-sm shrink-0 flex items-center justify-center h-11 w-11 group-hover:scale-105 transition-transform">
                      {card.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-600 transition-colors leading-tight mb-1">{card.title}</h4>
                      <p className="text-xs text-slate-500 leading-snug">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Conversation Messages list */
          <div className="space-y-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                employees={employees}
                projects={projects}
                onViewEmployee={onViewEmployee}
                onViewProject={onViewProject}
              />
            ))}

            {/* Simulated chat bubble loader */}
            {isLoading && (
              <div className="flex gap-4 p-4 rounded-2xl w-full max-w-3xl mx-auto bg-white border border-slate-100 shadow-sm animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1 space-y-2 mt-2">
                  <div className="h-3 bg-slate-100 rounded-full w-2/5" />
                  <div className="h-3 bg-slate-100 rounded-full w-4/5" />
                  <div className="h-3 bg-slate-100 rounded-full w-3/5" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area sticked at the bottom */}
      <InputBox onSend={onSend} disabled={isLoading} />
    </div>
  );
}
