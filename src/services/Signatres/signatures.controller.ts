import { Request, Response } from "express";
import {
  getAllSignaturesServices,
  getSignatureByIdServices,
  getSignaturesByMeetingIdServices,
  createSignatureServices,
  updateSignatureServices,
  deleteSignatureServices,
} from "./signatures.service";

// ==========================
// GET ALL SIGNATURES
// ==========================
export const getAllSignatures = async (req: Request, res: Response) => {
  try {
    const meetingId = req.query.meetingId ? Number(req.query.meetingId) : undefined;
    const signatures = await getAllSignaturesServices(meetingId);

    if (!signatures || signatures.length === 0) {
      res.status(404).json({ error: "No signatures found" });
      return;
    }

    res.status(200).json(signatures);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// ==========================
// GET SIGNATURE BY ID
// ==========================
export const getSignatureById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid signature ID" });
    return;
  }

  try {
    const signature = await getSignatureByIdServices(id);
    if (!signature) {
      res.status(404).json({ error: "Signature not found" });
    } else {
      res.status(200).json(signature);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// ==========================
// GET SIGNATURES BY MEETING
// ==========================
export const getSignaturesByMeetingId = async (req: Request, res: Response) => {
  const meetingId = Number(req.params.meetingId);
  if (isNaN(meetingId)) {
    res.status(400).json({ error: "Invalid meeting ID" });
    return;
  }

  try {
    const signatures = await getSignaturesByMeetingIdServices(meetingId);
    res.status(200).json(signatures);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// ==========================
// CREATE SIGNATURE
// ==========================
export const createSignature = async (req: Request, res: Response) => {
  try {
    const { meetingId, userId, role } = req.body;

    if (!meetingId || !userId || !role) {
      res.status(400).json({
        error: "meetingId, userId, and role are required",
      });
      return;
    }

    const validRoles: Array<"Secretary General" | "Chairman"> = [
      "Secretary General",
      "Chairman",
    ];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
      return;
    }

    // Prevent duplicate signature for same meeting + same user + same role
    const existingSignatures = await getSignaturesByMeetingIdServices(Number(meetingId));
    const duplicate = existingSignatures.find(
      (sig) => sig.signedBy === Number(userId) && sig.role === role
    );

    if (duplicate) {
      res.status(409).json({
        error: `This person has already signed as ${role} for this meeting.`,
      });
      return;
    }

    // ✅ Correctly store userId as number, do not convert signedBy
    const newSignature = await createSignatureServices({
      meetingId: Number(meetingId),
      signedBy: Number(userId),
      role,
    });

    res.status(201).json({
      message: "Signature created successfully!",
      data: newSignature,
    });
    return;
  } catch (error: any) {
    console.error("Error creating signature:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// ==========================
// UPDATE SIGNATURE
// ==========================
export const updateSignature = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid signature ID" });
    return;
  }

  const { role, userId } = req.body;
  const updates: Partial<any> = {};

  if (role) {
    const validRoles = ["Secretary General", "Chairman"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "Invalid role. Must be Secretary General or Chairman" });
      return;
    }
    updates.role = role;
  }

  if (userId) {
    if (isNaN(Number(userId))) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    updates.userId = Number(userId);
  }

  try {
    const result = await updateSignatureServices(id, updates);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};

// ==========================
// DELETE SIGNATURE
// ==========================
export const deleteSignature = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid signature ID" });
    return;
  }

  try {
    const result = await deleteSignatureServices(id);
    res.status(200).json({ message: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Error occurred" });
  }
};
