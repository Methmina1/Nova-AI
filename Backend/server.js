import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import * as z from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";

import {
  findEmployees,
  createProject,
  assignTeam,
  getProjectStatus,
  generateTasksForProject,
  assignTask,
  updateTaskStatus,
  proposeTeamSimple,
} from "./utils/agentTools.js";

import Project from "./models/Project.js";
import Employee from "./models/Employee.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ Database connected");

// ==================== TOOLS ====================

// 1. find_employees (OR) – kept for backward compatibility
const findEmployeesTool = tool(
  async ({ skills, maxWorkload = 100 }) => {
    try {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      const employees = await findEmployees(skillsArray, maxWorkload);
      if (employees.length === 0) return "No employees found with the specified skills.";
      return JSON.stringify(
        employees.map(emp => ({
          id: emp._id.toString(),
          name: emp.name,
          department: emp.department,
          skills: emp.skills,
          workload: `${emp.workload}%`,
          availability: `${100 - emp.workload}%`,
          email: emp.email,
        })),
        null, 2
      );
    } catch (error) {
      return `Error finding employees: ${error.message}`;
    }
  },
  {
    name: "find_employees",
    description: "Find employees with at least one of the given skills (OR logic).",
    schema: z.object({
      skills: z.array(z.string()).describe("Array of skills (e.g., ['React', 'Node.js'])"),
      maxWorkload: z.number().optional().default(100),
    }),
  }
);

