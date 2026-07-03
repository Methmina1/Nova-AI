import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Project from "../models/Project.js";

// Skill mapping for keyword extraction
const SKILL_KEYWORDS = {
  React: ["react", "react.js", "frontend", "ui"],
  "Node.js": ["node", "node.js", "backend", "server"],
  JavaScript: ["javascript", "js", "es6"],
  TypeScript: ["typescript", "ts"],
  MongoDB: ["mongodb", "mongo", "database"],
  Python: ["python", "py"],
  "React Native": ["react native", "mobile", "ios", "android"],
  "API Design": ["api", "rest", "graphql"],
  "UI/UX": ["ui", "ux", "design", "user interface"],
  CSS: ["css", "styling", "styles"],
  HTML5: ["html", "html5"],
  "Vue.js": ["vue", "vue.js"],
  Docker: ["docker", "container"],
  AWS: ["aws", "amazon web services"],
  Kubernetes: ["kubernetes", "k8s"],
  Linux: ["linux", "unix"],
};

/**
 * Enhanced error handler
 */
const handleError = (error, context = "Operation") => {
  console.error(`\n❌ ${context} failed:`);

  if (error.code === 11000) {
    console.error("   💡 Duplicate entry: This record already exists");
  } else if (error.name === "ValidationError") {
    console.error("   💡 Validation error:");
    Object.values(error.errors).forEach((err) => {
      console.error(`      - ${err.message}`);
    });
  } else if (error.name === "CastError") {
    console.error("   💡 Invalid ID format");
  } else {
    console.error(`   💡 ${error.message}`);
  }

  return null;
};

/**
 * Tool 1: Find employees by skills with enhanced validation
 */
const findEmployees = async (skillsNeeded, maxWorkload = 100) => {
  try {
    // Validate skills input
    if (
      !skillsNeeded ||
      !Array.isArray(skillsNeeded) ||
      skillsNeeded.length === 0
    ) {
      console.error("❌ Skills array is required and cannot be empty");
      return [];
    }

    const cleanSkills = skillsNeeded
      .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
      .filter((skill) => skill.length > 0);

    if (cleanSkills.length === 0) {
      console.error("❌ No valid skills provided");
      return [];
    }

    console.log(
      `🔍 Searching for employees with skills: ${cleanSkills.join(", ")}`
    );

    const employees = await Employee.find({
      skills: { $in: cleanSkills },
      workload: { $lte: maxWorkload },
    })
      .select("name department skills workload email")
      .sort({ workload: 1 })
      .limit(20);

    console.log(`✅ Found ${employees.length} employees`);
    return employees;
  } catch (error) {
    return handleError(error, "Employee search") || [];
  }
};

/**
 * Tool 2: Create project with enhanced validation
 */
const createProject = async (projectDetails) => {
  try {
    if (!projectDetails || typeof projectDetails !== "object") {
      console.error("❌ Project details object is required");
      return null;
    }

    console.log(`🆕 Creating project: ${projectDetails.name}`);

    // Basic validation
    if (!projectDetails.name || !projectDetails.description) {
      console.error("❌ Project name and description are required");
      return null;
    }

    // Sanitize inputs
    const name = projectDetails.name.trim();
    const description = projectDetails.description.trim();

    if (name.length < 3) {
      console.error("❌ Project name must be at least 3 characters long");
      return null;
    }

    if (description.length < 10) {
      console.error(
        "❌ Project description must be at least 10 characters long"
      );
      return null;
    }

    const project = await Project.create({
      name: name,
      description: description,
      required_skills: projectDetails.required_skills || [],
      timeline: projectDetails.timeline?.trim() || "TBD",
      budget: projectDetails.budget?.trim() || "$0",
      status: "planning",
      team: [],
    });

    console.log(`✅ Project "${project.name}" created successfully!`);
    return project;
  } catch (error) {
    return handleError(error, "Project creation");
  }
};

/**
 * Tool 3: Assign team to project with comprehensive validation
 */
const assignTeam = async (projectName, teamMembers) => {
  try {
    console.log(`👥 Assigning team to project: ${projectName}`);

    // Validate inputs
    if (!projectName || !teamMembers || !Array.isArray(teamMembers)) {
      console.error("❌ Project name and team members array are required");
      return null;
    }

    if (teamMembers.length === 0) {
      console.error("❌ Team members array cannot be empty");
      return null;
    }

    // Find project
    const project = await Project.findOne({ name: projectName });
    if (!project) {
      console.error(`❌ Project "${projectName}" not found`);
      return null;
    }

    // Validate all employees exist
    const validatedTeam = [];
    for (const employeeName of teamMembers) {
      if (
        typeof employeeName !== "string" ||
        employeeName.trim().length === 0
      ) {
        console.error("❌ Invalid employee name");
        continue;
      }

      const employee = await Employee.findOne({ name: employeeName.trim() });
      if (!employee) {
        console.error(`❌ Employee "${employeeName}" not found`);
        continue;
      }

      validatedTeam.push(employeeName);
    }

    if (validatedTeam.length === 0) {
      console.error("❌ No valid team members to assign");
      return null;
    }

    // Update project
    project.team = [...new Set([...project.team, ...validatedTeam])];
    project.status = project.status === "planning" ? "active" : project.status;
    await project.save();

    console.log(
      `✅ Team assigned to "${projectName}": ${validatedTeam.join(", ")}`
    );
    return project;
  } catch (error) {
    return handleError(error, "Team assignment");
  }
};

