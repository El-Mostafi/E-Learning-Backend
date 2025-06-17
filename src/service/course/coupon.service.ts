import mongoose from "mongoose";
import Course from "../../models/course";
import { CreateCouponDto } from "../../routers/course/dtos/course.dto";
import { BadRequestError } from "../../../common";


export class CouponrService {

  async addCouponToCourse(
    instructorId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId,
    couponData: CreateCouponDto
  ) {
    // First, verify the course exists and belongs to the instructor
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId
    });

    if (!course) {
      throw new BadRequestError("Course not found or you don't have permission to modify it");
    }

    // Check if coupon code already exists for this course
    const existingCoupon = course.coupons.find(
      coupon => coupon.code.toLowerCase() === couponData.code.toLowerCase()
    );

    if (existingCoupon) {
      throw new BadRequestError("A coupon with this code already exists for this course");
    }

    // Add the new coupon
    const newCoupon = {
      code: couponData.code,
      discountPercentage: couponData.discountPercentage,
      maxUses: couponData.maxUses,
      expiryDate: couponData.expiryDate
    };

    course.coupons.push(newCoupon);
    
    const updatedCourse = await course.save();
    return updatedCourse;
  }

   async getAllInstructorCoursesWithCoupons(
    instructorId: mongoose.Types.ObjectId
  ) {
    const courses = await Course.find({
      instructor: instructorId
    }).select('title thumbnailPreview coupons');

    if (!courses || courses.length === 0) {
      return [];
    }

    return courses.map((course) => ({
      courseId: (course._id as mongoose.Types.ObjectId).toString(),
      courseTitle: course.title,
      thumbnailPreview: course.thumbnailPreview,
      coupons: course.coupons,
      totalCoupons: course.coupons.length,
      activeCoupons: course.coupons.filter(coupon => 
        new Date(coupon.expiryDate) > new Date()
      ).length,
      expiredCoupons: course.coupons.filter(coupon => 
        new Date(coupon.expiryDate) <= new Date()
      ).length
    }));
  }

  async getCourseCoupons(
    instructorId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId
    }).select('coupons title');

    if (!course) {
      throw new BadRequestError("Course not found or you don't have permission to access it");
    }

    return {
      courseTitle: course.title,
      coupons: course.coupons
    };
  }

  async removeCouponFromCourse(
    instructorId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId,
    couponId: mongoose.Types.ObjectId
  ) {
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId
    });

    if (!course) {
      throw new BadRequestError("Course not found or you don't have permission to modify it");
    }

    // Find and remove the coupon
    const couponIndex = course.coupons.findIndex(
      (coupon: any) => coupon._id.toString() === couponId.toString()
    );

    if (couponIndex === -1) {
      throw new BadRequestError("Coupon not found");
    }

    course.coupons.splice(couponIndex, 1);
    
    const updatedCourse = await course.save();
    return updatedCourse;
  }

  async updateCoupon(
    instructorId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId,
    couponId: mongoose.Types.ObjectId,
    updateData: Partial<CreateCouponDto>
  ) {
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId
    });

    if (!course) {
      throw new BadRequestError("Course not found or you don't have permission to modify it");
    }

    const coupon = course.coupons.id(couponId);
    
    if (!coupon) {
      throw new BadRequestError("Coupon not found");
    }

    // If updating the code, check for duplicates
    if (updateData.code && updateData.code !== coupon.code) {
      const existingCoupon = course.coupons.find(
        (c : any) => c._id.toString() !== couponId.toString() && 
        c.code.toLowerCase() === updateData.code!.toLowerCase()
      );

      if (existingCoupon) {
        throw new BadRequestError("A coupon with this code already exists for this course");
      }
    }

    // Update the coupon fields
    if (updateData.code) coupon.code = updateData.code.toUpperCase().trim();
    if (updateData.discountPercentage) coupon.discountPercentage = updateData.discountPercentage;
    if (updateData.maxUses) coupon.maxUses = updateData.maxUses;
    if (updateData.expiryDate) coupon.expiryDate = updateData.expiryDate;

    const updatedCourse = await course.save();
    return updatedCourse;
  }

  async getCouponById(
    instructorId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId,
    couponId: mongoose.Types.ObjectId
  ) {
    const course = await Course.findOne({
      _id: courseId,
      instructor: instructorId
    }).select('coupons title');

    if (!course) {
      throw new BadRequestError("Course not found or you don't have permission to access it");
    }

    const coupon = course.coupons.id(couponId);
    
    if (!coupon) {
      throw new BadRequestError("Coupon not found");
    }

    return {
      courseTitle: course.title,
      coupon: coupon
    };
  }
}