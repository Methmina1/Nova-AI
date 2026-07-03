/**
 * Comprehensive validation utilities for HR Team Builder
 */

class Validation {
  /**
   * Validate employee data
   */
  static validateEmployee(employeeData) {
    const errors = [];

    if (!employeeData.name || employeeData.name.trim().length < 2) {
      errors.push("Employee name must be at least 2 characters long");
    }

    if (!employeeData.email || !this.isValidEmail(employeeData.email)) {
      errors.push("Valid email address is required");
    }

    if (!employeeData.department || employeeData.department.trim().length < 2) {
      errors.push("Department must be specified");
    }

    if (employeeData.workload < 0 || employeeData.workload > 100) {
      errors.push("Workload must be between 0 and 100");
    }

    if (!Array.isArray(employeeData.skills)) {
      errors.push("Skills must be an array");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate project data
   */
  static validateProject(projectData) {
    const errors = [];

    if (!projectData.name || projectData.name.trim().length < 3) {
      errors.push("Project name must be at least 3 characters long");
    }

    if (
      !projectData.description ||
      projectData.description.trim().length < 10
    ) {
      errors.push("Project description must be at least 10 characters long");
    }

    if (projectData.name && projectData.name.length > 50) {
      errors.push("Project name cannot exceed 50 characters");
    }

    if (projectData.description && projectData.description.length > 500) {
      errors.push("Project description cannot exceed 500 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate skills array
   */
  static validateSkills(skills) {
    const errors = [];

    if (!Array.isArray(skills)) {
      errors.push("Skills must be provided as an array");
      return { isValid: false, errors };
    }

    if (skills.length === 0) {
      errors.push("At least one skill is required");
    }

    if (skills.length > 20) {
      errors.push("Cannot specify more than 20 skills");
    }

    for (const skill of skills) {
      if (typeof skill !== "string") {
        errors.push("All skills must be strings");
        break;
      }
      if (skill.trim().length === 0) {
        errors.push("Skills cannot be empty strings");
        break;
      }
      if (skill.length > 50) {
        errors.push(`Skill "${skill}" is too long (max 50 characters)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input) {
    if (typeof input !== "string") return "";
    return input.trim().replace(/[<>]/g, "");
  }

  /**
   * Validate task assignment
   */
  static validateTaskAssignment(project, taskIndex, employeeName) {
    const errors = [];

    if (!project) {
      errors.push("Project not found");
      return { isValid: false, errors };
    }

    if (!project.tasks || project.tasks.length === 0) {
      errors.push("Project has no tasks");
      return { isValid: false, errors };
    }

    if (taskIndex < 1 || taskIndex > project.tasks.length) {
      errors.push(`Task number must be between 1 and ${project.tasks.length}`);
    }

    if (!project.team.includes(employeeName)) {
      errors.push(`Employee "${employeeName}" is not part of the project team`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate workload constraints
   */
  static validateWorkload(employee, additionalWorkload = 0) {
    const errors = [];

    if (!employee) {
      errors.push("Employee not found");
      return { isValid: false, errors };
    }

    const newWorkload = employee.workload + additionalWorkload;
    if (newWorkload > 100) {
      errors.push(
        `Assignment would exceed workload limit (current: ${employee.workload}%, new total: ${newWorkload}%)`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Validation;
