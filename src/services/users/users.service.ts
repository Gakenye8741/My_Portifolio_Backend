import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import { users, TInsertUser, TSelectUser } from "../../drizzle/schema";

// Get all users, ordered by id descending
export const getAllUsersServices = async (): Promise<TSelectUser[]> => {
  return await db.query.users.findMany({
    orderBy: [desc(users.id)],
  });
};

// Get a single user by id
export const getUserByIdServices = async (id: number): Promise<TSelectUser | undefined> => {
  return await db.query.users.findFirst({
    where: eq(users.id, id),
  });
};

// Create a new user
export const createUserServices = async (user: TInsertUser): Promise<string> => {
  await db.insert(users).values(user).returning();
  return "User Created Successfully!";
};

// Update a user by id
export const updateUserServices = async (id: number, user: Partial<TInsertUser>): Promise<string> => {
  const updatedUser = await db
    .update(users)
    .set(user)
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser.length) {
    throw new Error("User not found");
  }

  return "User Updated Successfully!";
};

// Delete a user by id
export const deleteUserServices = async (id: number): Promise<string> => {
  const deletedCount = await db
    .delete(users)
    .where(eq(users.id, id));

  if (!deletedCount) {
    throw new Error("User not found");
  }

  return "User Deleted Successfully!";
};
