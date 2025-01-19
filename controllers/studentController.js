const ErrorHandler = require("../utils/errorHandeler.js");
const errorCatcherAsync = require("../utils/errorCatcherAsync.js");
// const Product = require("../backend/models/productModel");
const jwtToken = require("../utils/jwtToken.js");
const { resetPasswordMessage } = require("../utils/mailformat.js");
const crypto = require("crypto");
const Student = require("../models/studentModel.js");
const Mentor = require("../models/mentorModel");
const SyllabusProgress = require("../models/syllabusModel.js");
const Connection = require("../models/connectionModel.js");
const cloudinary = require("cloudinary");
const bcryptjs = require("bcryptjs");
const OTPGenerate = require("../models/userVerficationOtp.js");
// const OTPGenerate = require('../models/userVerficationOtp.js')
const sendMail = require("../utils/sendMail.js");
const { changeCoverPhoto } = require("./mentorController.js");
//Registering a USER


exports.reegisterStudent = errorCatcherAsync(async (req, res, next) => {
  const userCheck = await Mentor.findOne({ email: req.body.email });
  const userMob = await Mentor.findOne({
    mobileNumber: req.body.mobileNumber,
  });
  if (userCheck || userMob) {
    return next(new ErrorHandler("Account already exists", 400));
  }

  const isVerified = await verifyOTP(req, next);
  if (!isVerified) {
    return next(new ErrorHandler("Incorrect or expired OTP", 400));
  }

  if (req.body.avatar) {
    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 400,
      crop: "scale",
    });
    const { name, email, password, mobileNumber } = req.body;
    const user = await Student.create({
      name,
      email,
      password,
      mobileNumber,
      verified: true,
      numVerified: true,
      signedUpFor: "student",
      avatar: { public_ID: myCloud.public_id, public_URI: myCloud.secure_url },
    });
    jwtToken(user, 201, res);
  } else {
    const { name, email, password, mobileNumber } = req.body;
    const user = await Student.create({
      name,
      email,
      password,
      verified: true,
      numVerified: true,
      mobileNumber,
      signedUpFor: "student",
    });
    await OTPGenerate.deleteMany({
      email: req.body.email,
      mobileNumber: req.body.mobileNumber,
    });
    jwtToken(user, 201, res);
  }
});

exports.verifyOTP = async (req, next) => {
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


//seperate function for both verification of numb and email
exports.verifyEmailOTP = async (req, next) => {
  const otp = req.body.emailOTP;
  if (!otp) {
    return next(new ErrorHandler("Please enter the email OTP", 400));
  }

  const userOTPVerification = await OTPGenerate.find({
    email: req.body.email,
  });

  if (userOTPVerification.length <= 0) {
    return next(
      new ErrorHandler(
        "Account doesn't exist or already verified. Please login or signup"
      )
    );
  }
  const { expiresIn, otp: hashedOTP } = userOTPVerification[0];

  if (expiresIn < Date.now()) {
    await OTPGenerate.deleteMany({ email: req.body.email });
    return false;
  }

  const validOTP = await bcryptjs.compare(otp, hashedOTP);

  if (!validOTP) {
    return false;
  }

  return true;
};

exports.verifyMobileOTP = async (req, next) => {
  const mobOtp = req.body.numberOTP;
  if (!mobOtp) {
    return next(new ErrorHandler("Please enter the mobile OTP", 400));
  }

  const userOTPVerification = await OTPGenerate.find({
    mobileNumber: req.body.mobileNumber,
  });

  if (userOTPVerification.length <= 0) {
    return next(
      new ErrorHandler(
        "Account doesn't exist or already verified. Please login or signup"
      )
    );
  }
  const { expiresIn, mobOtp: hashedMobOTP } = userOTPVerification[0];

  if (expiresIn < Date.now()) {
    await OTPGenerate.deleteMany({ mobileNumber: req.body.mobileNumber });
    return false;
  }

  const validMobOTP = await bcryptjs.compare(mobOtp, hashedMobOTP);

  if (!validMobOTP) {
    return false;
  }

  return true;
};

// USER Login

exports.loginStudent = errorCatcherAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Enter Your Email & Password", 400));
  }
  const user = await Student.findOne({ email }).select("+password");
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

