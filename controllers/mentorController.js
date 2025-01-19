const ErrorHandler = require("../utils/errorHandeler");
const errorCatcherAsync = require("../utils/errorCatcherAsync");
const Mentor = require("../models/mentorModel");
const Student = require("../models/studentModel.js");
const bcryptjs = require("bcryptjs");
const OTPGenerate = require("../models/userVerficationOtp.js");
const Connection = require("../models/connectionModel.js");
const jwtToken = require("../utils/jwtToken");
const { resetPasswordMessage } = require("../utils/mailformat.js");
const { passwordchange } = require("../utils/passwordchange.js");
const mongoose = require('mongoose');
const crypto = require("crypto");
const cloudinary = require("cloudinary");
const sendMail = require("../utils/sendMail.js");
const otpSender = require("../utils/otpSender.js");
const axios = require("axios");
const { ObjectId } = require('mongoose').Types;

//Registering a USER
exports.uploadMulter = errorCatcherAsync(async (req, res, next) => {
  res.json(req.file);
});

exports.registerMentor = errorCatcherAsync(async (req, res, next) => {
  // const userCheck = await Student.findOne({ email: req.body.email });
  // const userMob = await Student.findOne({
  //   mobileNumber: req.body.mobileNumber,
  // });
  // if (userCheck || userMob) {
  //   return next(new ErrorHandler("Account already exists", 400));
  // }

  // const isVerified = await verifyOTP(req, next);
  // if (!isVerified) {
  //   return next(new ErrorHandler("Incorrect or expired OTP", 400));
  // }
  if (req.body.avatar) {
    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 400,
      crop: "scale",
    });
    const { name, email, password, collegeName, mobileNumber } = req.body;
    const user = await Mentor.create({
      name,
      email,
      password,
      collegeName,
      mobileNumber,
      signedUpFor: "mentor",
      verified: true,
      numVerified: true,
      avatar: { public_ID: myCloud.public_id, public_URI: myCloud.secure_url },
    });
    await OTPGenerate.deleteMany({
      email: req.body.email,
      mobileNumber: req.body.mobileNumber,
    });
    jwtToken(user, 201, res);
  } else {
    const { name, email, password, collegeName, mobileNumber } = req.body;
    const user = await Mentor.create({
      name,
      email,
      password,
      collegeName,
      verified: true,
      numVerified: true,
      mobileNumber,
      signedUpFor: "mentor",
    });
    await OTPGenerate.deleteMany({
      email: req.body.email,
      mobileNumber: req.body.mobileNumber,
    });
    jwtToken(user, 201, res);
  }
});

exports.changeCoverPhoto = errorCatcherAsync(async (req, res, next) => {
  const user = await Mentor.findById(req.user._id);
  if (!user) {
    return next(new ErrorHandler("Invalid Request", 500));
  }
  if (req.body.avatar) {
    if (user.coverImg.public_URI !== "/images/cover.img") {
      await cloudinary.v2.uploader.destroy(user.coverImg.public_ID);
    }
    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "covers",
      width: 1000,
      crop: "scale",
    });
    user.coverImg = {
      public_ID: myCloud.public_id,
      public_URI: myCloud.secure_url,
    };
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
      success: true,
    });
  }
});
// USER Login

exports.loginMentor = errorCatcherAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Enter Your Email & Password", 400));
  }
  const user = await Mentor.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid username or password", 401));
  }
  if (!user.isActive) {
    return next(new ErrorHandler("Invalid username or password", 401));
  }
  const isPassword = await user.verifyPassword(password);

  if (!isPassword) {
    return next(new ErrorHandler("Invalid username or password", 401));
  }

  jwtToken(user, 200, res);
});

// Logout user

exports.logout = errorCatcherAsync(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "You are logged Out",
  });
});
// check token id exist
exports.isTkid = errorCatcherAsync(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.body.tkid)
    .digest("hex");
  const tkid = await Mentor.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  const tkidStu = await Student.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (tkid || tkidStu) {
    res.status(200).json({
      success: true,
    });
  } else {
    res.status(200).json({
      success: false,
    });
  }
});

// Forgot Password

exports.forgotPass = errorCatcherAsync(async (req, res, next) => {
  const user = await Mentor.findOne({ email: req.body.email });
  const stuUser = await Student.findOne({ email: req.body.email });

  if (!user || !user.isActive) {
    if (!stuUser || !stuUser.isActive) {
      return next(new ErrorHandler("User not found", 404));
    }
  }

  // const otp = await generateOtp(user || stuUser);
  const resetToken =
    user?.generateResetPasswordToken() || stuUser?.generateResetPasswordToken();
  if (user) {
    await user.save({ validateBeforeSave: false });
  }
  if (stuUser) {
    await stuUser.save({ validateBeforeSave: false });
  }
  const resetPasswordURI = `${process.env.FRONTEND_URL}/forgot/password/${resetToken}`;

  const message = resetPasswordMessage(user || stuUser, resetPasswordURI);
  try {
    await sendMail({
      email: user?.email || stuUser?.email,
      subject: "Password Reset Request",
      message,
    });

    res.status(200).json({
      success: true,
      message: `An email for password recovery has been  sent to your registered email`,
      userId: user?._id || stuUser?._id,
    });
  } catch (e) {
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    if (stuUser) {
      stuUser.resetPasswordToken = undefined;
      stuUser.resetPasswordExpire = undefined;
      await stuUser.save({ validateBeforeSave: false });
    }

    return next(new ErrorHandler(e.message, 500));
  }
});

// //Reset Password