// 2. find_employees_exact (AND) – for multi‑skill queries
const findEmployeesExactTool = tool(
  async ({ skills, maxWorkload = 100 }) => {
    try {
      const clean = (Array.isArray(skills) ? skills : [skills])
        .filter(s => typeof s === "string" && s.trim().length > 0);
      if (clean.length === 0) return "Please provide at least one valid skill.";
      const employees = await Employee.find({
        skills: { $all: clean },
        workload: { $lte: maxWorkload },
      })
        .select("name department skills workload email")
        .sort({ workload: 1 })
        .limit(20)
        .lean();
      if (employees.length === 0) {
        return `No employees found with all of these skills: ${clean.join(", ")}`;
      }
      return JSON.stringify(
        employees.map(emp => ({
          id: emp._id.toString(),
          name: emp.name,
          department: emp.department,
          skills: emp.skills,
          workload: `${emp.workload}%`,
          availability: `${100 - emp.workload}%`,
          email: emp.email,
        })),
        null, 2
      );
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "find_employees_exact",
    description: "Find employees who possess ALL specified skills (AND logic). Use for queries like 'React and Python'.",
    schema: z.object({
      skills: z.array(z.string()).describe("All skills the employee must have"),
      maxWorkload: z.number().optional().default(100),
    }),
  }
);

// 3. add_employee
const addEmployeeTool = tool(
  async ({ name, department, skills = [], workload = 0, email = "" }) => {
    try {
      const existing = await Employee.findOne({ $or: [{ email: email || null }, { name, department }] });
      if (existing) return `Employee "${name}" already exists (${existing.department}).`;
      const employee = await Employee.create({ name, department, skills, workload, email: email || undefined });
      return `✅ Employee "${employee.name}" added.\nDepartment: ${employee.department}\nSkills: ${employee.skills.join(", ") || "None"}\nWorkload: ${employee.workload}%`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "add_employee",
    description: "Add a new employee.",
    schema: z.object({
      name: z.string(),
      department: z.string(),
      skills: z.array(z.string()).optional().default([]),
      workload: z.number().optional().default(0),
      email: z.string().email().optional().default(""),
    }),
  }
);

// 4. update_employee
const updateEmployeeTool = tool(
  async ({ employee_name, department, skills, workload, email }) => {
    try {
      const query = { name: employee_name };
      if (department) query.department = department;
      const updates = {};
      if (skills !== undefined) updates.skills = skills;
      if (workload !== undefined) updates.workload = workload;
      if (email !== undefined) updates.email = email;
      if (department) updates.department = department;
      if (Object.keys(updates).length === 0) return "No fields to update.";
      const employee = await Employee.findOneAndUpdate(query, updates, { new: true, runValidators: true });
      if (!employee) return `Employee "${employee_name}" not found.`;
      return `✅ Updated ${employee.name}.\nDepartment: ${employee.department}\nSkills: ${employee.skills.join(", ") || "None"}\nWorkload: ${employee.workload}%\nEmail: ${employee.email || "Not set"}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "update_employee",
    description: "Update employee details.",
    schema: z.object({
      employee_name: z.string(),
      department: z.string().optional(),
      skills: z.array(z.string()).optional(),
      workload: z.number().optional(),
      email: z.string().email().optional(),
    }),
  }
);

// 5. delete_employee
const deleteEmployeeTool = tool(
  async ({ employee_name, department }) => {
    try {
      const query = { name: employee_name };
      if (department) query.department = department;
      const assigned = await Project.find({ $or: [{ team: employee_name }, { "tasks.assigned_to": employee_name }] });
      if (assigned.length > 0) {
        const names = assigned.map(p => p.name).join(", ");
        return `⚠️ Cannot delete - assigned to projects: ${names}. Remove first.`;
      }
      const result = await Employee.findOneAndDelete(query);
      if (!result) return `Employee "${employee_name}" not found.`;
      return `✅ Deleted ${result.name} (${result.department}).`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "delete_employee",
    description: "Delete an employee (only if not assigned to any project/task).",
    schema: z.object({
      employee_name: z.string(),
      department: z.string().optional(),
    }),
  }
);

// 6. create_project
const createProjectTool = tool(
  async ({ name, description, required_skills = [], timeline, budget }) => {
    try {
      const project = await createProject({ name, description, required_skills, timeline, budget });
      if (!project) return "Failed to create project (maybe duplicate or invalid).";
      return `✅ Project "${project.name}" created.\nDescription: ${project.description}\nSkills: ${project.required_skills.join(", ")}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "create_project",
    description: "Create a new project.",
    schema: z.object({
      name: z.string(),
      description: z.string(),
      required_skills: z.array(z.string()).optional().default([]),
      timeline: z.string().optional(),
      budget: z.string().optional(),
    }),
  }
);

// 7. update_project
const updateProjectTool = tool(
  async ({ project_name, new_name, description, required_skills, status, timeline, budget }) => {
    try {
      const query = { name: project_name };
      const updates = {};
      if (new_name) updates.name = new_name;
      if (description !== undefined) updates.description = description;
      if (required_skills !== undefined) updates.required_skills = Array.isArray(required_skills) ? required_skills : [required_skills];
      if (status) {
        const valid = ["planning", "in-progress", "completed", "on-hold"];
        if (!valid.includes(status)) return `Invalid status. Use: ${valid.join(", ")}`;
        updates.status = status;
      }
      if (timeline !== undefined) updates.timeline = timeline;
      if (budget !== undefined) updates.budget = budget;
      if (Object.keys(updates).length === 0) return "No fields to update.";
      const project = await Project.findOneAndUpdate(query, updates, { new: true, runValidators: true });
      if (!project) return `Project "${project_name}" not found.`;
      return `✅ Updated "${project.name}".\nStatus: ${project.status}\nSkills: ${project.required_skills.join(", ")}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "update_project",
    description: "Update project details or status.",
    schema: z.object({
      project_name: z.string(),
      new_name: z.string().optional(),
      description: z.string().optional(),
      required_skills: z.array(z.string()).optional(),
      status: z.string().optional(),
      timeline: z.string().optional(),
      budget: z.string().optional(),
    }),
  }
);

// 8. delete_project
const deleteProjectTool = tool(
  async ({ project_name }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) return `Project "${project_name}" not found.`;
      await Project.deleteOne({ name: project_name });
      return `✅ Project "${project_name}" deleted.`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "delete_project",
    description: "Delete a project permanently.",
    schema: z.object({ project_name: z.string() }),
  }
);

// 9. assign_team
const assignTeamTool = tool(
  async ({ project_name, team_members }) => {
    try {
      const project = await assignTeam(project_name, Array.isArray(team_members) ? team_members : [team_members]);
      if (!project) return "Failed to assign team. Check project and employee names.";
      return `✅ Team assigned to "${project.name}": ${project.team.join(", ")}\nStatus: ${project.status}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "assign_team",
    description: "Add team members to a project.",
    schema: z.object({
      project_name: z.string(),
      team_members: z.array(z.string()),
    }),
  }
);

// 10. remove_team_member
const removeTeamMemberTool = tool(
  async ({ project_name, employee_name }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) return `Project "${project_name}" not found.`;
      const initial = project.team.length;
      project.team = project.team.filter(name => name !== employee_name);
      let unassigned = 0;
      if (project.tasks) {
        project.tasks.forEach(task => {
          if (task.assigned_to === employee_name) {
            task.assigned_to = null;
            unassigned++;
          }
        });
      }
      if (project.team.length === initial) return `Employee "${employee_name}" not in team.`;
      await project.save();
      return `✅ Removed "${employee_name}" from "${project_name}".${unassigned > 0 ? ` Unassigned from ${unassigned} task(s).` : ""}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "remove_team_member",
    description: "Remove an employee from a project team and unassign their tasks.",
    schema: z.object({
      project_name: z.string(),
      employee_name: z.string(),
    }),
  }
);

// 11. get_project_status
const getProjectStatusTool = tool(
  async ({ project_name }) => {
    try {
      const project = await getProjectStatus(project_name);
      if (!project) return `Project "${project_name}" not found.`;
      const status = {
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        status: project.status,
        required_skills: project.required_skills,
        team: project.team,
        tasks: project.tasks?.map(t => ({ description: t.description, status: t.status, assigned_to: t.assigned_to || "Unassigned" })) || [],
        created: project.createdAt.toLocaleDateString(),
      };
      return JSON.stringify(status, null, 2);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "get_project_status",
    description: "Get full project details including tasks.",
    schema: z.object({ project_name: z.string() }),
  }
);

// 12. generate_tasks
const generateTasksTool = tool(
  async ({ project_name, num_tasks = 3 }) => {
    try {
      const project = await generateTasksForProject(project_name, num_tasks);
      if (!project) return `Failed to generate tasks for "${project_name}".`;
      const taskList = project.tasks.map((t, i) => `${i+1}. ${t.description} [${t.status}]`).join("\n");
      return `✅ Generated ${project.tasks.length} tasks:\n${taskList}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "generate_tasks",
    description: "Auto‑generate tasks for a project based on its description.",
    schema: z.object({
      project_name: z.string(),
      num_tasks: z.number().optional().default(3),
    }),
  }
);

// 13. assign_task
const assignTaskTool = tool(
  async ({ project_name, task_number, employee_name }) => {
    try {
      const project = await assignTask(project_name, task_number, employee_name);
      if (!project) return "Assignment failed. Check project, task number, and employee.";
      const task = project.tasks[task_number - 1];
      return `✅ Task "${task.description}" assigned to ${employee_name}.`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "assign_task",
    description: "Assign a specific task (by number) to an employee.",
    schema: z.object({
      project_name: z.string(),
      task_number: z.number(),
      employee_name: z.string(),
    }),
  }
);

// 14. update_task_status
const updateTaskStatusTool = tool(
  async ({ project_name, task_number, new_status }) => {
    try {
      const valid = ["pending", "in-progress", "completed", "blocked"];
      if (!valid.includes(new_status)) return `Invalid status. Use: ${valid.join(", ")}`;
      const project = await updateTaskStatus(project_name, task_number, new_status);
      if (!project) return "Update failed.";
      const task = project.tasks[task_number - 1];
      return `✅ Task "${task.description}" status → ${new_status}.`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "update_task_status",
    description: "Change a task's status.",
    schema: z.object({
      project_name: z.string(),
      task_number: z.number(),
      new_status: z.string(),
    }),
  }
);

// 15. delete_task
const deleteTaskTool = tool(
  async ({ project_name, task_number }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) return `Project "${project_name}" not found.`;
      if (!project.tasks || project.tasks.length === 0) return `No tasks in "${project_name}".`;
      const idx = task_number - 1;
      if (idx < 0 || idx >= project.tasks.length) return `Invalid task number (1-${project.tasks.length}).`;
      const removed = project.tasks.splice(idx, 1)[0];
      await project.save();
      return `✅ Deleted task: "${removed.description}" from "${project_name}".`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "delete_task",
    description: "Delete a specific task by its number.",
    schema: z.object({
      project_name: z.string(),
      task_number: z.number(),
    }),
  }
);

// 16. propose_team
const proposeTeamTool = tool(
  async ({ project_description }) => {
    try {
      const result = await proposeTeamSimple(project_description);
      if (!result.success) return `No suitable team found: ${result.message}`;
      const teamInfo = result.proposedTeam.map(emp =>
        `- ${emp.name} (${emp.matchScore}% match): ${emp.matchingSkills.join(", ")}`
      ).join("\n");
      return `💡 Team Proposal (${result.skillsCoverage}% coverage):\n${teamInfo}\nRequired Skills: ${result.requiredSkills.join(", ")}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "propose_team",
    description: "Suggest a team based on a project description.",
    schema: z.object({
      project_description: z.string(),
    }),
  }
);

// 17. list_projects
const listProjectsTool = tool(
  async () => {
    try {
      const projects = await Project.find().sort({ createdAt: -1 }).lean();
      if (projects.length === 0) return "No projects found.";
      const list = projects.map((p, i) =>
        `${i+1}. ${p.name} (${p.status}) - Team: ${p.team.join(", ") || "None"} - Tasks: ${p.tasks?.length || 0}`
      ).join("\n");
      return `📂 All Projects (${projects.length}):\n${list}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "list_projects",
    description: "List all projects with basic info.",
    schema: z.object({}),
  }
);

// 18. list_employees
const listEmployeesTool = tool(
  async () => {
    try {
      const employees = await Employee.find().sort({ department: 1, name: 1 }).lean();
      if (employees.length === 0) return "No employees found.";
      const list = employees.map(emp =>
        `- ${emp.name} (${emp.department}): ${emp.skills.join(", ")} - ${emp.workload}% workload`
      ).join("\n");
      return `👨‍💼 All Employees (${employees.length}):\n${list}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "list_employees",
    description: "List all employees with skills and workload.",
    schema: z.object({}),
  }
);

// 19. auto_assign_tasks (bulk assignment + status update)
const autoAssignTasksTool = tool(
  async ({ project_name }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) return `Project "${project_name}" not found.`;
      if (!project.tasks || project.tasks.length === 0) return `No tasks in "${project_name}".`;

      const employees = await Employee.find();
      const results = [];
      for (const task of project.tasks) {
        if (task.assigned_to) {
          results.push(`Task "${task.description}" already assigned to ${task.assigned_to}.`);
          continue;
        }
        const taskLower = task.description.toLowerCase();
        const skillsNeeded = project.required_skills.filter(s => taskLower.includes(s.toLowerCase()));
        const searchSkills = skillsNeeded.length > 0 ? skillsNeeded : project.required_skills;
        if (searchSkills.length === 0) {
          results.push(`No skills for task "${task.description}" – skipping.`);
          continue;
        }
        const candidates = employees
          .filter(emp => emp.skills.some(s => searchSkills.includes(s)))
          .sort((a, b) => a.workload - b.workload);
        if (candidates.length === 0) {
          results.push(`No employee for task "${task.description}".`);
          continue;
        }
        const best = candidates[0];
        task.assigned_to = best.name;
        task.status = "in-progress";
        best.workload = Math.min(100, best.workload + 10);
        await best.save();
        results.push(`✅ "${task.description}" → ${best.name} (workload ${best.workload}%)`);
      }
      await project.save();
      return `Auto‑assignment done for "${project_name}":\n${results.join("\n")}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },
  {
    name: "auto_assign_tasks",
    description: "Assign all unassigned tasks to the best‑matched employees and set status to 'in‑progress'.",
    schema: z.object({
      project_name: z.string(),
    }),
  }
);

// ==================== AI AGENT SETUP ====================

if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY missing. Set it in .env");
  process.exit(1);
}

const SYSTEM_PROMPT = `You are HR Team Builder AI, a corporate staffing consultant.

CRITICAL RULES:
1. **Always use a tool** to get real data. Never guess or invent employees/projects/skills.
2. **Prefer the most specific tool** for the user's request:
   - "update project status" → update_project
   - "delete project" → delete_project
   - "assign all tasks automatically" → auto_assign_tasks
   - "find employees with React and Python" → find_employees_exact
   - "find employees with React or Python" → find_employees
   - "propose a team" → propose_team
3. **After a tool returns a result**, respond concisely with the information.
4. **Do not ask for clarification** unless absolutely necessary.
5. **If you are unsure**, call list_projects or list_employees to see what's available.
6. **Do not perform multi‑step reasoning** — each tool call should solve a specific sub‑task. If you need to perform multiple actions, call them in sequence but avoid loops.
7. **End your response** with a JSON block if you recommend specific employees/projects (using ids from tool output).`;

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
});

const tools = [
  findEmployeesTool,
  findEmployeesExactTool,
  addEmployeeTool,
  updateEmployeeTool,
  deleteEmployeeTool,
  createProjectTool,
  updateProjectTool,
  deleteProjectTool,
  assignTeamTool,
  removeTeamMemberTool,
  getProjectStatusTool,
  generateTasksTool,
  assignTaskTool,
  updateTaskStatusTool,
  deleteTaskTool,
  proposeTeamTool,
  listProjectsTool,
  listEmployeesTool,
  autoAssignTasksTool,
];

const checkpointer = new MemorySaver();

function createAgent() {
  return createReactAgent({
    llm,
    tools,
    checkpointer,
    prompt: SYSTEM_PROMPT,
  });
}

// ==================== CHAT ENDPOINT ====================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, threadId = "default-thread" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const agent = createAgent();
    const config = {
      configurable: {
        thread_id: threadId,
        recursion_limit: 10, // prevent infinite loops
      },
    };

    let fullResponse = "";
    let toolCalls = [];
    let hasFinalResponse = false;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Agent execution timed out")), 60000)
    );

    const streamPromise = (async () => {
      const stream = await agent.stream(
        { messages: [{ role: "user", content: message }] },
        config
      );

      for await (const chunk of stream) {
        if (chunk.agent) {
          const msgs = chunk.agent.messages;
          for (const msg of msgs) {
            if (msg.content) {
              fullResponse += msg.content;
              hasFinalResponse = true;
            }
          }
        }
        if (chunk.tools) {
          const msgs = chunk.tools.messages;
          for (const msg of msgs) {
            if (msg.content) {
              toolCalls.push(msg.content);
            }
          }
        }
      }
    })();

    await Promise.race([streamPromise, timeoutPromise]);

    if (!hasFinalResponse && toolCalls.length > 0) {
      fullResponse = "✅ Actions completed:\n" + toolCalls.join("\n");
    }

    res.json({
      response: fullResponse || "I processed your request, but no output was generated.",
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      threadId,
    });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "Agent execution failed: " + error.message });
  }
});

