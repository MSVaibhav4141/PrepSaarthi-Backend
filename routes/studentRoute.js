const express = require("express");

const isAuthorizeStu = require("../middlewares/isAuthorizeStu");
const roleAuth = require("../utils/roleAuth");

const { reegisterStudent, loginStudent , logout,  forgotPass,  resetPassord, loadUserDetails, getStudentDetails, updatePassword, updateProfile, updateStudentInfo, getAllStudents, buyMentorShipDay, getAllAssignedMentors, getActiveMentorship, allConnectionSuccessfull,} = require("../controllers/studentController");
const { createMentorReview, getMentorReviews, deleteReview } = require("../controllers/mentorController");
const router = express.Router();

router.route("/student/register").post(reegisterStudent);
router.route("/student/login").post(loginStudent);
router.route("/student/logout").post(logout);
router.route("/student/password/forgot").post(forgotPass);
router.route("/student/password/reset/:tkid").put(resetPassord);

router.route("/student/self").get(isAuthorizeStu, loadUserDetails);
router.route("/student/user/info/:id").get(getStudentDetails);
router.route("/student/get/successcon/:id").get(allConnectionSuccessfull);
router.route("/student/self/update/password").put(isAuthorizeStu, updatePassword);
router.route("/student/self/update/profile").put(isAuthorizeStu, updateProfile);
router.route("/student/self/update/profile/info").put(isAuthorizeStu, updateStudentInfo);
router.route("/student/buy/mentorship/week").post(isAuthorizeStu, buyMentorShipDay);
router.route("/student/past/mentorship").get(isAuthorizeStu, getAllAssignedMentors);
router.route("/student/active/mentorship").get(isAuthorizeStu, getActiveMentorship);
// router.route("/student/user/info/:id").get(getSingleUsers);

// // Admin Routes
router.route("/student/admin/mentors").get(getAllStudents);

router.route("/student/review").put(isAuthorizeStu, createMentorReview);

router
  .route("/student/reviews")
  .get(getMentorReviews)
  .delete(isAuthorizeStu, deleteReview);
// router
//   .route("/admin/users/:id")
//   .get(isAuth, roleAuth("admin"), getSingleUsers)
//   .put(isAuth, roleAuth("admin"), updateRole)
//   .delete(isAuth, roleAuth("admin"), deleteUser);

module.exports = router;
