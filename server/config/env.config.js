import { configDotenv } from "dotenv";

configDotenv({ path: ".env" });


const env = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || "development",
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/deplow",
    SESSION_SECRET: process.env.SESSION_SECRET || "mysecret",
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
}

export default env;