// ==================== OTHER API ROUTES (unchanged) ====================

const roleForDepartment = (department) => {
  const map = {
    DevOps: 'Lead Cloud Architect & DevOps',
    Frontend: 'Senior UI/UX Designer & Frontend',
    Engineering: 'Senior Full-Stack Engineer',
    Mobile: 'Senior Mobile Engineer',
    'Data Science': 'Data Scientist & AI Specialist',
    'Quality Assurance': 'QA Automation Engineer',
    Security: 'Security Engineer',
  };
  return map[department] || department;
};

app.get("/api/employees", async (req, res) => {
  try {
    const [employees, projects] = await Promise.all([
      Employee.find().sort({ department: 1, name: 1 }).lean(),
      Project.find().lean(),
    ]);
    const normalized = employees.map((emp) => {
      const assignedProjectNames = projects
        .filter((proj) => (proj.team || []).includes(emp.name))
        .map((proj) => proj.name);
      return {
        id: emp._id.toString(),
        name: emp.name,
        role: roleForDepartment(emp.department),
        skills: emp.skills,
        experienceYears: 5,
        availability: Math.max(0, 100 - emp.workload),
        status: emp.workload === 0 ? 'Available' : emp.workload < 100 ? 'Partially Allocated' : 'Fully Allocated',
        avatar: '👤',
        email: emp.email,
        department: emp.department,
        projects: assignedProjectNames,
        bio: `Team member with ${emp.skills.join(', ')} expertise and current workload ${emp.workload}%.`,
        joinedDate: emp.createdAt ? emp.createdAt.toISOString() : new Date().toISOString(),
      };
    });
    res.json(normalized);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Unable to fetch employees' });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const [projects, employees] = await Promise.all([
      Project.find().sort({ createdAt: -1 }).lean(),
      Employee.find().lean(),
    ]);
    const nameToId = new Map(employees.map((emp) => [emp.name, emp._id.toString()]));
    const normalized = projects.map((proj) => ({
      id: proj._id.toString(),
      name: proj.name,
      description: proj.description,
      techStack: proj.required_skills || [],
      status: proj.status === 'active' ? 'In Progress' : proj.status === 'planning' ? 'Planning' : proj.status === 'completed' ? 'Completed' : 'Delayed',
      teamSize: (proj.team || []).length,
      requiredRoles: (proj.required_skills || []).map((skill) => `${skill} Specialist`),
      assignedEmployees: (proj.team || [])
        .map((name) => nameToId.get(name))
        .filter(Boolean),
      timeline: proj.timeline || 'TBD',
      budget: proj.budget || '$0',
    }));
    res.json(normalized);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Unable to fetch projects' });
  }
});

app.post("/api/projects/:projectId/assign-employee", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
    const [project, employee] = await Promise.all([
      Project.findById(projectId),
      Employee.findById(employeeId),
    ]);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!project.team.includes(employee.name)) {
      project.team.push(employee.name);
      if (project.status === 'planning') project.status = 'active';
      await project.save();
    }
    employee.workload = Math.min(100, employee.workload + 25);
    await employee.save();
    res.json({
      message: `${employee.name} assigned to ${project.name}`,
      project: { id: project._id.toString(), name: project.name, team: project.team, status: project.status },
      employee: { id: employee._id.toString(), name: employee.name, workload: employee.workload },
    });
  } catch (error) {
    console.error('Error assigning employee:', error);
    res.status(500).json({ error: 'Unable to assign employee' });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI Agent API is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 HR Team Builder AI Agent API running on port ${PORT}`);
  console.log(`📡 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
});