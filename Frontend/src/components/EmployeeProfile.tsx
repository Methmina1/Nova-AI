/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Employee } from '../types';
import { Mail, Calendar, Briefcase, Award, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeProfileProps {
  employee: Employee | null;
  onClose: () => void;
  onAssignToProject?: (empId: string) => void;
}

export default function EmployeeProfile({ employee, onClose, onAssignToProject }: EmployeeProfileProps) {
  if (!employee) return null;

  // Determine availability slider colors
  const getAvailabilityColor = (percent: number) => {
    if (percent >= 75) return 'bg-emerald-500 text-emerald-700 border-emerald-200';
    if (percent >= 30) return 'bg-amber-500 text-amber-700 border-amber-200';
    return 'bg-rose-500 text-rose-700 border-rose-200';
  };

  const getAvailabilityBg = (percent: number) => {
    if (percent >= 75) return 'bg-emerald-500';
    if (percent >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden" id="employee-profile-modal">
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
                <Sparkles className="w-5 h-5 text-teal-400" />
                <span className="font-semibold text-sm tracking-wider uppercase">Talent Credentials</span>
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
              {/* Profile Card Intro */}
              <div className="text-center pb-6 border-b border-slate-100">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 text-5xl mb-4 border-4 border-slate-50 shadow-inner">
                  {employee.avatar}
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{employee.name}</h2>
                <p className="text-sm font-medium text-teal-600 mt-1">{employee.role}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mt-3 border border-slate-200">
                  {employee.department}
                </div>
              </div>

              {/* Resource Capacity Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
                  <span>Resource Availability</span>
                  <span className="text-teal-600">{employee.availability}% Capacity</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getAvailabilityBg(employee.availability)}`}
                    style={{ width: `${employee.availability}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Fully Allocated</span>
                  <span className="font-bold">{employee.status}</span>
                  <span>Available</span>
                </div>
              </div>

              {/* Bio Description */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Professional Summary</h3>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{employee.bio}"
                </p>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-4">
                <div className="flex items-center gap-2.5 text-sm">
                  <Award className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Experience</p>
                    <p className="font-semibold text-slate-800">{employee.experienceYears} Years</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Tenure</p>
                    <p className="font-semibold text-slate-800">
                      {new Date(employee.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-sm col-span-2">
                  <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs text-slate-400 font-medium">Internal Email</p>
                    <a href={`mailto:${employee.email}`} className="font-medium text-slate-700 hover:text-teal-600 truncate block transition-colors">
                      {employee.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Skill Badges */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  Primary Skill Set
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {employee.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 text-slate-700 hover:text-teal-700 rounded-lg transition-all shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Engagements */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Assigned Initiatives</h3>
                {employee.projects.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No current projects assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {employee.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-150 bg-white shadow-sm hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-teal-500" />
                          <span className="text-xs font-semibold text-slate-800">{proj}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Footer */}
            {onAssignToProject && employee.availability > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-stretch">
                <button
                  onClick={() => onAssignToProject(employee.id)}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 active:scale-[0.98]"
                >
                  Quick Assign to Active Project
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