exports.resetPassord = errorCatcherAsync(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.tkid)
    .digest("hex");

  const user = await Student.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  const menUser = await Mentor.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user && !menUser) {
    return next(new ErrorHandler("Invalid or Expired Token", 400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Both the password must match", 400));
  }

  if (user) {
    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
  }

  if (menUser) {
    menUser.password = req.body.password;

    menUser.resetPasswordToken = undefined;
    menUser.resetPasswordExpire = undefined;
    await menUser.save();
  }

  const message = passwordchange(user || menUser);

  try {
    await sendMail({
      email: user?.email || menUser?.email,
      subject: "Your password has been changed",
      message,
    });
    jwtToken(user || menUser, 200, res);
  } catch (e) {
    return next(new ErrorHandler(e.message, 500));
  }
});

// // Get User Detail

exports.getMentorDetails = errorCatcherAsync(async (req, res, next) => {
  const userInitial = await Mentor.findById(req.params.id);
  if (!userInitial) {
    return next(new ErrorHandler("No Such Account Exists", 404));
  }
  if (!userInitial.isActive) {
    return next(new ErrorHandler("No Such Account Exists", 404));
  }

  const connection = await Connection.find({ mentorDetails: req.params.id });
  const activeConnection = connection.filter((i) => {
    if (i.isActive === true) {
      return i;
    }
  });
  const activeConnectionLength = activeConnection.length;
  userInitial.totalActiveMentee = activeConnectionLength;
  await userInitial.save({ validateBeforeSave: false });
  const user = await Mentor.findById(req.params.id);
  res.status(200).json({
    message: true,
    user: {
      name: user.name,
      id: user._id,
      email: user.email,
      avatar: user.avatar,
      exam: user.exam,
      college: user.collegeName,
      idCard: user.idCard,
      branch: user.branch,
      yearOfStudy: user.yearOfStudy,
      ratings: user.ratings,
      reviews: user.reviews,
      activeMentee: user.totalActiveMentee,
      numberOfrating: user.numOfReviews,
      userAssigned: user.userAssigned,
      desc: user.desc,
      about: user.about,
      ppm: user.pricePerMonth,
      ppd: user.pricePerDay,
      ppmO: user.pricePerMonthOld,
      ppdO: user.pricePerDayOld,
      idO: user.idCardOld,
      isUpd: user.updateRequest,
      coverImg: user.coverImg,
    },
  });
});
exports.getMentorDetailsAdmin = errorCatcherAsync(async (req, res, next) => {
  const userInitial = await Mentor.findById(req.params.id);
  if (!userInitial) {
    return next(new ErrorHandler("No Such Account Exists", 404));
  }

  const connection = await Connection.find({ mentorDetails: req.params.id });
  const activeConnection = connection.filter((i) => {
    if (i.isActive === true) {
      return i;
    }
  });
  const activeConnectionLength = activeConnection.length;
  userInitial.totalActiveMentee = activeConnectionLength;
  await userInitial.save({ validateBeforeSave: false });
  const user = await Mentor.findById(req.params.id);
  res.status(200).json({
    message: true,
    user: {
      name: user.name,
      id: user._id,
      email: user.email,
      avatar: user.avatar,
      exam: user.exam,
      college: user.collegeName,
      idCard: user.idCard,
      branch: user.branch,
      yearOfStudy: user.yearOfStudy,
      ratings: user.ratings,
      reviews: user.reviews,
      activeMentee: user.totalActiveMentee,
      numberOfrating: user.numOfReviews,
      userAssigned: user.userAssigned,
      desc: user.desc,
      about: user.about,
      ppm: user.pricePerMonth,
      ppd: user.pricePerDay,
      ppmO: user.pricePerMonthOld,
      ppdO: user.pricePerDayOld,
      idO: user.idCardOld,
      isUpd: user.updateRequest,
      coverImg: user.coverImg,
    },
  });
});
// // Get User Detail

exports.loadUserDetails = errorCatcherAsync(async (req, res, next) => {
  const user = await Mentor.findById(req.user.id);
  if (!user.isActive) {
    return next(new ErrorHandler("No SUch Account Exists", 404));
  }
  res.status(200).json({
    message: true,
    user,
    userSigned: req.user._id,
  });
});

// // Update User password

exports.updatePassword = errorCatcherAsync(async (req, res, next) => {
  const user = await Mentor.findById(req.user.id).select("+password");
  if (!req.body.oldPassword) {
    return next(new ErrorHandler("Kindly enter your old Password", 400));
  }

  if (!req.body.newPassword || !req.body.confirmPassword) {
    return next(
      new ErrorHandler("Please enter your new password in both feilds", 400)
    );
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("Both password must match", 400));
  }

  const isPassword = await user.verifyPassword(req.body.oldPassword);

  if (!isPassword) {
    return next(new ErrorHandler("Old Password is incorrect ! Try again", 400));
  }

  user.password = req.body.newPassword;
  await user.save();

  jwtToken(user, 200, res);
});

// //  update personal info

exports.updateProfile = errorCatcherAsync(async (req, res, next) => {
  const newUserData = {
    email: req.body.email,
    name: req.body.name,
    mobileNumber: req.body.mobileNumber,
    collegeName: req.body.collegeName,
  };
  if (req.body.avatar && req.body.avatar !== " ") {
    const data = await Mentor.findById(req.user.id);
    const { avatar } = data;
    await cloudinary.v2.uploader.destroy(avatar.public_ID);

    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 400,
      crop: "scale",
    });

    newUserData.avatar = {
      public_ID: myCloud.public_id,
      public_URI: myCloud.secure_url,
    };
  }
  await Mentor.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});