/**
 * Extract skills from project description
 */
const extractSkillsFromDescription = (description) => {
  if (!description || typeof description !== "string") return [];

  const descriptionLower = description.toLowerCase();
  const extractedSkills = [];

  // Check each skill and its keywords
  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (descriptionLower.includes(keyword.toLowerCase())) {
        if (!extractedSkills.includes(skill)) {
          extractedSkills.push(skill);
        }
        break;
      }
    }
  }

  console.log(
    `🔧 Extracted skills: ${extractedSkills.join(", ") || "None found"}`
  );
  return extractedSkills;
};

/**
 * Simple matching algorithm
 */
const findTeamForProject = async (projectDescription) => {
  try {
    console.log(`\n🎯 Starting team matching for: "${projectDescription}"`);

    // Step 1: Extract skills from description
    const requiredSkills = extractSkillsFromDescription(projectDescription);

    if (requiredSkills.length === 0) {
      console.log(
        "❌ No skills detected in description. Please be more specific."
      );
      return { skills: [], matches: [] };
    }

    // Step 2: Find employees with these skills
    const potentialEmployees = await findEmployees(requiredSkills, 90);

    // Step 3: Rank employees by skill match and workload
    const rankedEmployees = potentialEmployees
      .map((employee) => {
        const matchingSkills = employee.skills.filter((skill) =>
          requiredSkills.includes(skill)
        );
        const matchScore =
          (matchingSkills.length / requiredSkills.length) * 100;

        return {
          ...employee.toObject(),
          matchingSkills,
          matchScore: Math.round(matchScore),
          availability: 100 - employee.workload,
        };
      })
      .sort(
        (a, b) => b.matchScore - a.matchScore || b.availability - a.availability
      );

    console.log(`✅ Found ${rankedEmployees.length} potential team members`);

    return {
      skills: requiredSkills,
      matches: rankedEmployees,
    };
  } catch (error) {
    console.error("❌ Error in team matching:", error.message);
    return { skills: [], matches: [] };
  }
};

/**
 * Simple AI-like task generation from project description
 */
const generateTasksFromDescription = (projectDescription, numTasks = 3) => {
  if (!projectDescription || typeof projectDescription !== "string") {
    console.error("❌ Project description is required");
    return [];
  }

  console.log(`🤖 Generating ${numTasks} tasks from project description...`);

  const taskTemplates = {
    website: [
      "Setup frontend framework",
      "Design user interface",
      "Implement backend API",
      "Setup database",
      "Deploy to production",
    ],
    mobile: [
      "Setup mobile development environment",
      "Design app screens",
      "Implement core features",
      "Test on devices",
      "App store submission",
    ],
    api: [
      "Design API endpoints",
      "Implement authentication",
      "Create database models",
      "Write API documentation",
      "Deploy API server",
    ],
    ecommerce: [
      "Setup product catalog",
      "Implement shopping cart",
      "Add payment processing",
      "Setup user accounts",
      "Deploy and test",
    ],
    data: [
      "Collect and clean data",
      "Build data models",
      "Create data visualization",
      "Implement data processing",
      "Deploy data pipeline",
    ],
  };

  // Detect project type from description
  const description = projectDescription.toLowerCase();
  let projectType = "general";

  if (
    description.includes("website") ||
    description.includes("web") ||
    description.includes("frontend")
  ) {
    projectType = "website";
  } else if (
    description.includes("mobile") ||
    description.includes("app") ||
    description.includes("ios") ||
    description.includes("android")
  ) {
    projectType = "mobile";
  } else if (
    description.includes("api") ||
    description.includes("backend") ||
    description.includes("server")
  ) {
    projectType = "api";
  } else if (
    description.includes("ecommerce") ||
    description.includes("e-commerce") ||
    description.includes("store")
  ) {
    projectType = "ecommerce";
  } else if (
    description.includes("data") ||
    description.includes("analytics") ||
    description.includes("processing")
  ) {
    projectType = "data";
  }

  const templates = taskTemplates[projectType] || [
    "Project setup and planning",
    "Core feature implementation",
    "Testing and quality assurance",
    "Deployment and launch",
    "Documentation and handover",
  ];

  const generatedTasks = [];
  const usedIndices = new Set();

  while (
    generatedTasks.length < numTasks &&
    generatedTasks.length < templates.length
  ) {
    const randomIndex = Math.floor(Math.random() * templates.length);
    if (!usedIndices.has(randomIndex)) {
      usedIndices.add(randomIndex);
      let task = templates[randomIndex];

      if (description.includes("react")) {
        task = task.replace("frontend", "React frontend");
      }
      if (description.includes("node")) {
        task = task.replace("backend", "Node.js backend");
      }
      if (description.includes("mongodb")) {
        task = task.replace("database", "MongoDB database");
      }

      generatedTasks.push({
        description: task,
        status: "pending",
        assigned_to: null,
      });
    }
  }

  console.log(`✅ Generated ${generatedTasks.length} tasks`);
  return generatedTasks;
};

