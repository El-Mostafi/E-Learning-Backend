import mongoose from "mongoose";
import { courseDataGenerale } from "../../../Helpers/course/course.data";
import Course, { CourseDocument, Lecture, Section } from "../../models/course";

export class PopularityService {
  constructor() {}

  async getPopularCourses(
    minRating = 3.0,
    page = 1,
    limit = 8,
    category?: string,
    filterParams?: {
      ratings?: number[] | undefined;
      instructors?: string[] | undefined;
      price?: string | undefined;
      levels?: string[] | undefined;
      categories?: string[] | undefined;
      search?: string | undefined;
    },
    pagination?: boolean
  ) {
    let filterByLevels =
      filterParams && filterParams.levels && Array.isArray(filterParams.levels);

    let filterByPrice = filterParams && filterParams.price;

    let filterByCategories =
      filterParams &&
      filterParams.categories &&
      Array.isArray(filterParams.categories);

    let keywordSearch = filterParams && filterParams.search;
    // Build keyword search filter if needed
    let keywordMatch: any = {};
    if (
      keywordSearch &&
      typeof filterParams!.search === "string" &&
      filterParams!.search.trim() !== ""
    ) {
      const searchRegex = new RegExp(filterParams!.search.trim(), "i");
      keywordMatch = {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { "category.name": searchRegex },
        ],
      };
    }

    let filterByInstructors =
      filterParams &&
      filterParams.instructors &&
      Array.isArray(filterParams.instructors);

    let instructorObjectIds: mongoose.Types.ObjectId[] = [];
    if (filterByInstructors) {
      instructorObjectIds = filterParams!.instructors!.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
    }

    const skip = (page - 1) * limit;

    // console.log("Input parameters:", { minRating, page, limit, category });

    try {
      // Build match conditions
      const initialMatch: any = { isPublished: true };

      // Add category filter if specified and not "All"
      if (category && category !== undefined) {
        initialMatch["category.name"] = category;
      }

      // console.log("Initial match conditions:", initialMatch);

      const aggregationResult = await Course.aggregate([
        // Step 1: Match published courses and category if specified
        { $match: initialMatch },

        // Step 2: Calculate enrollment count and average rating
        {
          $addFields: {
            enrollmentCount: { $size: "$students" },
            averageRating: {
              $cond: [
                { $eq: [{ $size: "$reviews" }, 0] },
                0,
                { $avg: "$reviews.rating" },
              ],
            },
          },
        },

        filterByLevels
          ? {
              $match: {
                level: { $in: filterParams!.levels },
              },
            }
          : { $match: {} },

        filterByCategories
          ? {
              $match: {
                "category.name": { $in: filterParams!.categories },
              },
            }
          : { $match: {} },

        filterByPrice
          ? {
              $match: {
                "pricing.isFree": filterParams!.price === "Free",
              },
            }
          : { $match: {} },

        filterByInstructors
          ? {
              $match: {
                instructor: { $in: instructorObjectIds },
              },
            }
          : { $match: {} },

        // Keyword search match
        Object.keys(keywordMatch).length > 0
          ? { $match: keywordMatch }
          : { $match: {} },

        // Step 3: Filter by minimum rating
        {
          $match: {
            averageRating: { $gte: minRating },
          },
        },

        // Step 4: Use facet to get both paginated results and total count
        {
          $facet: {
            paginatedResults: [
              // Sort by enrollment count first, then by rating
              { $sort: { enrollmentCount: -1, averageRating: -1 } },
              { $skip: skip },
              { $limit: limit },
              // Lookup instructor details with role filter
              {
                $lookup: {
                  from: "users",
                  let: { instructorId: "$instructor" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: ["$_id", "$$instructorId"] },
                            {
                              $or: [
                                { $eq: ["$role", "instructor"] },
                                { $eq: ["$role", "admin"] },
                              ],
                            },
                          ],
                        },
                      },
                    },
                  ],
                  as: "instructorDetails",
                },
              },
              // Add instructor field with proper fallback
              {
                $addFields: {
                  instructor: {
                    $cond: [
                      { $gt: [{ $size: "$instructorDetails" }, 0] },
                      { $arrayElemAt: ["$instructorDetails", 0] },
                      null,
                    ],
                  },
                },
              },
              // Project the fields we need
              {
                $project: {
                  _id: 1,
                  title: 1,
                  description: 1,
                  thumbnailPreview: 1,
                  level: 1,
                  language: 1,
                  pricing: 1,
                  oldPrice: 1,
                  category: 1,
                  reviews: 1,
                  sections: 1,
                  instructor: 1,
                  students: 1,
                  enrollmentCount: 1,
                  averageRating: 1,
                  createdAt: 1,
                  isPublished: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },

        // Step 5: Format the final result
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
      // console.log("Final result:", result.data);
      // Transform the courses to match your courseDataGenerale interface
      const transformedCourses = await Promise.all(
        (result.data || []).map(async (course: CourseDocument) => {
          return this.transformCourseGenerale(course);
        })
      );

      return {
        data: transformedCourses,
        totalCount: pagination
          ? result.totalCount
          : transformedCourses.length || 0,
      };
    } catch (error) {
      console.error("Error in getPopularCourses:", error);
      throw error;
    }
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
      instructorName:
        (course.instructor as any).userName || "Unknown Instructor",
      instructorImg: (course.instructor as any).profileImg || "",
      InstructorId: (course.instructor as any).id || "",
      createdAt: course.createdAt,
    };
  }
}