exports.updateMentoringStatus = errorCatcherAsync(async (req, res, next) => {
  const newUserData = {
    mentoringStatus: req.body.status,
  };
  await Mentor.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});
//get all mentors for headmentor
exports.headMentorMentors = errorCatcherAsync(async (req, res, next) => {
  const allMentors = await Mentor.find({
    verified: true,
    role: "mentor",
    isStepLastCompleted: true,
    isApproved: "yes",
    isActive: true,
  }).select(
    " -verified -signedUpFor -isStepLastCompleted -mobileNumber -password -updateRequest -isPending -isRejected -isApproved -role -createdAt -linkedin -pricePerMonthOld -pricePerDayOld -isHeadMentor"
  );
  // const payload = allMentors.map((mentor) => ({
  //   name: mentor.name,
  //   collegeName: mentor.collegeName,
  //   mentorApplicationStatus: mentor.isStepLastCompleted,
  //   avatar: mentor.avatar.public_URI,
  //   collegeImage: mentor.college.public_URI,
  //   mentoringStatus: mentor.mentoringStatus,
  //   pricePerMonth: mentor.pricePerMonth,
  //   pricePerWeek: mentor.pricePerDay,
  //   description: mentor.desc,
  //   about: mentor.about,
  //   rating: mentor.ratings,
  //   presentYear: mentor.yearOfStudy,
  //   mentee: mentor.nu,
  // }));

  res.status(200).json({
    success: true,
    allMentors,
  });
});

//Update mentor info

exports.updateMentorInfo = errorCatcherAsync(async (req, res, next) => {
  const newUserData = {
    isDropper: req.body.isDropper,
    studyMode: req.body.studyMode,
    branch: req.body.branch,
    exam: JSON.parse(req.body.exam),
    yearOfStudy: req.body.yearOfStudy,
    linkedin: req.body.linkedin,
    youtube: req.body.youtube,
    about: req.body.about,
    desc: req.body.disc,
    pricePerMonth: req.body.ppm,
    pricePerDay: req.body.ppd,
    isStepLastCompleted: true,
  };
  if (
    !newUserData.isDropper ||
    !newUserData.studyMode ||
    !newUserData.exam ||
    !newUserData.linkedin ||
    !newUserData.youtube ||
    !newUserData.about ||
    !newUserData.desc ||
    !newUserData.pricePerMonth ||
    !newUserData.pricePerDay ||
    !req.body.idCard
  ) {
    return next(
      new ErrorHandler(
        "All fields are compulsory. Kindly fill every fields",
        400
      )
    );
  }

  const myCloud = await cloudinary.v2.uploader.upload(req.body.idCard, {
    folder: "idcard",
    width: 400,
    crop: "scale",
  });

  newUserData.idCard = {
    public_ID: myCloud.public_id,
    public_URI: myCloud.secure_url,
  };

  await Mentor.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

exports.updateMentorInfoAfter = errorCatcherAsync(async (req, res, next) => {
  const newUserData = {
    isDropper: req.body.isDropper,
    studyMode: req.body.studyMode,
    branch: req.body.branch,
    exam: JSON.parse(req.body.exam),
    yearOfStudy: req.body.yearOfStudy,
    linkedin: req.body.linkedin,
    youtube: req.body.youtube,
    about: req.body.about,
    desc: req.body.disc,
    pricePerMonth: req.body.ppm,
    pricePerDay: req.body.ppd,
    isStepLastCompleted: true,
  };
  const data = await Mentor.findById(req.user.id);
  const { idCard, pricePerDay, pricePerMonth } = data;

  if (req.body.idCard && req.body.idCard !== " ") {
    await cloudinary.v2.uploader.destroy(idCard.public_ID);

    const myCloud = await cloudinary.v2.uploader.upload(req.body.idCard, {
      folder: "idcard",
      width: 400,
      crop: "scale",
    });

    newUserData.idCardOld = "idcard";
    newUserData.idCard = {
      public_ID: myCloud.public_id,
      public_URI: myCloud.secure_url,
    };
    newUserData.updateRequest = "yes";
    newUserData.isPending = "yes";
    newUserData.isApproved = "no";
    newUserData.role = "user";
  }
  if (
    parseInt(pricePerDay) !== parseInt(req.body.ppd) ||
    parseInt(pricePerMonth) !== parseInt(req.body.ppm)
  ) {
    if (parseInt(pricePerMonth) !== parseInt(req.body.ppm)) {
      newUserData.pricePerMonthOld = data.pricePerMonth;
    }
    if (parseInt(pricePerDay) !== parseInt(req.body.ppd)) {
      newUserData.pricePerDayOld = data.pricePerDay;
    }
    newUserData.isPending = "yes";
    newUserData.isApproved = "no";
    newUserData.role = "user";
    newUserData.updateRequest = "yes";
  }

  await Mentor.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});

// Get a single user
exports.getSingleUsers = errorCatcherAsync(async (req, res, next) => {
  const user = await Mentor.findById(req.params.id).select(
    "name exam avatar pricePerMonth pricePerDay collegeName branch yearOfStudy"
  );

  if (!user) {
    return next(new ErrorHandler(`Error 404`, 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});
// //  Get all Users

exports.getAllMentors = errorCatcherAsync(async (req, res, next) => {
  // const users = await Mentor.find({
  //   role: "mentor",
  //   mentoringStatus: "active",
  //   isActive: true,
  // }).select(
  //   "name exam avatar pricePerMonth pricePerDay collegeName branch yearOfStudy ratings createdAt"
  // );
  const users = await Mentor.aggregate([
    { $match: { role: "mentor", mentoringStatus: "active", isActive: true } },
    {
      $sample: {
        size: await Mentor.countDocuments({
          role: "mentor",
          mentoringStatus: "active",
          isActive: true,
        }),
      },
    }, // Shuffle all documents
    {
      $project: {
        name: 1, 
        exam: 1,
        avatar: 1,
        pricePerMonth: 1,
        pricePerDay: 1,
        collegeName: 1,
        branch: 1,
        yearOfStudy: 1,
        totalActiveMentee:1,
        ratings: 1,
        createdAt: 1,
      },
    },
  ]);
  res.status(200).json({
    success: true,
    users,
  });
});

//Get all students(admin)
exports.getAllStudents = errorCatcherAsync(async (req, res, next) => {
  const users = await Student.find({});
  res.status(200).json({
    success: true,
    users,
  });
});
//Get all mentors(admin)
exports.getAllMentorsAdmin = errorCatcherAsync(async (req, res, next) => {
  const users = await Mentor.find({
    $or: [{ role: "mentor" }, { role: "user" }],
  });
  res.status(200).json({
    success: true,
    users,
  });
});

//Get all Admins(admin)
exports.getAllAdmin = errorCatcherAsync(async (req, res, next) => {
  const users = await Mentor.find({ role: "admin" });
  res.status(200).json({
    success: true,
    users,
    userSigned: req.user.id,
  });
});
// //  Get all request(admin)

exports.getAllMentorByStatus = errorCatcherAsync(async (req, res, next) => {
  const usersUpdation = await Mentor.find({
    updateRequest: "yes",
    isPending: "yes",
    isApproved: "no",
    isStepLastCompleted: true,
  });
  const usersPending = await Mentor.find({
    updateRequest: "no",
    isPending: "yes",
    isApproved: "no",
    isStepLastCompleted: true,
  });
  const userRejected = await Mentor.find({
    isPending: "no",
    isRejected: "yes",
    isStepLastCompleted: true,
  });
  const userApproved = await Mentor.find({
    isPending: "no",
    isApproved: "yes",
    isStepLastCompleted: true,
  });
  res.status(200).json({
    success: true,
    usersUpdation,
    usersPending,
    userRejected,
    userApproved,
  });
});

// // update User role  (ADMIN)
exports.updateRole = errorCatcherAsync(async (req, res, next) => {
  const user = await Mentor.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`User does not exsits with ID of ${req.params.id}`, 404)
    );
  }
  if (req.user._id.toString() === req.params.id) {
    return next(new ErrorHandler("You can't change your own role", 400));
  }
  if (user.email === process.env.PRCTRMAIL) {
    const message = `A suspicious activity of changing your role has been done by user ${req.user.name} having ${req.user.email} and ${req.user.id} as email and ID respectivly`;
    try {
      await activityMail({
        message,
      });

      return next(
        new ErrorHandler("Super Prevliged Admin can't be updated", 403)
      );
    } catch (e) {
      return next(new ErrorHandler(e.message, 500));
    }
  }
  if (user.role === "admin") {
    if (req.user.email !== process.env.PRCTRMAIL)
      return next(new ErrorHandler("You can't change an admin role", 400));
  }

  user.role = req.body.role;
  if (req.body.role === "mentor") {
    user.isApproved = "yes";
    user.isPending = "no";
    user.isRejected = "no";
    user.updateRequest = "no";
  }
  if (req.body.role === "user") {
    user.isApproved = "no";
    user.isPending = "no";
    user.isRejected = "yes";
  }
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `${user.name} has been approved for ${req.body.role} role`,
  });
});

