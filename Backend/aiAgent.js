import readline from "node:readline/promises";
import * as z from "zod";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

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

await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ Database connected for AI Agent");

///////////////
// HR Team Builder Tools for AI Agent
///////////////

const findEmployeesTool = tool(
  async ({ skills, maxWorkload = 100 }) => {
    try {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      const employees = await findEmployees(skillsArray, maxWorkload);

      if (employees.length === 0) {
        return "No employees found with the specified skills.";
      }

      const result = employees.map((emp) => ({
        name: emp.name,
        department: emp.department,
        skills: emp.skills,
        workload: `${emp.workload}%`,
        availability: `${100 - emp.workload}%`,
        email: emp.email,
      }));

      return JSON.stringify(result, null, 2);
    } catch (error) {
      return `Error finding employees: ${error.message}`;
    }
  },
  {
    name: "find_employees",
    description:
      "Find employees by skills and workload availability. Use this when the user asks to find team members or employees with specific skills.",
    schema: z.object({
      skills: z
        .array(z.string())
        .describe("Array of skills to search for (e.g., ['React', 'Node.js'])"),
      maxWorkload: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum workload percentage (0-100), default is 100"),
    }),
  }
);

const createProjectTool = tool(
  async ({ name, description, required_skills = [], timeline, budget }) => {
    try {
      const project = await createProject({
        name,
        description,
        required_skills: Array.isArray(required_skills)
          ? required_skills
          : [required_skills],
        timeline,
        budget,
      });

      if (!project) {
        return "Failed to create project. It might already exist or have invalid data.";
      }

      return `✅ Project "${
        project.name
      }" created successfully!\nDescription: ${
        project.description
      }\nRequired Skills: ${project.required_skills.join(", ")}`;
    } catch (error) {
      return `Error creating project: ${error.message}`;
    }
  },
  {
    name: "create_project",
    description:
      "Create a new project with name, description, and required skills. Use this when the user wants to create or start a new project.",
    schema: z.object({
      name: z.string().describe("Project name"),
      description: z.string().describe("Detailed project description"),
      required_skills: z
        .array(z.string())
        .optional()
        .default([])
        .describe("Array of required skills for the project"),
      timeline: z.string().optional().describe("Optional project timeline"),
      budget: z.string().optional().describe("Optional project budget"),
    }),
  }
);

const assignTeamTool = tool(
  async ({ project_name, team_members }) => {
    try {
      const teamArray = Array.isArray(team_members)
        ? team_members
        : [team_members];
      const project = await assignTeam(project_name, teamArray);

      if (!project) {
        return "Failed to assign team. Project might not exist or employees not found.";
      }

      return `✅ Team assigned to "${project.name}": ${project.team.join(
        ", "
      )}\nProject status: ${project.status}`;
    } catch (error) {
      return `Error assigning team: ${error.message}`;
    }
  },
  {
    name: "assign_team",
    description:
      "Assign a team of employees to a project. Use this when the user wants to add team members to a project.",
    schema: z.object({
      project_name: z
        .string()
        .describe("Name of the project to assign team to"),
      team_members: z
        .array(z.string())
        .describe("Array of employee names to assign to the project"),
    }),
  }
);

const getProjectStatusTool = tool(
  async ({ project_name }) => {
    try {
      const project = await getProjectStatus(project_name);

      if (!project) {
        return `Project "${project_name}" not found.`;
      }

      const status = {
        name: project.name,
        description: project.description,
        status: project.status,
        required_skills: project.required_skills,
        team: project.team,
        tasks: project.tasks
          ? project.tasks.map((task) => ({
              description: task.description,
              status: task.status,
              assigned_to: task.assigned_to || "Unassigned",
            }))
          : [],
        created: project.createdAt.toLocaleDateString(),
      };

      return JSON.stringify(status, null, 2);
    } catch (error) {
      return `Error getting project status: ${error.message}`;
    }
  },
  {
    name: "get_project_status",
    description:
      "Get detailed status of a project including team and tasks. Use this when the user asks about project details or status.",
    schema: z.object({
      project_name: z.string().describe("Name of the project to check"),
    }),
  }
);

