import { prisma } from "../lib/prisma.js";
import AppError from "./AppError.js";

/**
 * Resolves a User ID to their Organizer profile.
 * Throws 403 if the user does not have an organizer profile.
 */
export async function getOrganizerByUserId(userId: string) {
  const organizer = await prisma.organizer.findUnique({
    where: { userId },
  });

  if (!organizer) {
    throw new AppError(403, "You must create an organizer profile first");
  }

  return organizer;
}
