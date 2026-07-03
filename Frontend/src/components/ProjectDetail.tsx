/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project, Employee } from '../types';
import { DollarSign, FolderGit2, CheckCircle2, AlertCircle, X, Users, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectDetailProps {
  project: Project | null;
  employees: Employee[];
  onClose: () => void;
  onViewEmployee: (empId: string) => void;
}

export default function ProjectDetail({ project, employees, onClose, onViewEmployee }: ProjectDetailProps) {
  if (!project) return null;

  // Find all assigned employee details
  const assignedPeople = employees.filter(emp => project.assignedEmployees.includes(emp.id));

  // Determine status styling
  const getStatusStyle = (status: Project['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Delayed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200'; // Planning
    }
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Delayed':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Compass className="w-4 h-4 text-teal-500 animate-spin-slow" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden" id="project-detail-modal">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        />

        {/* Panel Container */}
        <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-100"
          >
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-teal-400" />
                <span className="font-semibold text-sm tracking-wider uppercase">Project Portfolio</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Introduction */}
              <div>
                <div className="flex justify-between items-start gap-4">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{project.name}</h2>
                  <div className={`flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span>{project.status}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-1 font-mono text-[11px] uppercase tracking-wider">PROJECT ID: {project.id}</p>
                <p className="text-sm text-slate-600 mt-4 leading-relaxed">{project.description}</p>
              </div>

              {/* High-level attributes */}
              <div className="grid grid-cols-1 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2.5 text-sm">
                  <DollarSign className="w-5 h-5 text-teal-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Budget Allocation</p>
                    <p className="font-bold text-slate-800 text-xs">{project.budget}</p>
                  </div>
                </div>
              </div>

              {/* Technology Stack */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Technical Stack</h3>
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600 rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Roster & Role requirements */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  Required Roster Slots ({project.assignedEmployees.length} / {project.requiredRoles.length})
                </h3>
                <div className="space-y-2">
                  {project.requiredRoles.map((role, idx) => {
                    // Try to see if an assigned person matches this role
                    const matchingAssignee = assignedPeople.find(p => p.role === role);

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                          matchingAssignee 
                            ? 'bg-emerald-50/20 border-emerald-100' 
                            : 'bg-slate-50/50 border-slate-150 border-dashed'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{role}</p>
                          {matchingAssignee ? (
                            <button
                              onClick={() => onViewEmployee(matchingAssignee.id)}
                              className="text-[10px] text-teal-600 font-semibold hover:underline mt-0.5 text-left flex items-center gap-1"
                            >
                              <span>{matchingAssignee.avatar} Filled by {matchingAssignee.name}</span>
                            </button>
                          ) : (
                            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠️ Vacant / Staffing Requested</p>
                          )}
                        </div>
                        {matchingAssignee ? (
                          <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px]">✓</span>
                        ) : (
                          <span className="w-4.5 h-4.5 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-[9px] font-bold">+</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Allocated Team List */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-slate-800">Assigned Team Members</h3>
                {assignedPeople.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                    No resources are currently allocated to this project. Ask HR Team Builder AI to suggest a staffing match.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedPeople.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => onViewEmployee(emp.id)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <span className="text-3xl bg-slate-50 p-1.5 rounded-lg border border-slate-100 group-hover:bg-teal-50 transition-colors">{emp.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-600 transition-colors">{emp.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium truncate">{emp.role}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 font-bold group-hover:text-teal-600 uppercase pr-1">
                          View →
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
