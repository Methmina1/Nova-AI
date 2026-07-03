/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  createdAt: string;
  recommendations?: {
    employeeIds?: string[];
    projectIds?: string[];
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export type AvailabilityStatus = 'Available' | 'Partially Allocated' | 'Fully Allocated' | 'On Leave';

export interface Employee {
  id: string;
  name: string;
  role: string;
  skills: string[];
  experienceYears: number;
  availability: number; // Percentage: 0 to 100
  status: AvailabilityStatus;
  avatar: string; // Emoji or visual representation placeholder
  email: string;
  department: string;
  projects: string[];
  bio: string;
  joinedDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  status: 'Planning' | 'In Progress' | 'Completed' | 'Delayed';
  teamSize: number;
  timeline: string;
  requiredRoles: string[];
  assignedEmployees: string[]; // Employee IDs
  budget: string;
}
