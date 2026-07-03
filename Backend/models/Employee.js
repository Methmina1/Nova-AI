import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    workload: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ skills: 1 });
employeeSchema.index({ department: 1 });

const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