// // Deleting a user (ADMIN)

exports.deleteUser = errorCatcherAsync(async (req, res, next) => {
  const user =
    (await Mentor.findById(req.params.id)) ||
    (await Student.findById(req.params.id));
  const userName = user.name;

  if (!user) {
    return next(
      new ErrorHandler(`User does not exsits with ID of ${req.params.id}`, 404)
    );
  }

  if (user._id.toString() === req.user._id.toString()) {
    return next(new ErrorHandler(`You cant delete yourself`, 400));
  }

  if (user.email === process.env.PRCTRMAIL) {
    const message = `A suspicious activity of deleting your account has been done by user ${req.user.name} having ${req.user.email} and ${req.user.id} as email and ID respectivly`;
    try {
      await activityMail({
        message,
      });

      return next(
        new ErrorHandler("Super Prevliged Admin can't be deleted", 403)
      );
    } catch (e) {
      return next(new ErrorHandler(e.message, 500));
    }
  }
  const imageId = user.avatar.public_ID;
  if (imageId !== "profilimage") {
    await cloudinary.v2.uploader.destroy(imageId);
  }
  user.isActive = false;
  user.idDeletedDate = new Date();
  await user.save();

  res.status(200).json({
    sucess: true,
    message: `${userName} removed successfully`,
  });
});

//(admin) all connection
exports.allConnection = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.find();

  const currentDate = new Date(Date.now()).getTime();
  connection.forEach(async (item, i) => {
    if (item.expiresIn.getTime() < currentDate) {
      item.isActive = false;
      item.isConnected = false;
      const stu = await Student.findById(item.studentDetails._id);
      if(stu){
      stu.mentorAssigned = false;
      await stu.save({ validateBeforeSave: false });
      }
      await item.save({ validateBeforeSave: false });
    }
  });
  const connectionUpdated = await Connection.find({})
    .populate("studentDetails", "name avatar mobileNumber email coverImg")
    .populate("mentorDetails", "name avatar mobileNumber email coverImg collegeName mentoringStatus role exam")
    .exec();
  res.status(200).json({
    success: true,
    connection: connectionUpdated,
  });
});

