import dotenv from "dotenv";
import AppError from "../helpers/AppError.js";

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
}

const loadEnvVariables = (): EnvConfig => {
  const requireEnvVariable = ["NODE_ENV"];

  requireEnvVariable.forEach((variable) => {
    if (!process.env[variable]) {
      // throw new Error(`Environment variable ${variable} is required but not set in .env file.`);
      throw new AppError(
        500,
        `Environment variable ${variable} is required but not set in .env file.`,
      );
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV as string,
  };
};

export const envVars = loadEnvVariables();
