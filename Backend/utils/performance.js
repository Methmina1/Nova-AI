/**
 * Performance optimization utilities for HR Team Builder
 */

class PerformanceOptimizer {
  /**
   * Cache for frequent queries (simple in-memory cache)
   */
  static cache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached result or execute query
   */
  static async withCache(key, queryFn, ttl = this.CACHE_TTL) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`⚡ Using cached result for: ${key}`);
      return cached.data;
    }

    const result = await queryFn();
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Clear cache for specific key or all cache
   */
  static clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      console.log(`🧹 Cleared cache for: ${key}`);
    } else {
      this.cache.clear();
      console.log("🧹 Cleared all cache");
    }
  }

  /**
   * Optimized employee search with projection
   */
  static async optimizedEmployeeSearch(skills, maxWorkload = 100, limit = 10) {
    const Employee = require("../models/Employee");

    return await Employee.find({
      skills: { $in: skills },
      workload: { $lt: maxWorkload },
    })
      .select("name department skills workload email") // Only needed fields
      .sort({ workload: 1 })
      .limit(limit)
      .lean(); // Return plain JavaScript objects for better performance
  }

  /**
   * Batch operations for better performance
   */
  static async batchEmployeeUpdates(updates) {
    const Employee = require("../models/Employee");
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.employeeId },
        update: { $set: update.fields },
      },
    }));

    if (bulkOps.length > 0) {
      const result = await Employee.bulkWrite(bulkOps);
      console.log(`✅ Batch updated ${result.modifiedCount} employees`);
      return result;
    }

    return { modifiedCount: 0 };
  }

  /**
   * Paginated project listing
   */
  static async getProjectsPaginated(page = 1, limit = 10, status = null) {
    const Project = require("../models/Project");

    const skip = (page - 1) * limit;
    const query = status ? { status } : {};

    const [projects, total] = await Promise.all([
      Project.find(query)
        .select("name status team required_skills tasks")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query),
    ]);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Performance monitoring decorator
   */
  static monitorPerformance(fn, context) {
    return async (...args) => {
      const startTime = Date.now();

      try {
        const result = await fn(...args);
        const executionTime = Date.now() - startTime;

        // Log slow operations
        if (executionTime > 1000) {
          console.warn(`🐌 SLOW OPERATION: ${context} took ${executionTime}ms`);
        } else if (executionTime > 500) {
          console.log(`⚡ ${context} completed in ${executionTime}ms`);
        }

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        console.error(
          `❌ ${context} failed after ${executionTime}ms:`,
          error.message
        );
        throw error;
      }
    };
  }
}

module.exports = PerformanceOptimizer;
