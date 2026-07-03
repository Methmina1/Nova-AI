/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Conversation, Employee, Project } from '../types';
import { MessageSquare, Trash2, Search, User, Briefcase, Plus, FolderHeart, Info, FolderGit2 } from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onNewChat: () => void;
  employees: Employee[];
  projects: Project[];
  onViewEmployee: (empId: string) => void;
  onViewProject: (projId: string) => void;
}

type TabType = 'chats' | 'roster' | 'projects';

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onDeleteConversation,
  onClearAll,
  onNewChat,
  employees,
  projects,
  onViewEmployee,
  onViewProject,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [dataSearchQuery, setDataSearchQuery] = useState('');

  // Filters
  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(dataSearchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(dataSearchQuery.toLowerCase()) ||
    emp.skills.some(s => s.toLowerCase().includes(dataSearchQuery.toLowerCase()))
  );

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(dataSearchQuery.toLowerCase()) ||
    p.techStack.some(t => t.toLowerCase().includes(dataSearchQuery.toLowerCase()))
  );

  // Helper availability dot color
  const getAvailabilityColor = (avail: number) => {
    if (avail >= 75) return 'bg-emerald-500';
    if (avail >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <aside 
      id="sidebar-container"
      className="hidden md:flex flex-col w-80 h-full bg-slate-950 text-slate-200 border-r border-slate-900 select-none flex-shrink-0 overflow-hidden"
    >
      {/* Top Header Segment / "Workspace" selector */}
      <div className="p-4 border-b border-slate-900 bg-slate-950/60">
        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Staffing Chat</span>
        </button>
      </div>

      {/* Tabs selector */}
      <div className="flex border-b border-slate-900 bg-slate-950 px-2 py-1 gap-1">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chats'
              ? 'bg-slate-900 text-white shadow-inner border border-slate-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Conversations</span>
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'roster'
              ? 'bg-slate-900 text-white shadow-inner border border-slate-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Roster</span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'projects'
              ? 'bg-slate-900 text-white shadow-inner border border-slate-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Projects</span>
        </button>
      </div>

      {/* Roster Search bar */}
      <div className="px-3 pt-3">
        {activeTab === 'chats' ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search conversation histories..."
              className="w-full bg-slate-900 border border-slate-900 hover:border-slate-800 focus:border-teal-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={dataSearchQuery}
              onChange={(e) => setDataSearchQuery(e.target.value)}
              placeholder={activeTab === 'roster' ? "Filter skills or names..." : "Filter stacks or project names..."}
              className="w-full bg-slate-900 border border-slate-900 hover:border-slate-800 focus:border-teal-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* CHATS TAB */}
        {activeTab === 'chats' && (
          <>
            {filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-semibold">No discussions matched.</p>
                <p className="text-[10px] mt-1 text-slate-600">Open a new staffing session to consult.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`relative group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white border border-slate-800 shadow-lg'
                        : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {/* Left Active Indicator line */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-teal-500 to-indigo-500 rounded-r-md" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-600'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate leading-snug">{conv.title || 'Staffing Discussion'}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {new Date(conv.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Delete chat button (hidden by default, reveals on hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition-all ml-1.5"
                      title="Archive Chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <>
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-10 text-slate-600">
                <p className="text-xs">No employees found.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Company Directory ({filteredEmployees.length})
                </div>
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => onViewEmployee(emp.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-900/50 cursor-pointer border border-transparent hover:border-slate-900 transition-colors group"
                  >
                    <span className="text-2xl bg-slate-900 p-1 rounded-lg border border-slate-800">{emp.avatar}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-100 group-hover:text-teal-400 transition-colors truncate">{emp.name}</p>
                        <div className={`w-1.5 h-1.5 rounded-full ${getAvailabilityColor(emp.availability)}`} title={`${emp.status}`} />
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{emp.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-10 text-slate-600">
                <p className="text-xs">No initiatives matched.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Project Portfolio ({filteredProjects.length})
                </div>
                {filteredProjects.map((p) => {
                  const getProjectDot = (status: Project['status']) => {
                    if (status === 'Completed') return 'bg-emerald-500';
                    if (status === 'In Progress') return 'bg-teal-500';
                    return 'bg-amber-500';
                  };

                  return (
                    <div
                      key={p.id}
                      onClick={() => onViewProject(p.id)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-slate-900/50 cursor-pointer border border-transparent hover:border-slate-900 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-teal-400 group-hover:border-teal-900 transition-colors">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-100 group-hover:text-teal-400 transition-colors truncate">{p.name}</p>
                          <div className={`w-1.5 h-1.5 rounded-full ${getProjectDot(p.status)}`} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.techStack.slice(0, 3).join(', ')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Utilities segment */}
      {conversations.length > 0 && activeTab === 'chats' && (
        <div className="p-3 border-t border-slate-900 bg-slate-950/80">
          <button
            onClick={onClearAll}
            className="w-full py-2 hover:bg-slate-900 hover:text-rose-400 text-slate-500 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all"
          >
            Archive All Threads
          </button>
        </div>
      )}
    </aside>
  );
}
