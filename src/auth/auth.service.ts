import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { v4 as uuidv4 } from "uuid"; // Import UUID generator
import { 
  users, 
  TInsertUser, 
  TSelectUser 
} from "../drizzle/schema";

// ✅ Register a user
export const registerUserService = async (user: TInsertUser): Promise<string> => {
  // We spread the user data and manually inject a fresh UUID
  // This prevents the "null value" error in Postgres
  await db.insert(users).values({
    ...user,
    id: user.id ?? uuidv4(), // Use provided ID or generate a new one
  });
  
  return "User created successfully ✅";
};

// ✅ Get user by Email
export const getUserByEmailService = async (
  email: string
): Promise<TSelectUser | undefined> => {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
  });
};