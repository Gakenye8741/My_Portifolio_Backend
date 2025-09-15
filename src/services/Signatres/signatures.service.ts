import { eq, desc } from "drizzle-orm";
import db from "../../drizzle/db";
import { signatures, TInsertSignature, TSelectSignature } from "../../drizzle/schema";

// ==========================
// GET ALL SIGNATURES
// ==========================
export const getAllSignaturesServices = async (
  meetingId?: number
): Promise<TSelectSignature[]> => {
  if (meetingId) {
    return await db.query.signatures.findMany({
      where: eq(signatures.meetingId, meetingId),
      with: { meeting: true, user: true },
      orderBy: [desc(signatures.id)],
    });
  }

  return await db.query.signatures.findMany({
    with: { meeting: true, user: true },
    orderBy: [desc(signatures.id)],
  });
};

// ==========================
// GET SIGNATURE BY ID
// ==========================
export const getSignatureByIdServices = async (
  id: number
): Promise<TSelectSignature | undefined> => {
  return await db.query.signatures.findFirst({
    where: eq(signatures.id, id),
    with: { meeting: true, user: true },
  });
};

// ==========================
// GET SIGNATURES BY MEETING ID
// ==========================
export const getSignaturesByMeetingIdServices = async (
  meetingId: number
): Promise<TSelectSignature[]> => {
  return await db.query.signatures.findMany({
    where: eq(signatures.meetingId, meetingId),
    with: { meeting: true, user: true },
    orderBy: [desc(signatures.id)],
  });
};

// ==========================
// CREATE SIGNATURE
// ==========================
export const createSignatureServices = async (
  signature: TInsertSignature
): Promise<TSelectSignature> => {
  const [newSignature] = await db.insert(signatures).values(signature).returning();
  return newSignature;
};

// ==========================
// UPDATE SIGNATURE
// ==========================
export const updateSignatureServices = async (
  id: number,
  data: Partial<TInsertSignature>
): Promise<string> => {
  const updatedSignature = await db
    .update(signatures)
    .set(data)
    .where(eq(signatures.id, id))
    .returning();

  if (!updatedSignature.length) throw new Error("Signature not found");
  return "Signature Updated Successfully!";
};

// ==========================
// DELETE SIGNATURE
// ==========================
export const deleteSignatureServices = async (id: number): Promise<string> => {
  const deletedSignature = await db
    .delete(signatures)
    .where(eq(signatures.id, id))
    .returning();

  if (!deletedSignature.length) throw new Error("Signature not found");
  return "Signature Deleted Successfully!";
};