const generateTasksTool = tool(
  async ({ project_name, num_tasks = 3 }) => {
    try {
      const project = await generateTasksForProject(project_name, num_tasks);

      if (!project) {
        return "Failed to generate tasks. Project might not exist.";
      }

      const tasks = project.tasks
        .map(
          (task, index) => `${index + 1}. ${task.description} [${task.status}]`
        )
        .join("\n");

      return `✅ Generated ${project.tasks.length} tasks for "${project_name}":\n${tasks}`;
    } catch (error) {
      return `Error generating tasks: ${error.message}`;
    }
  },
  {
    name: "generate_tasks",
    description:
      "Generate tasks for a project based on its description. Use this when the user wants to create or add tasks to a project.",
    schema: z.object({
      project_name: z
        .string()
        .describe("Name of the project to generate tasks for"),
      num_tasks: z
        .number()
        .optional()
        .default(3)
        .describe("Number of tasks to generate (default: 3)"),
    }),
  }
);

const assignTaskTool = tool(
  async ({ project_name, task_number, employee_name }) => {
    try {
      const project = await assignTask(
        project_name,
        task_number,
        employee_name
      );

      if (!project) {
        return "Failed to assign task. Check if project, task, and employee exist.";
      }

      const task = project.tasks[task_number - 1];
      return `✅ Task assigned: "${task.description}" → ${employee_name}`;
    } catch (error) {
      return `Error assigning task: ${error.message}`;
    }
  },
  {
    name: "assign_task",
    description:
      "Assign a specific task to an employee. Use this when the user wants to assign a task to a team member.",
    schema: z.object({
      project_name: z.string().describe("Name of the project"),
      task_number: z.number().describe("Task number (starting from 1)"),
      employee_name: z
        .string()
        .describe("Name of the employee to assign the task to"),
    }),
  }
);

const updateTaskStatusTool = tool(
  async ({ project_name, task_number, new_status }) => {
    try {
      const validStatuses = ["pending", "in-progress", "completed", "blocked"];
      if (!validStatuses.includes(new_status)) {
        return `Invalid status. Must be one of: ${validStatuses.join(", ")}`;
      }

      const project = await updateTaskStatus(
        project_name,
        task_number,
        new_status
      );

      if (!project) {
        return "Failed to update task status.";
      }

      const task = project.tasks[task_number - 1];
      return `✅ Task status updated: "${task.description}" → ${new_status}`;
    } catch (error) {
      return `Error updating task status: ${error.message}`;
    }
  },
  {
    name: "update_task_status",
    description:
      "Update the status of a task. Use this when the user wants to change a task's status.",
    schema: z.object({
      project_name: z.string().describe("Name of the project"),
      task_number: z.number().describe("Task number (starting from 1)"),
      new_status: z
        .string()
        .describe("New status: pending, in-progress, completed, or blocked"),
    }),
  }
);

const proposeTeamTool = tool(
  async ({ project_description, project_name = null }) => {
    try {
      const result = await proposeTeamSimple(project_description);

      if (!result.success) {
        return `No suitable team found: ${result.message}`;
      }

      const teamInfo = result.proposedTeam
        .map(
          (emp) =>
            `- ${emp.name} (${
              emp.matchScore
            }% match): ${emp.matchingSkills.join(", ")}`
        )
        .join("\n");

      return `💡 Team Proposal (${
        result.skillsCoverage
      }% skills coverage):\n${teamInfo}\n\nRequired Skills: ${result.requiredSkills.join(
        ", "
      )}`;
    } catch (error) {
      return `Error proposing team: ${error.message}`;
    }
  },
  {
    name: "propose_team",
    description:
      "Propose a team for a project based on description. Use this when the user wants suggestions for team members based on project requirements.",
    schema: z.object({
      project_description: z
        .string()
        .describe(
          "Project description to extract skills from and find matching team members"
        ),
      project_name: z
        .string()
        .optional()
        .describe("Optional project name for reference"),
    }),
  }
);

