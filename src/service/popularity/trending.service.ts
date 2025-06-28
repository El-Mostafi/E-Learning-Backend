import { courseDataGenerale } from "../../../Helpers/course/course.data";
import mongoose from "mongoose";
import Course, { CourseDocument, Lecture, Section } from "../../models/course";

export class TrendingService {
  constructor() {}

  async getHybridTrending(limit = 10, page: number, category?: string, pagination?: boolean) {
    const now = new Date();

    const skip = (page - 1) * limit;

    const initialMatch: any = { isPublished: true };

    if (category && category !== "All") {
      initialMatch["category.name"] = category;
    }

    const aggregationResult = await Course.aggregate([
      { $match: initialMatch },
      {
        $addFields: {
          totalEnrollments: { $size: "$students" },
          totalReviews: { $size: "$reviews" },
          courseAgeInDays: {
            $max: [
              1, // Minimum age of 1 day to prevent division by zero
              {
                $divide: [
                  {
                    $subtract: [
                      now,
                      {
                        $ifNull: [
                          {
                            $cond: [
                              { $eq: [{ $type: "$createdAt" }, "date"] },
                              "$createdAt",
                              {
                                $dateFromString: {
                                  dateString: "$createdAt",
                                  onError: new Date(), // Fallback to current date if parsing fails
                                },
                              },
                            ],
                          },
                          new Date(), // Fallback if createdAt is null
                        ],
                      },
                    ],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
            ],
          },
          averageRating: {
            $cond: [
              { $eq: [{ $size: "$reviews" }, 0] },
              0,
              { $avg: "$reviews.rating" },
            ],
          },
        },
      },

      // Filter minimum viable courses
      {
        $match: {
          totalEnrollments: { $gte: 2 },
          courseAgeInDays: { $gte: 1 },
        },
      },

      // Calculate hybrid trending score
      {
        $addFields: {
          // Velocity component (40% weight)
          velocityScore: {
            $multiply: [
              0.4,
              { $divide: ["$totalEnrollments", "$courseAgeInDays"] },
            ],
          },

          // Recency component (30% weight)
          recencyScore: {
            $multiply: [
              0.3,
              { $exp: { $divide: [-1, { $add: ["$courseAgeInDays", 1] }] } },
            ],
          },

          // Quality component (20% weight)
          qualityScore: {
            $multiply: [
              0.2,
              {
                $multiply: [
                  "$averageRating",
                  { $ln: { $add: ["$totalReviews", 1] } },
                ],
              },
            ],
          },

          // Momentum component (10% weight)
          momentumScore: {
            $multiply: [0.1, { $ln: { $add: ["$totalEnrollments", 1] } }],
          },
        },
      },

      {
        $addFields: {
          trendingScore: {
            $add: [
              "$velocityScore",
              "$recencyScore",
              "$qualityScore",
              "$momentumScore",
            ],
          },
        },
      },

      {
        $facet: {
          paginatedResults: [
            { $sort: { trendingScore: -1 } },
            { $skip: skip },
            { $limit: limit },

            // Add instructor details
            {
              $lookup: {
                from: "users",
                localField: "instructor",
                foreignField: "_id",
                as: "instructorDetails",
              },
            },
            {
              $addFields: {
                instructor: { $arrayElemAt: ["$instructorDetails", 0] },
              },
            },
          ],

          totalCount: [{ $count: "count" }],
        },
      },

      {
        $project: {
          data: "$paginatedResults",
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
        },
      },
    ]);

    // console.log(
    //   "Aggregation completed, result length:",
    //   aggregationResult.length
    // );

    const result = aggregationResult[0] || { data: [], totalCount: 0 };

    // console.log("Final result:", {
    //   dataLength: result.data?.length || 0,
    //   totalCount: result.totalCount || 0,
    // });

    // Transform the courses to match your courseDataGenerale interface
    const transformedCourses = await Promise.all(
      (result.data || []).map(async (course: CourseDocument) => {
        return this.transformCourseGenerale(course);
      })
    );

    return {
      data: transformedCourses,
      totalCount: pagination? result.totalCount: transformedCourses.length || 0,
    };
  }

  private transformCourseGenerale(course: CourseDocument): courseDataGenerale {
    const totalRating = course.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = course.reviews.length
      ? totalRating / course.reviews.length
      : 0;
    const totaleDuration = course.sections.reduce(
      (total: number, section: Section) => {
        return (
          total +
          section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
            return sectionTotal + lecture.duration;
          }, 0)
        );
      },
      0
    );
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      language: course.language,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      price: course.pricing.price,
      reviews: averageRating,
      duration: totaleDuration,
      students: course.students.length,
      instructorName: (course.instructor as any).userName,
      instructorImg: (course.instructor as any).profileImg,
      InstructorId: (course.instructor as any).id,
      createdAt: course.createdAt,
    };
  }
}

export default TrendingService;
