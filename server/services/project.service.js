
import Project from "../models/project.model.js";

export const createProject = async (userId = "127782373247y3huc4", data) => {
  const project = await Project.create({
    userId,
    ...data
  });

  return project;
};

export const getProjects = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find({ userId })
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Project.countDocuments({ userId })
  ]);

  return {
    projects,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getProjectById = async (userId, projectId) => {
  return Project.findOne({
    _id: projectId,
    userId
  }).select("-__v");
};

export const updateProject = async (userId, projectId, data) => {
  return Project.findOneAndUpdate(
    {
      _id: projectId,
      userId
    },
    {
      $set: data
    },
    {
      new: true,
      runValidators: true
    }
  ).select("-__v");
};

export const deleteProject = async (userId, projectId) => {
  return Project.findOneAndDelete({
    _id: projectId,
    userId
  });
};
