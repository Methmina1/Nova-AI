/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Message, Employee, Project } from '../types';
import { User, Sparkles, FolderGit2, Calendar, Users, Eye, Sparkle } from 'lucide-react';
import { motion } from 'motion/react';

interface MessageBubbleProps {
  key?: string;
  message: Message;
  employees: Employee[];
  projects: Project[];
  onViewEmployee: (empId: string) => void;
  onViewProject: (projId: string) => void;
}

function isTableRowLine(line: string) {
  return line.includes('|') && line.split('|').length >= 2;
}

function isTableSeparatorLine(line: string) {
  return /^\s*\|?\s*[:\-]+(?:\s*\|\s*[:\-]+)+\s*\|?\s*$/.test(line);
}

function parseTableCells(line: string) {
  const cells = line.split('|').map((cell) => cell.trim());
  if (line.trim().startsWith('|')) {
    if (cells[0] === '') cells.shift();
  }
  if (line.trim().endsWith('|')) {
    if (cells[cells.length - 1] === '') cells.pop();
  }
  return cells;
}

function renderTable(headerLine: string, rows: string[], key: string) {
  const headerCells = parseTableCells(headerLine);
  const bodyRows = rows.map((row) => parseTableCells(row));

  return (
    <div key={key} className="overflow-x-auto my-4 rounded-2xl border border-slate-200 bg-slate-50">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            {headerCells.map((cell, index) => (
              <th
                key={`th-${index}`}
                className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800"
              >
                {replaceBoldText(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((rowCells, rowIndex) => (
            <tr
              key={`tr-${rowIndex}`}
              className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
            >
              {rowCells.map((cell, cellIndex) => (
                <td key={`td-${rowIndex}-${cellIndex}`} className="border-b border-slate-200 px-3 py-2 text-slate-700">
                  {replaceBoldText(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Custom parser to split text into beautiful styled tags (handling headers, lists, tables, and bold text)
function parseMessageText(text: string) {
  // Check if there are any JSON talent recommendation blocks and remove them from display
  let cleanText = text;
  const jsonBlockRegex = /```json-talent-recommendation[\s\S]*?```/g;
  cleanText = text.replace(jsonBlockRegex, '').trim();

  const lines = cleanText.split('\n');
  const elements: React.ReactNode[] = [];

  let inBulletList = false;
  let currentListItems: React.ReactNode[] = [];

  const flushList = (key: string) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={key} className="list-disc pl-5 my-2 space-y-1 text-slate-700">
          {currentListItems}
        </ul>
      );
      currentListItems = [];
      inBulletList = false;
    }
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const key = `line-${idx}`;

    // Handle Tables
    if (isTableRowLine(line) && idx + 1 < lines.length && isTableSeparatorLine(lines[idx + 1])) {
      flushList(`${key}-prelist`);
      const tableRows: string[] = [];
      idx += 1; // skip separator line

      while (idx + 1 < lines.length && isTableRowLine(lines[idx + 1]) && !isTableSeparatorLine(lines[idx + 1])) {
        idx += 1;
        tableRows.push(lines[idx]);
      }

      elements.push(renderTable(line, tableRows, `${key}-table`));
      continue;
    }

    // Handle Headers
    if (line.startsWith('### ')) {
      flushList(`${key}-prelist`);
      elements.push(
        <h4 key={key} className="text-sm font-extrabold text-slate-950 mt-4 mb-1 tracking-tight flex items-center gap-1.5 border-b border-slate-100 pb-1">
          <Sparkle className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          {replaceBoldText(line.substring(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList(`${key}-prelist`);
      elements.push(
        <h3 key={key} className="text-base font-bold text-slate-900 mt-5 mb-2 tracking-tight">
          {replaceBoldText(line.substring(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushList(`${key}-prelist`);
      elements.push(
        <h2 key={key} className="text-lg font-extrabold text-slate-900 mt-6 mb-2 tracking-tight">
          {replaceBoldText(line.substring(2))}
        </h2>
      );
      continue;
    }

    // Handle Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      inBulletList = true;
      currentListItems.push(
        <li key={`${key}-item`} className="text-sm text-slate-700 leading-relaxed pl-1">
          {replaceBoldText(line.substring(2))}
        </li>
      );
      continue;
    }

    // Handle Numbered lists
    const numberedListMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numberedListMatch) {
      flushList(`${key}-prelist`);
      elements.push(
        <div key={key} className="flex gap-2 my-1.5 pl-1.5 align-baseline">
          <span className="font-bold text-teal-600 text-sm">{numberedListMatch[1]}.</span>
          <p className="text-sm text-slate-700 leading-relaxed flex-1">
            {replaceBoldText(numberedListMatch[2])}
          </p>
        </div>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      flushList(`${key}-prelist`);
      elements.push(<div key={key} className="h-2" />);
      continue;
    }

    // Regular line - flush list if we were in one
    flushList(`${key}-prelist`);
    elements.push(
      <p key={key} className="text-sm text-slate-700 leading-relaxed my-1">
        {replaceBoldText(line)}
      </p>
    );
  }

  // Final flush
  flushList(`final-list`);

  return elements;
}

// Parses bold markdown text e.g. **text** and `code` inline
function replaceBoldText(text: string): React.ReactNode {
  // Regex split to extract inline formatting
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-250 text-[11px] font-mono font-bold text-teal-700">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Extract JSON talent recommendation details from message block
function getTalentRecommendations(text: string) {
  try {
    const match = text.match(/```json-talent-recommendation([\s\S]*?)```/);
    if (match && match[1]) {
      return JSON.parse(match[1].trim());
    }
  } catch (err) {
    console.warn("Failed to parse visual recommendations JSON", err);
  }
  return null;
}

export default function MessageBubble({
  message,
  employees,
  projects,
  onViewEmployee,
  onViewProject,
}: MessageBubbleProps) {
  const isUser = message.isUser;
  const recs = getTalentRecommendations(message.text);

  // Match recommended employees and projects with database
  const recEmployees = recs && Array.isArray(recs.employeeIds)
    ? employees.filter(emp => recs.employeeIds.includes(emp.id))
    : [];

  const recProjects = recs && Array.isArray(recs.projectIds)
    ? projects.filter(p => recs.projectIds.includes(p.id))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 p-4 rounded-2xl w-full max-w-3xl mx-auto border ${
        isUser
          ? 'bg-gradient-to-r from-teal-50/50 to-indigo-50/50 border-teal-100 flex-row-reverse'
          : 'bg-white border-slate-100 shadow-sm'
      }`}
    >
      {/* Avatar circular badge */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0 border ${
          isUser
            ? 'bg-gradient-to-tr from-teal-600 to-indigo-600 border-teal-500 text-white'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
        )}
      </div>

      {/* Bubble text content area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-800">
            {isUser ? 'Product Director' : 'Nova'}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {new Date(message.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Text rendering */}
        <div className="text-slate-700 text-sm leading-relaxed space-y-2">
          {isUser ? (
            <p className="text-slate-800 font-medium whitespace-pre-line">{message.text}</p>
          ) : (
            parseMessageText(message.text)
          )}
        </div>

        {/* INTERACTIVE RECOMMENDATION CARDS CONTAINER */}
        {!isUser && (recEmployees.length > 0 || recProjects.length > 0) && (
          <div className="mt-5 pt-4 border-t border-dashed border-slate-100 space-y-3">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-teal-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-500 animate-pulse" />
              Interactive Entity Recommendations
            </h5>

            {/* Recommended Projects Row */}
            {recProjects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onViewProject(proj.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-teal-200 transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-600 transition-colors">{proj.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{proj.timeline}</p>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 transition-colors mr-1" />
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Employees Row */}
            {recEmployees.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => onViewEmployee(emp.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-teal-200 transition-all cursor-pointer shadow-sm group"
                  >
                    <span className="text-2xl bg-slate-50 p-1 rounded-lg border border-slate-100">{emp.avatar}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-600 transition-colors">{emp.name}</p>
                      <p className="text-[9px] text-slate-400 font-semibold">{emp.role}</p>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 transition-colors mr-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