//Buy Mentorship

exports.buyMentorShipDay = errorCatcherAsync(async (req, res, next) => {
  const { id, price } = req.body;
  const user = await Student.findById(req.user._id);
  if (!user) {
    return next(new ErrorHandler("No such user exists", 400));
  }
  const mentor = await Mentor.findById(id);
  if (!mentor) {
    return next(new ErrorHandler("No such mentor exists", 400));
  }
  user.mentorAssigned = true;
  const connection = {
    studentDetails: req.user.id,
    mentorDetails: id,
    expiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    isConnected: false,
    price: price,
  };
  await Connection.create(connection);
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    success: true,
  });
});
//Buy Mentorship

exports.getAllAssignedMentors = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.find({ studentDetails: req.user.id })
    .populate("studentDetails", "name avatar")
    .populate("mentorDetails", "name avatar");
  res.status(200).json({
    connection,
  });
});
// get all connection
exports.allConnectionSuccessfull = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.find({
    mentorDetails: req.params.id,
    // isActive: false,
    // isConnected: false,
  });
  const uniqueConnections = Array.from(
    new Map(
      connection.map((connection) => [
        connection.studentDetails.toString(),
        connection,
      ])
    ).values()
  );
  // connection
  res.status(200).json({
    success: true,
    count: uniqueConnections.length,
  });
});
//active Mentorship
exports.getActiveMentorship = errorCatcherAsync(async (req, res, next) => {
  const connection = await Connection.find({
    studentDetails: req.user.id,
    isActive: true,
  });
  res.status(200).json({
    connection,
  });
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

// Forgot Password

exports.forgotPass = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findOne({ email: req.body.email });

  if (!user || !user.isActive) {
    return next(new ErrorHandler("User not found", 404));
  }

  const resetToken = user.generateResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordURI = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

  const message = resetPasswordMessage(user, resetPasswordURI);

  try {
    await sendMail({
      email: user.email,
      subject: "PrepSaarthi Password Recovery Support",
      message,
    });

    res.status(200).json({
      success: true,
      message: `An email for password recovery has been  sent to your registered email`,
    });
  } catch (e) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(e.message, 500));
  }
});

// //Reset Password

exports.resetPassord = errorCatcherAsync(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.tkid)
    .toString("hex");

  const user = await Student.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ErrorHandler("Invalid or Expired Token", 400));
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHandler("Both the password must match", 400));
  }

  user.password = req.body.password;

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  const message = passwordChange(user);

  try {
    await sendMail({
      email: user.email,
      subject: "Your password has been changed",
      message,
    });

    jwtMssg(user, 200, res);
  } catch (e) {
    return next(new ErrorHandler(e.message, 500));
  }
});

// // Get User Detail

exports.getStudentDetails = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findById(req.params.id);
  if (!user.isActive) {
    return next(new ErrorHandler("No SUch Account Exists", 404));
  }
  res.status(200).json({
    message: true,
    user: {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      exam: user.exam,
      idCard: user.idCard,
      branch: user.branch,
      yearOfStudy: user.yearOfStudy,
      ratings: user.ratings,
      reviews: user.reviews,
      numberOfrating: user.numOfReviews,
      userAssigned: user.userAssigned,
      desc: user.desc,
      about: user.about,
      ppm: user.pricePerMonth,
      ppd: user.pricePerDay,
    },
  });
});
// // Get User Detail