exports.allConnectionHead = errorCatcherAsync(async (req, res, next) => {
  // if(!req.user.isHeadMentor){
  //   return next(new ErrorHandler("Action not allowed", 401));
  // } 
  const { id } = req.body;
  const connection = await Connection.find();
  
  const currentDate = new Date(Date.now()).getTime();
  connection.forEach(async (item, i) => {
    if (item.expiresIn.getTime() < currentDate) {
      item.isActive = false;
      item.isConnected = false;
      const stu = await Student.findById(item.studentDetails._id);
      if(stu){
        stu.mentorAssigned = false;
        await stu.save({ validateBeforeSave: false });
        }
      await item.save({ validateBeforeSave: false });
    }
  });
  const connectionUpdated = await Connection.find({ mentorDetails: id })
    .populate("studentDetails", "name avatar")
    .populate("mentorDetails", "name avatar")
    .exec();

  res.status(200).json({
    success: true,
    connection: connectionUpdated,
  });
});
exports.allConnectionMentor = errorCatcherAsync(async (req, res, next) => {

  const connection = await Connection.find();

  const currentDate = new Date(Date.now()).getTime();
  connection.forEach(async (item, i) => {
    if (item.expiresIn.getTime() < currentDate) {
      item.isActive = false;
      item.isConnected = false;
      const stu = await Student.findById(item.studentDetails._id);
      if(stu){
      stu.mentorAssigned = false;
      await stu.save({ validateBeforeSave: false });
      }
      await item.save({ validateBeforeSave: false });
    }
  });
  const connectionUpdated = await Connection.find({ mentorDetails: req.user.id })
    .populate("studentDetails", "name")
    .populate("mentorDetails", "name avatar")

    .exec();

  res.status(200).json({
    success: true,
    connection: connectionUpdated,
  }); 
});
exports.getConnectionByMob = errorCatcherAsync(async (req, res, next) => {
  const student = await Student.findOne({mobileNumber:req.body.mobileNumber}).select("_id name");
  if(!student){
    return next(new ErrorHandler("No student found with given phone number", 404));
  }
  const activeConnection = await Connection.find({studentDetails:student._id, isActive:true}).select('mentorDetails boughtAt expiresIn')
  .populate("mentorDetails", "name mobileNumber avatar")
  res.status(200).json({
    activeConnection,
    name:student.name,
    stuId:student._id
  })
});
exports.getMentorByMob = errorCatcherAsync(async (req, res, next) => {
  const mentor = await Mentor.findOne({mobileNumber:req.body.mobileNumber}).select("name _id");
  if(!mentor){
    return next(new ErrorHandler("No mentor found with given phone number", 404));
  }
  res.status(200).json({
    mentor
  })
});

exports.swapConnection = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.findById(req.body.id)
  if(!connection){
    return next(new ErrorHandler("No connection found", 404));
  }
  const mentor = await Mentor.findById(req.body.mentorId);
  if(!mentor){
    return next(new ErrorHandler("No such Mentor found", 404))
  }
  if (mentor._id.equals(connection.mentorDetails)) {
    return next(new ErrorHandler("Can't swap connection with same mentor"))
  }
  connection.mentorDetails = mentor._id;
  await connection.save({validateBeforeSave:false})
  res.status(200).json({
    success:true
  })
});
//(admin) interpert connection
exports.assignConnection = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.findById(req.params.id);
  connection.isActive = true;
  connection.isConnected = true;
  await connection.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
  });
});
//(admin) remove connection
exports.removeConnection = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.findById(req.body.id);
  connection.isActive = false;
  connection.isConnected = false;
  const user = await Student.findById(req.body.sid);
  user.mentorAssigned = false;
  await user.save({ validateBeforeSave: false });
  await connection.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
  });
});
//(admin) grant status
exports.grantStatus = errorCatcherAsync(async (req, res, next) => {
  const mentor = await Mentor.findById(req.body.id);
  mentor.isHeadMentor = req.body.status;
  if (req.body.status) {
    mentor.popUp = true;
  } else {
    mentor.popUp = false;
  }
  await mentor.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
    actionApplied: req.body.status,
  });
});
exports.popUpControll = errorCatcherAsync(async (req, res, next) => {
  const mentor = await Mentor.findById(req.user.id);
  if (!mentor.isHeadMentor) {
    return next(new ErrorHandler("Invalid Request", 401));
  }
  if (req.body.popUp) { 
    mentor.popUp = false;
    await mentor.save();
  }
  res.status(200).json({
    success: true,
  });
});

exports.allMentorConnection = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.find({ mentorDetails: req.user.id })
    .populate("studentDetails", "name avatar")
    .populate("mentorDetails", "name avatar")
    .exec();

  // connection
  res.status(200).json({
    success: true,
    connection,
  });
});

