import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["planning", "active", "completed", "on-hold"],
      default: "planning",
    },
    required_skills: {
      type: [String],
      default: [],
    },
    team: {
      type: [String],
      default: [],
    },
    timeline: {
      type: String,
      default: "TBD",
      trim: true,
    },
    budget: {
      type: String,
      default: "$0",
      trim: true,
    },
    tasks: [
      {
        description: {
          type: String,
          required: true,
          trim: true,
        },
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed", "blocked"],
          default: "pending",
        },
        assigned_to: {
          type: String,
          default: null,
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ required_skills: 1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model("Project", projectSchema);
export default Project;
