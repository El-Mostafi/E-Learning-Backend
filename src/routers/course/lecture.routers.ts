import { currentUser, ValidationRequest } from "../../../common";
import { Request, Response, Router } from "express";
import { body } from "express-validator";
import { LectureService } from "../../service/course/lecture.service";
import { LectureDto } from "./dtos/course.dto";

const router = Router();

const lectureService = new LectureService();

router.get(
  "/api/courses/:id/sections/:sectionId/lectures",
  async (req, res) => {
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const lectures = await lectureService.findAll(courseId, sectionId);
    res.send(lectures);
  }
);

router.get(
  "/api/courses/:id/sections/:sectionId/lectures:lectureId",
  async (req, res) => {
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const lectureId = req.params.lectureId;
    const lecture = await lectureService.findOne(courseId, sectionId, lectureId);
    res.send(lecture);
  }
);

router.post(
  "/api/courses/:id/sections/:sectionId/lectures/create-lecture",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("duration").not().isEmpty().withMessage("Please enter a duration"),
    body("videoUrl").not().isEmpty().withMessage("Please enter a video URL"),
    body("thumbnailUrl")
      .not()
      .isEmpty()
      .withMessage("Please enter a thumbnail URL"),
  ],
  ValidationRequest,
  currentUser,
  async (req: Request, res: Response) => {
    const userId = req.currentUser!.userId;
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const lectureDto: LectureDto = req.body;
    const result = await lectureService.create(userId, courseId, sectionId, lectureDto);
    res.send(result);
  }
);

router.put(
  "/api/courses/:id/sections/:sectionId/lectures/:lectureId/update-lecture",
  [
    body("title").not().isEmpty().withMessage("Please enter a title"),
    body("duration").not().isEmpty().withMessage("Please enter a duration"),
    body("videoUrl").not().isEmpty().withMessage("Please enter a video URL"),
    body("thumbnailUrl")
      .not()
      .isEmpty()
      .withMessage("Please enter a thumbnail URL"),
  ],
  ValidationRequest,
    currentUser,
  async (req: Request, res: Response) => {
    const userId = req.currentUser!.userId;
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const lectureId = req.params.lectureId;
    const lectureDto = req.body;
    const result = await lectureService.update(
        userId,
      courseId,
      sectionId,
      lectureId,
      lectureDto
    );
    res.send(result);
  }
);

router.delete(
  "/api/courses/:id/sections/:sectionId/lectures/:lectureId/delete-lecture",
    currentUser,
  async (req: Request, res: Response) => {
    const userId = req.currentUser!.userId;
    const courseId = req.params.id;
    const sectionId = req.params.sectionId;
    const lectureId = req.params.lectureId;
    const result = await lectureService.delete(userId, courseId, sectionId, lectureId);
    res.send(result);
  }
);

export { router as lectureRouter };