exports.createMentorReview = errorCatcherAsync(async (req, res, next) => {
  const { rating, comment, mentorId } = req.body;
  const connection = await Connection.find({
    studentDetails: req.user._id,
    mentorDetails: mentorId,
  });
  if (connection.length < 1 || !connection) {
    return next(
      new ErrorHandler("You must enrolled under this mentor to review", 403)
    );
  }
  // if(connection.length > 0){
  //   if(connection[0].isActive === true){
  //     return next(new ErrorHandler("You must complete this mentorship to review the mentor", 403));
  //   }
  // }
  if (Number(rating) === 0) {
    return next(
      new ErrorHandler("You must give rating to submit a review", 500)
    );
  }
  const review = {
    user: req.user._id,
    name: req.user.name,
    rating: Number(rating),
    comment,
  };

  const mentor = await Mentor.findById(mentorId);

  const isReviewed = mentor.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    mentor.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString())
        (rev.rating = rating), (rev.comment = comment);
    });
  } else {
    mentor.reviews.push(review);
    mentor.numOfReviews = mentor.reviews.length;
  }

  let avg = 0;

  mentor.reviews.forEach((rev) => {
    avg += rev.rating;
  });

  mentor.ratings = avg / mentor.reviews.length;

  await mentor.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

exports.deleteReview = errorCatcherAsync(async (req, res, next) => {
  if (req.query.userId.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Action not allowed", 401));
  }
  const mentor = await Mentor.findById(req.query.mentorId);
  if (!mentor) {
    return next(new ErrorHandler("Mentor not found", 404));
  }
  const reviews = mentor.reviews.filter(
    (rev) => rev._id.toString() !== req.query.id.toString() 
  );
  let avg = 0;

  reviews.forEach((rev) => {
    avg += rev.rating;
  });

  let ratings = 0;

  if (reviews.length === 0) {
    ratings = 0;
  } else {
    ratings = avg / reviews.length;
  }

  const numOfReviews = reviews.length;

  await Mentor.findByIdAndUpdate(
    req.query.mentorId,
    {
      reviews,
      ratings,
      numOfReviews,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
  });
});

exports.getMentorReviews = errorCatcherAsync(async (req, res, next) => {
  const mentor = await Mentor.findById(req.query.mentorId).populate({
    path: "reviews",
    populate: {
      path: "user",
      select: "avatar", // Specify the fields you want to retrieve
    },
  });

  if (!mentor) {
    return next(new ErrorHandler("Mentor not found", 404));
  }

  res.status(200).json({
    success: true,
    reviews: mentor.reviews,
  });
});
exports.verifyCertificate = errorCatcherAsync(async (req, res, next) => {
  const certId = "CERT-1706391743665-534829"
  if(req.body.cid === certId){
    res.status(200).json({
      success: true,
      isValid: true,
      holder: 'Vaibhav Markandeya Singh',
      duration:'01/09/2024-30/10/2024',
      certificateId:certId
    });
  }
 else {
  res.status(200).json({
    success: true,
    isValid: false,
  });
  }

});

//Generate OTP
const generateOtp = async (user) => {
  const otp = `${Math.floor(10000 + Math.random() * 90000)}`;
  const mobOtp = `${Math.floor(10000 + Math.random() * 90000)}`;
  //Send Mail
  const saltRound = 10;

  const hashedOtp = await bcryptjs.hash(otp, saltRound);
  const hashedMobOtp = await bcryptjs.hash(mobOtp, saltRound);
  const otpExists = await OTPGenerate.findOne({
    email: user.email,
    mobileNumber: user.mobileNumber,
  });

  if (!otpExists) {
    await OTPGenerate.create({
      email: user.email,
      mobileNumber: user.mobileNumber,
      otp: hashedOtp,
      mobOtp: hashedMobOtp,
      expiresIn: Date.now() + 10 * 60 * 1000,
    });
  } else {
    otpExists.otp = hashedOtp;
    otpExists.mobOtp = hashedMobOtp;
    otpExists.expiresIn = Date.now() + 10 * 60 * 1000;
    await otpExists.save();
  }
  return { otp, mobOtp };
};

// const veriifyOtp = await
const verifyOTP = async (req, next) => {
  const otp = req.body.emailOTP;
  const mobOtp = req.body.numberOTP;
  if (!otp || !mobOtp) {
    return next(new ErrorHandler("Please enter the otp", 400));
  }

  const userOTPVerification = await OTPGenerate.find({
    email: req.body.email,
    mobileNumber: req.body.mobileNumber,
  });

  if (userOTPVerification.length <= 0) {
    return next(
      new ErrorHandler(
        "Account doesn't exists or already verified.Please login or signup"
      )
    );
  }
  const { expiresIn } = userOTPVerification[0];

  const hashedOTP = userOTPVerification[0].otp;
  const hashedMobOTP = userOTPVerification[0].mobOtp;

  if (expiresIn < Date.now()) {
    await OTPGenerate.deleteMany({ email: req.body.email });
    return false;
  }

  const validOTP = await bcryptjs.compare(otp, hashedOTP);
  const validMobOTP = await bcryptjs.compare(mobOtp, hashedMobOTP);

  if (!validOTP || !validMobOTP) {
    return false;
  }

  // await Mentor.updateOne({ _id: req.user._id }, { verified: true });
  // await Student.updateOne({ _id: req.user._id }, { verified: true });

  return true;
};