/**
 * Generate tasks for existing project
 */
const generateTasksForProject = async (projectName, numTasks = 3) => {
  try {
    console.log(`🤖 Generating tasks for project: ${projectName}`);

    const project = await Project.findOne({ name: projectName });
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    const newTasks = generateTasksFromDescription(
      project.description,
      numTasks
    );
    project.tasks = [...project.tasks, ...newTasks];
    await project.save();

    console.log(`✅ Added ${newTasks.length} tasks to "${projectName}"`);
    return project;
  } catch (error) {
    console.error("❌ Error generating tasks:", error.message);
    return null;
  }
};

/**
 * Assign task to team member with validation
 */
const assignTask = async (projectName, taskIndex, employeeName) => {
  try {
    console.log(
      `📋 Assigning task ${taskIndex} to ${employeeName} in ${projectName}`
    );

    const project = await Project.findOne({ name: projectName });
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (taskIndex < 1 || taskIndex > project.tasks.length) {
      throw new Error(
        `Task ${taskIndex} not found. Project has ${project.tasks.length} tasks.`
      );
    }

    const employee = await Employee.findOne({ name: employeeName });
    if (!employee) {
      throw new Error(`Employee "${employeeName}" not found`);
    }

    if (!project.team.includes(employeeName)) {
      throw new Error(`Employee "${employeeName}" is not in project team`);
    }

    const task = project.tasks[taskIndex - 1];
    task.assigned_to = employeeName;
    task.status = "in-progress";
    await project.save();

    console.log(`✅ Task "${task.description}" assigned to ${employeeName}`);
    return project;
  } catch (error) {
    console.error("❌ Error assigning task:", error.message);
    return null;
  }
};

/**
 * Update task status
 */
const updateTaskStatus = async (projectName, taskIndex, newStatus) => {
  try {
    const validStatuses = ["pending", "in-progress", "completed", "blocked"];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    console.log(
      `🔄 Updating task ${taskIndex} status to ${newStatus} in ${projectName}`
    );

    const project = await Project.findOne({ name: projectName });
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (taskIndex < 1 || taskIndex > project.tasks.length) {
      throw new Error(
        `Task ${taskIndex} not found. Project has ${project.tasks.length} tasks.`
      );
    }

    const task = project.tasks[taskIndex - 1];
    const oldStatus = task.status;
    task.status = newStatus;
    await project.save();

    console.log(
      `✅ Task "${task.description}" status changed from ${oldStatus} to ${newStatus}`
    );
    return project;
  } catch (error) {
    console.error("❌ Error updating task status:", error.message);
    return null;
  }
};

/**
 * Simple team proposal without approval
 */
const proposeTeamSimple = async (projectDescription) => {
  const matchingResult = await findTeamForProject(projectDescription);

  if (matchingResult.matches.length === 0) {
    return {
      success: false,
      message: "No suitable team members found",
      proposedTeam: [],
    };
  }

  const proposedTeam = matchingResult.matches.slice(0, 3);
  const skillsCoverage = Math.round(
    (new Set(proposedTeam.flatMap((emp) => emp.matchingSkills)).size /
      matchingResult.skills.length) *
      100
  );

  return {
    success: true,
    message: `Found ${proposedTeam.length} team members with ${skillsCoverage}% skills coverage`,
    proposedTeam: proposedTeam,
    requiredSkills: matchingResult.skills,
    skillsCoverage: skillsCoverage,
  };
};

/**
 * Get project status with error handling
 */
const getProjectStatus = async (projectName) => {
  try {
    if (!projectName || projectName.trim().length < 2) {
      console.error("❌ Project name is required");
      return null;
    }

    const project = await Project.findOne({ name: projectName });
    if (!project) {
      console.error(`❌ Project "${projectName}" not found`);
      return null;
    }

    return project;
  } catch (error) {
    return handleError(error, "Project status check");
  }
};

// Export all functions
export {
  findEmployees,
  createProject,
  assignTeam,
  getProjectStatus,
  extractSkillsFromDescription,
  findTeamForProject,
  proposeTeamSimple,
  generateTasksFromDescription,
  generateTasksForProject,
  assignTask,
  updateTaskStatus,
  handleError,
};
