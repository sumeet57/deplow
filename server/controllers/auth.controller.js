// src/controllers/auth.controller.js
import { googleAuthService } from "../services/auth.service.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
export const handleGoogleAuth = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    throw new ApiError(400, "Access token is required");
  }

  const user = await googleAuthService(accessToken);

  req.session.userId = user._id;

  await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(new ApiError(500, "Failed to save session"));
      resolve();
    });
  });

  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };

  return new ApiResponse(200, "Authentication successful", userData).send(res);
});

export const handleLogout = (req, res) => {
  
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    // what is use of googleId in user model? is it necessary to exclude it from the response? : The `googleId` field in the user model is typically used to store the unique identifier provided by Google when a user authenticates via Google OAuth. This ID can be useful for linking the user's account in your application with their Google account, allowing for features like single sign-on or retrieving additional information from Google.
    const user = await User.findById(req.session.userId)
      .select("name email phoneNumber avatar purchased createdAt updatedAt")
      .populate("purchased", "name price imageUrl _id link"); // Populate purchased projects with selected fields

    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
