import { Request, Response, NextFunction } from "express";
import { GoogleGenAI } from "@google/genai";
import AppError from "../../helpers/AppError.js";

export const generateDescription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, type, locationLabel } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      throw new AppError(500, "GEMINI_API_KEY is not configured in the server environment.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Write a short, engaging commercial description (2 to 3 sentences max) for a sports facility named "${name || "Premium Court"}". 
It is a "${type || "Sports"}" court located in "${locationLabel || "a prime location"}". 
Make it sound exciting for players to book. Do not use asterisks (*) or markdown formatting. Start directly with the description without any introduction.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.status(200).json({
      success: true,
      data: {
        description: response.text?.trim()
      }
    });
  } catch (error: any) {
    console.error("AI Gen Error: ", error);
    next(new AppError(500, error.message || "Failed to generate AI description"));
  }
};
