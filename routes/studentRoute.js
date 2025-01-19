
const express = require("express");
const router = express.Router();

const isAuthorizeStu = require("../middlewares/isAuthorizeStu.js");
const roleAuth = require("../utils/roleAuth.js");

const { reegisterStudent, loginStudent , logout,  forgotPass,  resetPassord, loadUserDetails, getStudentDetails, updatePassword, updateStudentProfile, getAllStudents, buyMentorShipDay, getAllAssignedMentors, getActiveMentorship, allConnectionSuccessfull, changeCoverPhotoStu, updateTracker, getSyllabusTracker, verifyMobileOTP, verifyEmailOTP,} = require("../controllers/studentController.js");
const { createMentorReview, getMentorReviews, deleteReview } = require("../controllers/mentorController.js");
const multer = require("multer");
const { retriveChat, notificationFetch } = require("../chatService/chatController.js");
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fieldSize: 10 * 1024 * 1024 }, // Limit file size to 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});
// Check if the controller functions are properly imported
console.log('registerStudent:', reegisterStudent);
console.log('loginStudent:', loginStudent);
console.log('forgotPass:', forgotPass);
console.log('resetPassord:', resetPassord);

console.log('getAllAssignedMentors:', verifyMobileOTP);
// Add similar logs for other controller functions as needed

router.route("/student/register").post(upload.single('avatar'), reegisterStudent);
router.route("/student/login").post(loginStudent);
router.route("/student/logout").post(logout);
router.route("/student/password/forgot").post(forgotPass);
router.route("/student/password/reset/:tkid").put(resetPassord);

router.route("/student/self").get(isAuthorizeStu, loadUserDetails);
router.route("/student/user/info/:id").get(getStudentDetails);
router.route("/student/all/chats/").get(isAuthorizeStu, retriveChat)
router.route("/student/all/notification/").post(isAuthorizeStu, notificationFetch)
router.route("/student/get/successcon/:id").get(allConnectionSuccessfull);
router.route("/student/self/update/password").put(isAuthorizeStu, updatePassword);
router.route("/student/self/update/profile").put(isAuthorizeStu,upload.single('avatar') , updateStudentProfile);
router.route("/student/buy/mentorship/week").post(isAuthorizeStu, buyMentorShipDay);
router.route("/student/past/mentorship").get(isAuthorizeStu, getAllAssignedMentors); //this
router.route("/student/active/mentorship").get(isAuthorizeStu, getActiveMentorship);
router.route("/student/get/tracker").post(isAuthorizeStu,getSyllabusTracker);
router.route("/student/update/tracker").put(isAuthorizeStu, updateTracker);
router.route("/stu/update/cover").put(isAuthorizeStu, upload.single('avatar'),changeCoverPhotoStu)

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
//   .delete(isAuth, roleAuth("admin"), deleteUser);
  // .get(isAuth, roleAuth("admin"), getSingleUsers)
  // .put(isAuth, roleAuth("admin"), updateRole)
//common routes

//adding routing for verification of email and phone
router.route("/student/verify/emailotp").post(isAuthorizeStu, verifyEmailOTP);
router.route("/student/verify/numbotp").post(isAuthorizeStu, verifyMobileOTP);
module.exports = router;