const listProjectsTool = tool(
  async () => {
    try {
      const projects = await Project.find().sort({ createdAt: -1 });

      if (projects.length === 0) {
        return "No projects found.";
      }

      const projectList = projects
        .map(
          (project, index) =>
            `${index + 1}. ${project.name} (${project.status}) - Team: ${
              project.team.join(", ") || "None"
            } - Tasks: ${project.tasks ? project.tasks.length : 0}`
        )
        .join("\n");

      return `📂 All Projects (${projects.length}):\n${projectList}`;
    } catch (error) {
      return `Error listing projects: ${error.message}`;
    }
  },
  {
    name: "list_projects",
    description:
      "List all projects with their status and team information. Use this when the user wants to see all projects.",
    schema: z.object({}),
  }
);

const listEmployeesTool = tool(
  async () => {
    try {
      const employees = await Employee.find().sort({ department: 1, name: 1 });

      const employeeList = employees
        .map(
          (emp) =>
            `- ${emp.name} (${emp.department}): ${emp.skills.join(", ")} - ${
              emp.workload
            }% workload`
        )
        .join("\n");

      return `👨‍💼 All Employees (${employees.length}):\n${employeeList}`;
    } catch (error) {
      return `Error listing employees: ${error.message}`;
    }
  },
  {
    name: "list_employees",
    description:
      "List all employees with their skills and workload. Use this when the user wants to see all available employees.",
    schema: z.object({}),
  }
);

// Add employee tool
const addEmployeeTool = tool(
  async ({ name, department, skills = [], workload = 0, email = "" }) => {
    try {
      const existing = await Employee.findOne({
        $or: [{ email: email }, { name, department }],
      });
      if (existing) {
        return `Employee "${name}" already exists (${existing.department}). Use update if needed.`;
      }

      const employee = await Employee.create({
        name,
        department,
        skills,
        workload,
        email: email || undefined,
      });

      return `✅ Employee "${employee.name}" added successfully!\nDepartment: ${employee.department}\nSkills: ${employee.skills.join(", ") || "None"}\nWorkload: ${employee.workload}%`;
    } catch (error) {
      return `Error adding employee: ${error.message}`;
    }
  },
  {
    name: "add_employee",
    description:
      "Add a new employee to the database. Use this when the user wants to register a new team member with their skills, department, and workload.",
    schema: z.object({
      name: z.string().describe("Employee's full name"),
      department: z.string().describe("Department (e.g., Engineering, Design)"),
      skills: z
        .array(z.string())
        .optional()
        .default([])
        .describe("List of skills the employee has"),
      workload: z
        .number()
        .optional()
        .default(0)
        .describe("Current workload percentage (0-100)"),
      email: z.string().email().optional().default("").describe("Email address"),
    }),
  }
);

///////////////
// Missing CRUD Tools
///////////////

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

      if (Object.keys(updates).length === 0) {
        return "No fields provided to update. Specify skills, workload, email, or department.";
      }

      const employee = await Employee.findOneAndUpdate(query, updates, {
        new: true,
        runValidators: true,
      });

      if (!employee) {
        return `Employee "${employee_name}" not found${department ? ` in ${department}` : ""}.`;
      }

      return `✅ Employee "${employee.name}" updated. Current details:\nDepartment: ${employee.department}\nSkills: ${employee.skills.join(", ") || "None"}\nWorkload: ${employee.workload}%\nEmail: ${employee.email || "Not set"}`;
    } catch (error) {
      return `Error updating employee: ${error.message}`;
    }
  },
  {
    name: "update_employee",
    description:
      "Update an employee's skills, department, workload, or email. Use this when employee details need to be changed.",
    schema: z.object({
      employee_name: z.string().describe("Full name of the employee"),
      department: z
        .string()
        .optional()
        .describe(
          "Current department (to disambiguate if multiple employees share the same name)"
        ),
      skills: z
        .array(z.string())
        .optional()
        .describe("New list of skills (replaces existing)"),
      workload: z
        .number()
        .optional()
        .describe("New workload percentage (0-100)"),
      email: z.string().email().optional().describe("New email address"),
    }),
  }
);

