/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Conversation, Message, Employee, Project } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/ChatContainer';
import EmployeeProfile from './components/EmployeeProfile';
import ProjectDetail from './components/ProjectDetail';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X, Sparkles } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Directory state is sourced from the backend API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Inspector States (drawer overlays)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Interactive Action Success Banner state
  const [successBanner, setSuccessBanner] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  // Initialize and check health of backend API
  const loadDirectoryData = async () => {
    try {
      const [employeeRes, projectRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/projects'),
      ]);

      if (!employeeRes.ok || !projectRes.ok) {
        throw new Error('Unable to load employee or project data from backend');
      }

      const [employeeData, projectData] = await Promise.all([
        employeeRes.json(),
        projectRes.json(),
      ]);

      setEmployees(employeeData);
      setProjects(projectData);
    } catch (error) {
      console.error('Failed to load directory data from backend:', error);
    }
  };

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error('Backend health check failed');
        const data = await res.json();
        console.log("Backend connection healthy:", data);
        setIsOffline(false);
      } catch (err) {
        console.warn("Backend API offline or unreachable.", err);
        setIsOffline(true);
      }
    };

    checkBackendHealth();
    loadDirectoryData();
  }, []);

  // Load conversations from local storage
  useEffect(() => {
    const saved = localStorage.getItem('hr_teambuilder_chats');
    if (saved) {
      try {
        const parsed: Conversation[] = JSON.parse(saved);
        setConversations(parsed);
        if (parsed.length > 0) {
          setActiveConvId(parsed[0].id);
        }
      } catch (err) {
        console.error("Failed to restore previous discussions", err);
      }
    }
  }, []);

  // Save conversations to local storage
  const saveChats = (newChats: Conversation[]) => {
    setConversations(newChats);
    localStorage.setItem('hr_teambuilder_chats', JSON.stringify(newChats));
  };

  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Staffing Review',
      messages: [],
      createdAt: new Date().toISOString()
    };
    const updated = [newConv, ...conversations];
    saveChats(updated);
    setActiveConvId(newId);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id);
  };

  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter(c => c.id !== id);
    saveChats(filtered);
    if (activeConvId === id) {
      setActiveConvId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to archive all staffing discussions? This cannot be undone.")) {
      saveChats([]);
      setActiveConvId(null);
    }
  };

  // Sends the user's staffing directive to Groq or offline simulations
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    let currentConvId = activeConvId;
    let currentConversations = [...conversations];

    // Auto-create a conversation if none exists
    if (!currentConvId) {
      currentConvId = `chat-${Date.now()}`;
      const newConv: Conversation = {
        id: currentConvId,
        title: text.length > 25 ? `${text.substring(0, 25)}...` : text,
        messages: [],
        createdAt: new Date().toISOString()
      };
      currentConversations = [newConv, ...currentConversations];
      setActiveConvId(currentConvId);
    }

    const activeConv = currentConversations.find(c => c.id === currentConvId);
    if (!activeConv) return;

    // Set first prompt text as thread title if it's currently default
    if (activeConv.messages.length === 0) {
      activeConv.title = text.length > 28 ? `${text.substring(0, 28)}...` : text;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text,
      isUser: true,
      createdAt: new Date().toISOString()
    };

    // Update state immediately for rapid tactile feedback
    activeConv.messages = [...activeConv.messages, userMsg];
    saveChats(currentConversations);
    setIsLoading(true);

    try {
      // API call to Express backend proxy endpoint
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: activeConv.messages.slice(0, -1) // Excluding the new message we just added
        })
      });

      const data = await res.json();

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        text: data.response || "No response received.",
        isUser: false,
        createdAt: new Date().toISOString()
      };

      // Append bot answer
      activeConv.messages = [...activeConv.messages, botMsg];
      saveChats([...currentConversations]);

      // Refresh directory data after AI actions that may add employees or update backend state
      await loadDirectoryData();
    } catch (err: any) {
      console.error("Staffing assistant query failed:", err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        text: `Error connecting to assistant context: ${err.message || 'Server timeout'}. Please verify active server console logs.`,
        isUser: false,
        createdAt: new Date().toISOString()
      };
      activeConv.messages = [...activeConv.messages, errorMsg];
      saveChats([...currentConversations]);
    } finally {
      setIsLoading(false);
    }
  };

  // Inspect drawers
  const handleViewEmployee = (empId: string) => {
    setSelectedProjectId(null); // Close project panel
    setSelectedEmployeeId(empId);
  };

  const handleViewProject = (projId: string) => {
    setSelectedEmployeeId(null); // Close employee panel
    setSelectedProjectId(projId);
  };

  // Interactive feature: Assigns selected employee to a vacant project slot!
  const handleAssignEmployeeToProject = async (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    // Filter projects that have vacancy for this role or any vacancy
    const planningProjects = projects.filter(p => p.status === 'Planning' || p.status === 'In Progress');

    if (planningProjects.length === 0) {
      alert("No active or planning projects have vacancies available currently.");
      return;
    }

    // Select the first project with matching required role or first planning project
    const targetProject = planningProjects.find(p => p.requiredRoles.includes(emp.role) && !p.assignedEmployees.includes(empId)) || planningProjects[0];

    try {
      // Persist the assignment on the backend so it survives a refresh
      const res = await fetch(`/api/projects/${targetProject.id}/assign-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: empId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign employee to project');
      }

      // Pull the authoritative, updated state from the backend
      await loadDirectoryData();

      // Trigger beautiful floating banner confirmation
      setSuccessBanner({
        show: true,
        msg: `Resource Allocation Successful! ${emp.name} is now staffed on "${targetProject.name}".`
      });
    } catch (err: any) {
      console.error("Failed to assign employee to project:", err);
      alert(`Could not assign ${emp.name} to "${targetProject.name}": ${err.message || 'Server error'}`);
    }

    // Close drawers
    setSelectedEmployeeId(null);

    // Auto-dismiss banner
    setTimeout(() => {
      setSuccessBanner({ show: false, msg: '' });
    }, 4500);
  };

  const activeConversation = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800" id="main-app-container">
      {/* Interactive Action success banner */}
      <AnimatePresence>
        {successBanner.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 border border-slate-800 text-teal-400 text-xs font-bold rounded-2xl shadow-xl shadow-slate-950/20"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
            <span className="text-slate-100">{successBanner.msg}</span>
            <button
              onClick={() => setSuccessBanner({ show: false, msg: '' })}
              className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header navbar */}
      <Header onNewChat={handleNewChat} isOffline={isOffline} />

      {/* Main app layout area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left collapsable/directory sidebar */}
        <Sidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearAll={handleClearAll}
          onNewChat={handleNewChat}
          employees={employees}
          projects={projects}
          onViewEmployee={handleViewEmployee}
          onViewProject={handleViewProject}
        />

        {/* Primary Chat Work Area */}
        <ChatContainer
          messages={activeConversation?.messages || []}
          onSend={handleSendMessage}
          isLoading={isLoading}
          employees={employees}
          projects={projects}
          onViewEmployee={handleViewEmployee}
          onViewProject={handleViewProject}
        />
      </div>

      {/* Drawers / Overlays */}
      <EmployeeProfile
        employee={employees.find(e => e.id === selectedEmployeeId) || null}
        onClose={() => setSelectedEmployeeId(null)}
        onAssignToProject={handleAssignEmployeeToProject}
      />

      <ProjectDetail
        project={projects.find(p => p.id === selectedProjectId) || null}
        employees={employees}
        onClose={() => setSelectedProjectId(null)}
        onViewEmployee={handleViewEmployee}
      />
    </div>
  );
}