exports.loadUserDetails = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findById(req.user.id);
  if (!user.isActive) {
    return next(new ErrorHandler("No SUch Account Exists", 404));
  }

  const connection = await Connection.find({
    studentDetails: req.user._id,
    isActive: true,
  });
  if (connection.length > 0) {
    user.mentorAssigned = true;
    await user.save();
  }
  if (connection.length === 0) {
    user.mentorAssigned = false;
    await user.save();
  }
  const syllabusTracker = await SyllabusProgress.find({studentId:req.user.id})
  let chemistryTotalOb = 0;
  let chemistryTotal = 0;
  let physicsTotalOb = 0;
  let physicsTotal = 0;
  let mathsTotalOb = 0;
  let mathsTotal = 0;
  let chem11 = 0;
  let chem12 = 0;
  let phys11 = 0;
  let phys12 = 0;
  let maths11 = 0;
  let maths12 = 0;
  syllabusTracker.forEach((i) => {
    chem11 += i.chemistry11;
    chem12 += i.chemistry12;
    phys11 += i.physics11;
    phys12 += i.physics12;
    maths11 += i.maths;
    maths12 += i.maths12;
  })
  chemistryTotalOb = Math.round(((chem11*91)+(chem12*84))/175)
  physicsTotalOb = Math.round(((phys11*126) + (phys12*84))/210);
  mathsTotalOb = Math.round(((maths11*91) + (maths12*105))/196);
  const total = Math.round((((chem11*91)+(chem12*84) + (phys11*126) + (phys12*84)+(maths11*91) + (maths12*105))/(210+196+175)))
  const completion = {
    chem11,
    chem12,
    phys11,
    phys12,   
    maths11,
    maths12,
    chemistryTotalOb,
    physicsTotalOb,
    mathsTotalOb,
    total
  }
  res.status(200).json({
    message: true,
    user,
    completion,
    userSigned: req.user._id,
  });
});

// // Update User password

exports.updatePassword = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findById(req.user.id).select("+password");

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

exports.changeCoverPhotoStu = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findById(req.user._id);
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

// //  update personal info

exports.updateStudentProfile = errorCatcherAsync(async (req, res, next) => {
  const newUserData = {
    email: req.body.email,
    name: req.body.name,
    mobileNumber: req.body.number,
  };
  if (req.body.avatar && req.body.avatar !== " ") {
    const data = await Student.findById(req.user.id);
    const { avatar } = data;
    await cloudinary.v2.uploader.destroy(avatar.public_ID);
    try {
      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 400,
        crop: "scale",
      });

      newUserData.avatar = {
        public_ID: myCloud.public_id,
        public_URI: myCloud.secure_url,
      };
    } catch (e) {}
  }
  await Student.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});