const deleteEmployeeTool = tool(
  async ({ employee_name, department }) => {
    try {
      const query = { name: employee_name };
      if (department) query.department = department;

      const projectsWithEmployee = await Project.find({
        $or: [
          { team: employee_name },
          { "tasks.assigned_to": employee_name },
        ],
      });

      if (projectsWithEmployee.length > 0) {
        const projectNames = projectsWithEmployee.map((p) => p.name).join(", ");
        return `⚠️ Cannot delete "${employee_name}" because they are assigned to projects: ${projectNames}. Remove them from those projects first.`;
      }

      const result = await Employee.findOneAndDelete(query);
      if (!result) {
        return `Employee "${employee_name}" not found${department ? ` in ${department}` : ""}.`;
      }

      return `✅ Employee "${result.name}" (${result.department}) deleted successfully.`;
    } catch (error) {
      return `Error deleting employee: ${error.message}`;
    }
  },
  {
    name: "delete_employee",
    description:
      "Remove an employee from the database. Only works if they are not assigned to any project or task.",
    schema: z.object({
      employee_name: z.string().describe("Full name of the employee to delete"),
      department: z
        .string()
        .optional()
        .describe(
          "Department to disambiguate employees with the same name"
        ),
    }),
  }
);

const updateProjectTool = tool(
  async ({ project_name, new_name, description, required_skills, status, timeline, budget }) => {
    try {
      const query = { name: project_name };
      const updates = {};
      if (new_name) updates.name = new_name;
      if (description !== undefined) updates.description = description;
      if (required_skills !== undefined)
        updates.required_skills = Array.isArray(required_skills)
          ? required_skills
          : [required_skills];
      if (status) {
        const validStatuses = [
          "planning",
          "in-progress",
          "completed",
          "on-hold",
        ];
        if (!validStatuses.includes(status)) {
          return `Invalid status. Use: ${validStatuses.join(", ")}`;
        }
        updates.status = status;
      }
      if (timeline !== undefined) updates.timeline = timeline;
      if (budget !== undefined) updates.budget = budget;

      if (Object.keys(updates).length === 0) {
        return "No fields provided to update. Specify new_name, description, required_skills, or status.";
      }

      const project = await Project.findOneAndUpdate(query, updates, {
        new: true,
        runValidators: true,
      });

      if (!project) return `Project "${project_name}" not found.`;

      return `✅ Project "${project.name}" updated:\nDescription: ${project.description}\nStatus: ${project.status}\nRequired Skills: ${project.required_skills.join(", ")}${project.timeline ? `\nTimeline: ${project.timeline}` : ""}${project.budget ? `\nBudget: ${project.budget}` : ""}`;
    } catch (error) {
      return `Error updating project: ${error.message}`;
    }
  },
  {
    name: "update_project",
    description:
      "Update a project's name, description, required skills, or status.",
    schema: z.object({
      project_name: z.string().describe("Current name of the project"),
      new_name: z.string().optional().describe("New project name (if renaming)"),
      description: z.string().optional().describe("Updated description"),
      required_skills: z
        .array(z.string())
        .optional()
        .describe("Updated list of required skills"),
      status: z
        .string()
        .optional()
        .describe(
          "New status: planning, in-progress, completed, on-hold"
        ),
      timeline: z.string().optional().describe("Updated project timeline"),
      budget: z.string().optional().describe("Updated project budget"),
    }),
  }
);

// NEW: Delete project tool
const deleteProjectTool = tool(
  async ({ project_name }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) {
        return `Project "${project_name}" not found.`;
      }

      // Optional: you can add checks to prevent deletion if the project has team or tasks
      // For simplicity, we allow deletion regardless.

      await Project.deleteOne({ name: project_name });

      return `✅ Project "${project_name}" deleted successfully.`;
    } catch (error) {
      return `Error deleting project: ${error.message}`;
    }
  },
  {
    name: "delete_project",
    description:
      "Delete a project from the database. Use this when the user wants to remove a project entirely.",
    schema: z.object({
      project_name: z.string().describe("Name of the project to delete"),
    }),
  }
);

