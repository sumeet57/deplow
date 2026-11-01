import mongoose from "mongoose";



const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    unique: true,
  },
  avatar: {
    type: String,
  },
});

const User = mongoose.model("User", userSchema);

export default User;