exports.resendOTP = errorCatcherAsync(async (req, res, next) => {
  const user = req.body;
  const otp = await generateOtp(user);
  try {
    const url = "https://www.fast2sms.com/dev/bulkV2";
    const data = {
      route: "otp",
      variables_values: otp.mobOtp,
      numbers: user.mobileNumber,
    };
    const headers = {
      Authorization: process.env.TEXTSMS,
      "Content-Type": "application/json",
    };

    await axios.post(url, data, { headers });
    const resendOtpEmailContent = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
      <div style="background-color: #3A5AFF; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #fff; margin: 0;">Here’s Your Resent OTP Code</h2>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
        <p style="font-size: 1.1em;">
          We noticed that you requested to resend your OTP code. Please use the code below to continue with your verification process.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 1.5em; font-weight: bold; color: #3A5AFF; padding: 10px 20px; border: 2px dashed #ffc43b; border-radius: 5px;">
            ${otp.otp}
          </span>
        </div>
        <p style="font-size: 1.1em;">
          This OTP is valid for the next 10 minutes. If you did not request this, please disregard this message or contact our support team immediately.
        </p>
        <p>Best regards,<br><span style="color: #3A5AFF;">The PrepSaarthi Team</span></p>
      </div>
    </div>
  `;
    await sendMail({
      email: user.email,
      subject: `Your OTP Code for Verification`,
      message: resendOtpEmailContent,
    });
    const otpGenerated = await OTPGenerate.findOne({
      email: user.email,
      mobileNumber: user.mobileNumber,
    });
    otpGenerated.otpCount += 1;
    await otpGenerated.save({ validateBeforeSave: false });
  } catch (e) {
    console.log(e);
    await OTPGenerate.deleteMany({
      email: user.email,
      mobileNumber: user.mobileNumber,
    });
    return next(
      new ErrorHandler(e?.response?.data?.message || e?.message, 500)
    );
  }
  res.status(200).json({
    status: "success",
    message: "OTP resent successfully",
  });
});

exports.sendOTP = errorCatcherAsync(async (req, res, next) => {
  const isUser = await Mentor.findOne({
    $or: [{ mobileNumber: req.body.mobileNumber }, { email: req.body.email }],
  });
  const isUserStu = await Student.findOne({
    $or: [{ mobileNumber: req.body.mobileNumber }, { email: req.body.email }],
  });

  if (isUser || isUserStu) {
    return next(
      new ErrorHandler(
        "Account already exists please use different email and mobile number",
        500
      )
    );
  }
  const user = req.body;
  const otp = await generateOtp(user);
  try {
    const url = "https://www.fast2sms.com/dev/bulkV2";
    const data = {
      route: "otp",
      variables_values: otp.mobOtp,
      numbers: user.mobileNumber,
    };
    const headers = {
      Authorization: process.env.TEXTSMS,
      "Content-Type": "application/json",
    };
    await axios.post(url, data, { headers });
    const otpEmailContent = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
    <div style="background-color: #3A5AFF; padding: 20px; border-radius: 10px; text-align: center;">
      <h2 style="color: #fff; margin: 0;">Your OTP Code</h2>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
      <p style="font-size: 1.1em;">
        We received a request to verify your identity. Please use the OTP code below to complete your process.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 1.5em; font-weight: bold; color: #3A5AFF; padding: 10px 20px; border: 2px dashed #ffc43b; border-radius: 5px;">
          ${otp.otp}
        </span>
      </div>
      <p style="font-size: 1.1em;">
        This OTP is valid for the next 10 minutes. If you did not request this, please contact our support team immediately.
      </p>
      <p>Best regards,<br><span style="color: #3A5AFF;">The Prepsaarthi Team</span></p>
    </div>
  </div>
`;
    await sendMail({
      email: user.email,
      subject: `Verification OTP ${otp.otp}`,
      message: otpEmailContent,
    });
    const otpGenerated = await OTPGenerate.findOne({
      email: user.email,
      mobileNumber: user.mobileNumber,
    });
    otpGenerated.otpCount += 1;
    await otpGenerated.save({ validateBeforeSave: false });
  } catch (e) {
    console.log(e);
    await OTPGenerate.deleteMany({
      email: user.email,
      mobileNumber: user.mobileNumber,
    });
    return next(
      new ErrorHandler(e?.response?.data?.message || e?.message, 500)
    );
  }
  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
});

exports.sendOTPMobile = errorCatcherAsync(async (req, res, next) => {
  const isUser = await Mentor.findOne({
    mobileNumber: req.body.mobileNumber,
  });
  const isUserStu = await Student.findOne({
    mobileNumber: req.body.mobileNumber,
  });

  if (isUser || isUserStu) {
    return next(
      new ErrorHandler(
        "Account already exists with this mobile number, please use a different mobile number",
        500
      )
    );
  }

  const user = req.body;
  const otp = await generateOtp(user);

  try {
    const url = "https://www.fast2sms.com/dev/bulkV2";
    const data = {
      route: "otp",
      variables_values: otp.mobOtp,
      numbers: user.mobileNumber,
    };
    const headers = {
      Authorization: process.env.TEXTSMS,
      "Content-Type": "application/json",
    };
    await axios.post(url, data, { headers });

    const otpGenerated = await OTPGenerate.findOne({
      mobileNumber: user.mobileNumber,
    });
    otpGenerated.otpCount += 1;
    await otpGenerated.save({ validateBeforeSave: false });
  } catch (e) {
    console.log(e);
    await OTPGenerate.deleteMany({
      mobileNumber: user.mobileNumber,
    });
    return next(
      new ErrorHandler(e?.response?.data?.message || e?.message, 500)
    );
  }

  res.status(200).json({
    status: "success",
    message: "OTP sent successfully to mobile number",
  });
});

