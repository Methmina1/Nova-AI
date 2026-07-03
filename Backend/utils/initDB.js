import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import Project from "../models/Project.js";
import dotenv from "dotenv";

dotenv.config();

const sampleEmployees = [
  {
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    department: "Engineering",
    skills: ["React", "JavaScript", "UI/UX", "TypeScript"],
    workload: 75,
  },
  {
    name: "Mike Johnson",
    email: "mike.johnson@company.com",
    department: "Backend",
    skills: ["Node.js", "API Design", "MongoDB", "Python"],
    workload: 60,
  },
  {
    name: "David Kim",
    email: "david.kim@company.com",
    department: "Mobile",
    skills: ["React Native", "iOS", "Android", "JavaScript"],
    workload: 45,
  },
  {
    name: "Lisa Wong",
    email: "lisa.wong@company.com",
    department: "Engineering",
    skills: ["React", "Vue.js", "CSS", "HTML5"],
    workload: 85,
  },
  {
    name: "Emma Davis",
    email: "emma.davis@company.com",
    department: "Data Science",
    skills: ["Python", "MongoDB", "API Design", "JavaScript"],
    workload: 30,
  },
  {
    name: "James Wilson",
    email: "james.wilson@company.com",
    department: "DevOps",
    skills: ["Docker", "AWS", "Linux", "Node.js"],
    workload: 70,
  },
  {
    name: "Rachel Green",
    email: "rachel.green@company.com",
    department: "Frontend",
    skills: ["React", "Vue.js", "CSS", "UI/UX", "JavaScript"],
    workload: 40,
  },
  {
    name: "Tom Brown",
    email: "tom.brown@company.com",
    department: "Backend",
    skills: ["Node.js", "Python", "MongoDB", "API Design", "Docker"],
    workload: 55,
  },
];

const sampleProjects = [
  {
    name: "E-commerce Website",
    description: "Build online store with React frontend and Node.js backend",
    status: "planning",
    required_skills: ["React", "Node.js", "MongoDB"],
    team: [],
  },
  {
    name: "Mobile Banking App",
    description: "Develop cross-platform mobile app for banking services",
    status: "planning",
    required_skills: ["React Native", "API Design", "JavaScript"],
    team: [],
  },
];

const initializeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected Successfully");

    // Clear existing data
    await Employee.deleteMany({});
    await Project.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // Insert sample data
    const employees = await Employee.insertMany(sampleEmployees);
    const projects = await Project.insertMany(sampleProjects);

    console.log(`✅ Added ${employees.length} employees`);
    console.log(`✅ Added ${projects.length} projects`);

    console.log("\n📊 Database Summary:");
    console.log("Employees:");
    employees.forEach((emp) => {
      console.log(
        `   - ${emp.name}: ${emp.skills.join(", ")} (${emp.workload}% workload)`
      );
    });

    console.log("\nProjects:");
    projects.forEach((proj) => {
      console.log(
        `   - ${proj.name}: Needs ${proj.required_skills.join(", ")}`
      );
    });

    console.log("\n🎯 Database initialized successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run initialization
initializeDatabase();