exports.getSyllabusTracker = errorCatcherAsync(async (req, res, next) => {
  const { subject, division } = req.body;

  let newData;
  if (division === 11 && subject === "Chemistry") {
    newData = [
      {
        unit: "Mole Concept",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Atomic Structure",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Thermodynamics and Thermochemistry",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Chemical Equilibrium",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Ionic Equilibrium",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Periodic Table",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Chemical Bonding",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "IUPAC Nomenclature",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Isomerism",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "General Organic Chemistry (GOC)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Reaction Mechanism",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Alkane, Alkene, Alkyne (Hydrocarbons)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Aromatic Hydrocarbons",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 12 && subject === "Chemistry") {
    newData = [
      {
        unit: "Volumetric Analysis",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Chemical Kinetics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Electrochemistry",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Halogen Derivatives",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Alcohols, Phenols, and Ethers",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Aldehydes and Ketones (Carbonyl Compounds)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Carboxylic Acids and Derivatives",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Amines",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Biomolecules",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "p-block Elements (Groups 13 to 18)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Coordination Compounds",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "d and f-Block Elements",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 11 && subject === "Physics") {
    newData = [
      {
        unit: "Maths in Physics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Unit and Dimensions",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Vectors",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "1D Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "2D Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Newton's Laws of Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Work, Power, Energy",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Circular Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Center of Mass and Momentum Conservation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Rotational Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Gravitation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Oscillation (SHM)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Fluid Mechanics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Waves",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Temperature and Thermal Properties of Matter",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Kinetic Theory of Gases",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Laws of Thermodynamics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Heat Transfer",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 12 && subject === "Physics") {
    newData = [
      {
        unit: "Electrostatics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Current Electricity",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Magnetism",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Geometric Optics and Optical Instruments",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Wave Optics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Experimental Physics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Photoelectric Effect and Matter Waves",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Atomic Structure",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Nuclear Physics and Radioactivity",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Semiconductors",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Electromagnetic Induction",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Alternating Current and EM Waves",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 11 && subject === "Maths") {
    newData = [
      {
        unit: "Sets and Relations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Trigonometric Ratios",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Trigonometric Equations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Quadratic Equations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Sequences & Series",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Binomial Theorem",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Permutations and Combinations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Complex Numbers",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Straight Lines and Pair of Straight Lines",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Circles",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Conic Sections (Parabola, Ellipse, Hyperbola)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Statistics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Probability",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 12 && subject === "Maths") {
    newData = [
      {
        unit: "Functions",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Inverse Trigonometric Functions",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Matrices",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Determinants",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Limits",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Continuity & Differentiability",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Methods of differentiation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Application of derivatives",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Indefinite Integration",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Definite Integration",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Area under the curve",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Differential Equation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Vector",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Three-Dimensional Geometry",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Probability",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  }

  let syllabusProgress = await SyllabusProgress.findOne({
    studentId: req.user.id,
    subject: subject,
    division: division,
  });

  if (!syllabusProgress) {
    return res.status(200).json({
      message: newData,
    });
  } else {
    return res.status(200).json({
      message: syllabusProgress.progress,
    });
  }
});

exports.updateTracker = errorCatcherAsync(async (req, res, next) => {
  const { unitIndex, field, value, subject, division } = req.body;
  let newData;
  if (division === 11 && subject === "Chemistry") {
    newData = [
      {
        unit: "Mole Concept",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Atomic Structure",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Thermodynamics and Thermochemistry",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Chemical Equilibrium",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Ionic Equilibrium",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Periodic Table",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Chemical Bonding",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "IUPAC Nomenclature",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Isomerism",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "General Organic Chemistry (GOC)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Reaction Mechanism",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Alkane, Alkene, Alkyne (Hydrocarbons)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Aromatic Hydrocarbons",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 12 && subject === "Chemistry") {
    newData = [
      {
        unit: "Volumetric Analysis",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Chemical Kinetics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Electrochemistry",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Halogen Derivatives",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Alcohols, Phenols, and Ethers",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Aldehydes and Ketones (Carbonyl Compounds)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Carboxylic Acids and Derivatives",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Amines",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Biomolecules",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "p-block Elements (Groups 13 to 18)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Coordination Compounds",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "d and f-Block Elements",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 11 && subject === "Physics") {
    newData = [
      {
        unit: "Maths in Physics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Unit and Dimensions",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Vectors",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "1D Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "2D Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Newton's Laws of Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Work, Power, Energy",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Circular Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Center of Mass and Momentum Conservation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Rotational Motion",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Gravitation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Oscillation (SHM)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Fluid Mechanics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Waves",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Temperature and Thermal Properties of Matter",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Kinetic Theory of Gases",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Laws of Thermodynamics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Heat Transfer",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 12 && subject === "Physics") {
    newData = [
      {
        unit: "Electrostatics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Current Electricity",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Magnetism",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Geometric Optics and Optical Instruments",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Wave Optics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Experimental Physics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Photoelectric Effect and Matter Waves",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Atomic Structure",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Nuclear Physics and Radioactivity",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Semiconductors",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Electromagnetic Induction",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Alternating Current and EM Waves",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 11 && subject === "Maths") {
    newData = [
      {
        unit: "Sets and Relations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Trigonometric Ratios",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Trigonometric Equations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Quadratic Equations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Sequences & Series",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Binomial Theorem",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Permutations and Combinations",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Complex Numbers",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Straight Lines and Pair of Straight Lines",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Circles",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Conic Sections (Parabola, Ellipse, Hyperbola)",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Statistics",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Probability",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  } else if (division === 12 && subject === "Maths") {
    newData = [
      {
        unit: "Functions",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Inverse Trigonometric Functions",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Matrices",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Determinants",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Limits",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Continuity & Differentiability",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Methods of differentiation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Application of derivatives",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Indefinite Integration",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Definite Integration",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Area under the curve",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Differential Equation",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Vector",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Three-Dimensional Geometry",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
      {
        unit: "Probability",
        theory: false,
        examples: false,
        questions: false,
        pyqs: false,
        test: false,
        revision1: false,
        revision2: false,
      },
    ];
  }

  let syllabusProgress = await SyllabusProgress.findOne({
    studentId: req.user.id,
    subject: subject,
    division: division,
  });

  if (!syllabusProgress) {
    syllabusProgress = await SyllabusProgress.create({
      studentId: req.user.id, // Use student ID from the request user
      subject: subject,
      division: division,
      progress: newData, // Initialize with predefined units
    });
  }
  syllabusProgress.progress[unitIndex][field] = value;

  const calculateCompletionPercentage = (data) => {
    let totalFields = 0;
    let completedFields = 0;

    data.forEach((unitDoc) => {
      const unit = unitDoc.toObject();
      const fields = Object.keys(unit).filter((key) => key !== "unit");
      totalFields += fields.length;
      completedFields += fields.reduce(
        (acc, key) => acc + (unit[key] ? 1 : 0),
        0
      );
    });
    const completionPercentage = (completedFields / totalFields) * 100;
    return Math.round(completionPercentage);
  };
  if (subject === "Chemistry") {
    if (division === 11) {
      syllabusProgress.chemistry11 = Math.round(calculateCompletionPercentage(
        syllabusProgress.progress
      ))
    }
    if (division === 12) {
      syllabusProgress.chemistry12 = Math.round(calculateCompletionPercentage(
        syllabusProgress.progress
      ))
    }
  }
  if (subject === "Physics") {
    if (division === 11) {
      syllabusProgress.physics11 = Math.round(calculateCompletionPercentage(
        syllabusProgress.progress
      ))
    }
    if (division === 12) {
      syllabusProgress.physics12 = Math.round(calculateCompletionPercentage(
        syllabusProgress.progress
      ))
    }
  }
  if (subject === "Maths") {
    if (division === 11) {
      syllabusProgress.maths = Math.round(calculateCompletionPercentage(
        syllabusProgress.progress
      ))
    }
    if (division === 12) {
      syllabusProgress.maths12 = Math.round(calculateCompletionPercentage(
        syllabusProgress.progress
      ))
    }
  }
  await syllabusProgress.save();

  return res.json({ message: "Syllabus progress updated", syllabusProgress });
});

//Update mentor info

// exports.updateStudentInfo = errorCatcherAsync(async (req, res, next) => {
//   const newUserData = {
//     isDropper: req.body.isDropper,
//     studyMode: req.body.studyMode,
//     branch: req.body.branch,
//     exam: JSON.parse(req.body.exam),
//     yearOfStudy: req.body.yearOfStudy,
//     linkedin: req.body.linkedin,
//     youtube: req.body.youtube,
//     about: req.body.about,
//     desc: req.body.disc,
//     pricePerMonth: req.body.ppm,
//     pricePerDay: req.body.ppd,
//     isStepLastCompleted: true,
//   };
//   if (
//     !newUserData.isDropper ||
//     !newUserData.studyMode ||
//     !newUserData.exam ||
//     !newUserData.linkedin ||
//     !newUserData.youtube ||
//     !newUserData.about ||
//     !newUserData.desc ||
//     !newUserData.pricePerMonth ||
//     !newUserData.pricePerDay ||
//     !req.body.idCard
//   ) {
//     return next(
//       new ErrorHandler(
//         "All fields are compulsory. Kindly fill every fields",
//         400
//       )
//     );
//   }

//   try {
//     const myCloud = await cloudinary.v2.uploader.upload(req.body.idCard, {
//       folder: "idcard",
//       width: 400,
//       crop: "scale",
//     });

//     newUserData.idCard = {
//       public_ID: myCloud.public_id,
//       public_URI: myCloud.secure_url,
//     };
//   } catch (e) {
//   }
//   await Student.findByIdAndUpdate(req.user.id, newUserData, {
//     new: true,
//     runValidators: true,
//     useFindAndModify: false,
//   });

//   res.status(200).json({
//     success: true,
//   });
// });

// Get a single user
exports.getSingleUsers = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findById(req.params.id).select(
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

exports.getAllStudents = errorCatcherAsync(async (req, res, next) => {
  const users = await Student.find({
    role: "mentor",
    mentoringStatus: "active",
  }).select(
    "name exam avatar pricePerMonth pricePerDay collegeName branch yearOfStudy ratings createdAt"
  );
  res.status(200).json({
    success: true,
    users,
  });
});

// // update User role  (ADMIN)

// exports.updateRole = asyncErrorCatcher(async (req, res, next) => {
//   const user = await User.findById(req.params.id);
//   if (!user) {
//     return next(
//       new ErrorHandler(`User does not exsits with ID of ${req.params.id}`, 404)
//     );
//   }
//   if (req.user._id.toString() === req.params.id) {
//     return next(new ErrorHandler("You can't change your own role", 400));
//   }

//   if (user.email === process.env.PRCTRMAIL) {
//     const message = `A suspicious activity of changing your role has been done by user ${req.user.name} having ${req.user.email} and ${req.user.id} as email and ID respectivly`;
//     try {
//       await activityMail({
//         message,
//       });

//      return next(new ErrorHandler("Super Prevliged Admin can't be updated", 403));
//     } catch (e) {
//       return next(new ErrorHandler(e.message, 500));
//     }
//   }
//   if (user.role === "admin") {
//     if (req.user.email !== process.env.PRCTRMAIL)
//       return next(new ErrorHandler("You can't change an admin role", 400));
//   }

//   user.role = req.body.role;

//   await user.save();

//   res.status(200).json({
//     success: true,
//     message: `${user.name}'s Role has been changed to ${req.body.role}`,
//   });
// });

// // Deleting a user (ADMIN)

// exports.deleteUser = asyncErrorCatcher(async (req, res, next) => {
//   const user = await User.findById(req.params.id);
//   const userName = user.name;

//   if (!user) {
//     return next(
//       new ErrorHandler(`User does not exsits with ID of ${req.params.id}`, 404)
//     );
//   }

//   if ((user._id).toString() === (req.user._id).toString()) {
//     return next(
//       new ErrorHandler(`You cant delete yourself`, 400)
//     );
//   }

//   if (user.email === process.env.PRCTRMAIL) {
//     const message = `A suspicious activity of deleting your account has been done by user ${req.user.name} having ${req.user.email} and ${req.user.id} as email and ID respectivly`;
//     try {
//       await activityMail({
//         message,
//       });

//       return next(new ErrorHandler("Super Prevliged Admin can't be deleted", 403));
//     } catch (e) {
//       return next(new ErrorHandler(e.message, 500));
//     }
//   }
//   const imageId = user.avatar.public_ID;
//   await cloudinary.v2.uploader.destroy(imageId);
//   user.isActive = false;
//   user.idDeletedDate = new Date();
//   await user.save();

//   res.status(200).json({
//     sucess: true,
//     message: `${userName} removed successfully`,
//   });

// });


// });