const removeTeamMemberTool = tool(
  async ({ project_name, employee_name }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) return `Project "${project_name}" not found.`;

      const initialLength = project.team.length;
      project.team = project.team.filter((name) => name !== employee_name);

      let unassignedTasks = 0;
      if (project.tasks) {
        project.tasks.forEach((task) => {
          if (task.assigned_to === employee_name) {
            task.assigned_to = null;
            unassignedTasks++;
          }
        });
      }

      if (project.team.length === initialLength) {
        return `Employee "${employee_name}" was not in the team of "${project_name}".`;
      }

      await project.save();
      return `✅ Removed "${employee_name}" from "${project_name}".${unassignedTasks > 0 ? ` Also unassigned from ${unassignedTasks} task(s).` : ""}`;
    } catch (error) {
      return `Error removing team member: ${error.message}`;
    }
  },
  {
    name: "remove_team_member",
    description:
      "Remove an employee from a project's team and unassign them from all tasks in that project.",
    schema: z.object({
      project_name: z.string().describe("Project name"),
      employee_name: z.string().describe("Employee name to remove"),
    }),
  }
);

const deleteTaskTool = tool(
  async ({ project_name, task_number }) => {
    try {
      const project = await Project.findOne({ name: project_name });
      if (!project) return `Project "${project_name}" not found.`;
      if (!project.tasks || project.tasks.length === 0)
        return `Project "${project_name}" has no tasks.`;

      const index = task_number - 1;
      if (index < 0 || index >= project.tasks.length) {
        return `Invalid task number. There are ${project.tasks.length} task(s).`;
      }

      const removedTask = project.tasks.splice(index, 1)[0];
      await project.save();

      return `✅ Deleted task: "${removedTask.description}" from "${project_name}".`;
    } catch (error) {
      return `Error deleting task: ${error.message}`;
    }
  },
  {
    name: "delete_task",
    description:
      "Delete a specific task from a project by its number (1-based).",
    schema: z.object({
      project_name: z.string().describe("Project name"),
      task_number: z.number().describe("Task number (starting from 1) to delete"),
    }),
  }
);

///////////////
// AI Agent Setup
///////////////

if (!process.env.GROQ_API_KEY) {
  console.error(
    "❌ GROQ_API_KEY is not set. Add it to Backend/.env before starting the agent."
  );
  process.exit(1);
}

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0,
});

const tools = [
  findEmployeesTool,
  createProjectTool,
  assignTeamTool,
  getProjectStatusTool,
  generateTasksTool,
  assignTaskTool,
  updateTaskStatusTool,
  proposeTeamTool,
  listProjectsTool,
  listEmployeesTool,
  addEmployeeTool,
  updateEmployeeTool,
  deleteEmployeeTool,
  updateProjectTool,
  removeTeamMemberTool,
  deleteTaskTool,
  deleteProjectTool,   // <-- added here
];

const agent = createReactAgent({
  llm,
  tools,
  checkpointer: new MemorySaver(),
});

///////////////
// Main Interaction Loop
///////////////

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🤖 HR Team Builder AI Agent");
  console.log("============================");
  console.log("I can help you with:");
  console.log("• Finding employees by skills");
  console.log("• Creating and managing projects");
  console.log("• Team formation and assignment");
  console.log("• Task generation and tracking");
  console.log("• Project status monitoring");
  console.log("• Adding, updating, and deleting employees");
  console.log("• Deleting projects (NEW)");
  console.log("Type '/bye' to exit\n");

  const config = { configurable: { thread_id: "hr-team-builder-1" } };

  while (true) {
    const query = await rl.question("You: ");

    if (query.toLowerCase() === "/bye" || query.toLowerCase() === "exit") {
      break;
    }

    if (!query.trim()) {
      continue;
    }

    try {
      const stream = await agent.stream(
        {
          messages: [{ role: "user", content: query }],
        },
        config
      );

      console.log("\n🤖 AI: ");

      for await (const chunk of stream) {
        // Handle agent messages
        if (chunk.agent) {
          const messages = chunk.agent.messages;
          for (const message of messages) {
            if (message.content) {
              console.log(message.content);
            }
          }
        }

        // Handle tool calls
        if (chunk.tools) {
          const messages = chunk.tools.messages;
          for (const message of messages) {
            if (message.content) {
              console.log("Tool result:", message.content);
            }
          }
        }
      }

      console.log("\n");
    } catch (error) {
      console.error("\n❌ Error:", error.message);
      console.log("\n");
    }
  }

  rl.close();
  await mongoose.connection.close();
  console.log("👋 Goodbye! Database connection closed.");
}

main().catch(console.error);