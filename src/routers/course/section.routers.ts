import { NextFunction, Request, Response, Router } from "express";
import { body } from "express-validator";
import { SectionService } from "../../service/course/section.service";
import { currentUser, requireAuth, ValidationRequest } from "../../../common";

const router = Router();
const sectionService = new SectionService();

router.get(
  "/api/courses/:id/sections",
  async (req: Request, res: Response, next: NextFunction) => {
    const courseId = req.params.id;
    const sections = await sectionService.findAll(courseId);
    res.send(sections);
  }
);

router.get(
  "/api/courses/:id/sections/:sectionId",
  async (req: Request, res: Response, next: NextFunction) => {
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const section = await sectionService.findOne(courseId, sectionId);
    res.send(section);
  }
);

router.post(
  "/api/courses/:id/sections/create-section",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("orderIndex")
      .not()
      .isEmpty()
      .withMessage("Please enter an order index"),
    body("isPreview")
      .not()
      .isEmpty()
      .withMessage("Please enter a preview status"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.currentUser!.userId;
    const courseId = req.params.id;
    const sectionDto = req.body;
    const result = await sectionService.create(userId, courseId, sectionDto);
    res.send(result);
  }
);

router.put(
  "/api/courses/:id/sections/:sectionId/update-section",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("orderIndex")
      .not()
      .isEmpty()
      .withMessage("Please enter an order index"),
    body("isPreview")
      .not()
      .isEmpty()
      .withMessage("Please enter a preview status"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,

  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.currentUser!.userId;
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const sectionDto = req.body;
    const result = await sectionService.update(
      userId,
      courseId,
      sectionId,
      sectionDto
    );
    res.send(result);
  }
);

router.delete(
  "/api/courses/:id/sections/:sectionId/delete-section",
  requireAuth,
  currentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.currentUser!.userId;
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const result = await sectionService.delete(userId, courseId, sectionId);
    res.send(result);
  }
);

export { router as sectionRouter };
