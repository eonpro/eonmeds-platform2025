import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Audit routes
router.get(
  "/",
  authenticateToken,
  async (_req: Request, res: Response): Promise<Response> => {
    return res.json({ message: "Audit routes not implemented yet" });
  },
);

export default router;