exports.sendOTPEmail = errorCatcherAsync(async (req, res, next) => {
  const isUser = await Mentor.findOne({
    email: req.body.email,
  });
  const isUserStu = await Student.findOne({
    email: req.body.email,
  });

  if (isUser || isUserStu) {
    return next(
      new ErrorHandler(
        "Account already exists with this email, please use a different email",
        500
      )
    );
  }

  const user = req.body;
  const otp = await generateOtp(user);

  try {
    const otpEmailContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto;">
        <div style="background-color: #3A5AFF; padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #fff; margin: 0;">Your OTP Code</h2>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
          <p style="font-size: 1.1em;">
            We received a request to verify your identity. Please use the OTP code below to complete your process.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 1.5em; font-weight: bold; color: #3A5AFF; padding: 10px 20px; border: 2px dashed #ffc43b; border-radius: 5px;">
              ${otp.otp}
            </span>
          </div>
          <p style="font-size: 1.1em;">
            This OTP is valid for the next 10 minutes. If you did not request this, please contact our support team immediately.
          </p>
          <p>Best regards,<br><span style="color: #3A5AFF;">The Prepsaarthi Team</span></p>
        </div>
      </div>
    `;

    await sendMail({
      email: user.email,
      subject: `Verification OTP ${otp.otp}`,
      message: otpEmailContent,
    });

    const otpGenerated = await OTPGenerate.findOne({
      email: user.email,
    });
    otpGenerated.otpCount += 1;
    await otpGenerated.save({ validateBeforeSave: false });
  } catch (e) {
    console.log(e);
    await OTPGenerate.deleteMany({
      email: user.email,
    });
    return next(
      new ErrorHandler(e?.response?.data?.message || e?.message, 500)
    );
  }

  res.status(200).json({
    status: "success",
    message: "OTP sent successfully to email",
  });
});

// exports.actieMentee = errorCatcherAsync(async (req, res, next) => {
//   const connection = await Connection.find({mentorDetails:req.body.id});

// if(activeConnectionLength >= 3){
//   res.status(200).json({
//     available: false,
//   });
// }else{
//   res.status(200).json({
//     available: true,
//   });

// }

// });

exports.establishNewConnection = errorCatcherAsync(async (req, res, next) => {
    if (!ObjectId.isValid(req.body.id)) {
      return next(new ErrorHandler("Invalid Id", 400));
    }
  const student = await Student.findOne({mobileNumber:req.body.mobileNumber})
  const mentor = await Mentor.findById(req.body.id)
  if(mentor.totalActiveMentee >= 3){
    return next(new ErrorHandler("Mentor Already have more than 3 mentee", 400));
  }
  let duration = null;
  
  if(req.body.duration === 3){
    duration =   new Date(new Date().setDate(new Date().getDate() + 30))
  }else if(req.body.duration === 1){
    duration = new Date(new Date().setDate(new Date().getDate() + 7))
  }
  
  if(!student || !mentor){
    return next(new ErrorHandler("No records found", 404));
  }
  
  const date = new Date(req.body.date)
  
  const connection = {
    studentDetails:student._id,
    mentorDetails:mentor._id,
    expiresIn:duration,
    isActive:true,
    isConnected:false,
    price:req.body.price,
    boughtAt:date
  }
  await Connection.create(connection)
  
  const emailContent = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #3A5AFF;">Purchase Successful!</h2>
    <p>Dear ${student.name},</p>
    <p>
      Congratulations! You have successfully purchased the mentorship program offered by <strong>${mentor.name}</strong>. 
      The mentor specializes in academics thereby attainng <strong>${mentor.exam.rank}</strong>.
    </p>
    <p>
      Your mentor will reach out to you shortly with further details and to schedule your first session.
    </p>
    <p style="color: #555;">
      <strong>What Happens Next?</strong>
    </p>
    <ul style="color: #555; padding-left: 20px;">
      <li>Your mentor, ${mentor.name}, will contact you soon.</li>
      <li>You will receive a detailed plan and schedule for your mentorship sessions.</li>
      <li>If you have any questions, feel free to reach out to us at <a href="mailto:team@prepsaarthi.com" style="color: #ffc43b;">team@prepsaarthi.com</a>.</li>
    </ul>
    <p>
      We are excited for you to begin your journey under the guidance of <strong>${mentor.name}</strong>. 
      We wish you the best of luck and are confident this mentorship will be valuable for your growth.
    </p>
    <p>Best regards,<br><span style="color: #3A5AFF;">The PrepSaarthi Team</span></p>
  </div>
`;
const mentorEmailContent = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #3A5AFF;">New Mentorship Purchase!</h2>
    <p>Dear ${mentor.name},</p>
    <p>
      We are pleased to inform you that <strong>${student.name}</strong> has purchased your mentorship program.
    </p>
    <p>
      The student is eager to learn and grow under your guidance. Please connect with them as soon as possible to start planning and scheduling the sessions.
    </p>
    <p style="color: #555;">
      <strong>Student Details:</strong>
    </p>
    <ul style="color: #555; padding-left: 20px;">
      <li><strong>Name:</strong> ${student.name}</li>
      <li><strong>Duration:</strong> ${req.body.duration} months</li>
    </ul>
    <p>
      We trust that you will provide excellent mentorship and help the student achieve their goals.
    </p>
    <p>Best regards,<br><span style="color: #3A5AFF;">The PrepSaarthi Team</span></p>
  </div>
`;
        await sendMail({
          email: student.email,
          subject: `Successfull purchase for ${mentor.name}'s mentorship`,
          message: emailContent,
        });
        await sendMail({
          email: mentor.email,
          subject: `New Student Enrolled For Your Mentorship`,
          message: mentorEmailContent,
        });
  res.status(200).json({
    success: true,
    message: "Connection Established Successfully",
  });
});
