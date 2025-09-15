import { Router } from "express";
import {
  getAllSignatures,
  getSignatureById,
  getSignaturesByMeetingId,
  createSignature,
  updateSignature,
  deleteSignature,
} from "./signatures.controller";

const signaturesRouter = Router();

// ==========================
// ROUTES (aligned with controller names)
// ==========================

// ✅ GET all signatures (optional filter by ?meetingId=1)
signaturesRouter.get("/AllSignatures", getAllSignatures);

// ✅ GET all signatures for a specific meeting
signaturesRouter.get("/MeetingSignatures/:meetingId", getSignaturesByMeetingId);

// ✅ GET a single signature by ID
signaturesRouter.get("/SignatureById/:id", getSignatureById);

// ✅ ADD a new signature
signaturesRouter.post("/AddSignature", createSignature);

// ✅ UPDATE a signature by ID
signaturesRouter.put("/UpdateSignature/:id", updateSignature);

// ✅ DELETE a signature by ID
signaturesRouter.delete("/DeleteSignature/:id", deleteSignature);

export default signaturesRouter;
