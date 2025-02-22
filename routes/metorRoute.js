
const express = require("express");

const isAuthorize = require("../middlewares/isAuthorize");
const isAuthorizeStu = require("../middlewares/isAuthorizeStu");
const roleAuth = require("../utils/roleAuth");
const rateLimit = require('../utils/checkLastOtp')
const { registerMentor, loginMentor, logout, forgotPass, resetPassord, getMentorDetails, updatePassword, updateProfile, updateMentorInfo, getSingleUsers, getAllMentors, loadUserDetails, updateMentorInfoAfter, getAllMentorByStatus, updateRole, getAllStudents, deleteUser, getAllMentorsAdmin, getAllAdmin, allConnection, assignConnection, removeConnection, allMentorConnection, resendOTP, sendOTP, updateMentoringStatus, uploadMulter, headMentorMentors, allConnectionHead, grantStatus, changeCoverPhoto, popUpControll, isTkid, establishNewConnection, getMentorDetailsAdmin, allConnectionMentor, getMentorDetailsByMob, getConnectionByMob, getMentorByMob, swapConnection, checkMail, verifyCertificate, sendOTPEmail,sendOTPMobile, verifyMentorEmailOTP, verifyMenMobileOTP } = require("../controllers/mentorController");
const multer = require("multer");
const { retriveChat, notificationFetch } = require("../chatService/chatController");
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

const router = express.Router();

// router.route('/upload/multer').post(upload.single('file'), uploadMulter)
router.route("/register/mentor").post(upload.single('avatar'),registerMentor);
router.route("/login").post(loginMentor);
router.route("/logout").post(logout);
router.route("/password/forgot").post(forgotPass);
router.route("/password/reset/:tkid").put(resetPassord); 

router.route("/self").get(isAuthorize, loadUserDetails);
router.route("/user/info/:id").get(getMentorDetails);
router.route("/admin/user/info/:id").get(getMentorDetailsAdmin);
router.route("/self/update/password").put(isAuthorize, updatePassword);
router.route("/self/update/profile").put(isAuthorize, upload.single('avatar'), updateProfile);
router.route("/self/update/profile/info").put(isAuthorize,upload.single('avatar'), updateMentorInfo);
router.route("/self/update/profile/info/after").put(isAuthorize,upload.single('avatar'), updateMentorInfoAfter);
router.route("/user/update/cover").put(isAuthorize, upload.single('avatar'),changeCoverPhoto)
// router.route("/user/info/:id").get(getSingleUsers);

// // Admin Routes
router.route("/admin/mentors").get(getAllMentors);

router.route("/admin/users/request").get(isAuthorize,roleAuth("admin"), getAllMentorByStatus)
router.route("/admin/users/:id").put(isAuthorize,roleAuth("admin"), updateRole)
router.route("/admin/students/all").get(isAuthorize,roleAuth("admin"), getAllStudents)
router.route("/admin/mentors/all").get(isAuthorize,roleAuth("admin"), getAllMentorsAdmin)
router.route("/admin/mentors/find/conn").post(isAuthorize,roleAuth("admin"), getConnectionByMob)
router.route("/admin/mentors/find/mob").post(isAuthorize,roleAuth("admin"), getMentorByMob)
router.route("/admin/mentors/swap/connection").post(isAuthorize,roleAuth("admin"), swapConnection)
router.route("/admins/all").get(isAuthorize,roleAuth("admin"), getAllAdmin)
router.route("/admin/user/delete/:id").delete(isAuthorize,roleAuth("admin"), deleteUser)
router.route("/admin/add/connection").post(isAuthorize,roleAuth("admin"), establishNewConnection)
router.route("/admin/all/connection/").get(isAuthorize,roleAuth("admin"), allConnection)
router.route("/head/all/connection/").post(isAuthorize,roleAuth("mentor"), allConnectionHead) 
router.route("/mentor/all/connection/").get(isAuthorize,roleAuth("mentor"), allConnectionMentor) 
router.route("/mentor/all/connection/").get(isAuthorize,roleAuth("mentor"), allMentorConnection)
router.route("/mentor/all/chats/").get(isAuthorize, retriveChat)
router.route("/mentor/all/notification/").post(isAuthorize, notificationFetch)
router.route("/mentor/update/status").put(isAuthorize,roleAuth("mentor"), updateMentoringStatus)
router.route("/mentor/update/popup").put(isAuthorize,roleAuth("mentor"), popUpControll)
router.route("/mentor/head/allmentors").get(isAuthorize,roleAuth("mentor"), headMentorMentors)
router.route("/admin/edit/connection/:id").put(isAuthorize,roleAuth("admin"), assignConnection)
router.route("/admin/remove/connections").put(isAuthorize,roleAuth("admin"), removeConnection)
router.route("/admin/update/status").put(isAuthorize,roleAuth("admin"), grantStatus)

// Common Routes
// router.route("/users/verify/otp").post(verifyOTP)
router.route("/users/resend/otp").post(rateLimit, resendOTP)
router.route("/verify/certificate").post(verifyCertificate)
router.route("/users/send/otp").post(rateLimit, sendOTP)
// router.route("/student/verify/otp").post(isAuthorizeStu, verifyOTP)
router.route("/student/resend/otp").post(rateLimit, resendOTP)
router.route("/student/send/otp").post( rateLimit, sendOTP)
//for mobile and email otp seperately
router.route("/student/send/mobile/otp").post( rateLimit,sendOTPMobile)
router.route("/student/send/email/otp").post( rateLimit,sendOTPEmail)

router.route("/mentor/send/monile/otp").post( rateLimit,sendOTPMobile)
router.route("/mentor/send/email/otp").post( rateLimit,sendOTPEmail)
router.route("/tkid/isexists").post(isTkid)

router.route("/mentor/verify/emailotp").post(isAuthorize, verifyMentorEmailOTP);
router.route("/mentor/verify/mobileotp").post(isAuthorize, verifyMenMobileOTP);



module.exports = router;
