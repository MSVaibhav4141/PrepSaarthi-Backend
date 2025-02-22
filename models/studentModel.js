const mongoose = require("mongoose");
const validate = require("validator");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { type } = require("os");
const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Your Name"],
    maxLength: [50, "Length of your name should be less than 50 characters"],
    minLength: [3, "Length of your name should be more than 3 characters"],
  },

  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
    validate: [validate.isEmail, "Please enter a valid email"],
  },
  coverImg: {
    public_ID: {
      type: String,
      required:[true, "Please specify your public_id"],
      default:"collegePhoto"
    },
    public_URI: {
      type: String,
      required:[true, "Please specify your public_uri"],
      default:"/images/cover.jpg"
    },
  },
  verified:{
    type:Boolean,
    default:false,
    required:true,
  },
  numVerified:{
    type:Boolean,
    default:false,
    required:true,
  },
  
  signedUpFor : {
    type:String,
    default:"student"
   },

  mobileNumber: {
    type: String,
    required: [true, "Please enter your mobile number"],
    minLength: [5, "Enter a valid mobile number"],
    maxLength: [10, "Enter a valid mobile number"],
    unique:true
  },

  password: {
    type: String,
    required: [true, "Please Enter Your password"],
    minLength: [8, "Password must have atleast 8 characters"],
    select: false,
  },
  avatar: {
    public_ID: {
      type: String,
      required:[true, "Please specify your public_id"],
      default:"profilimage"
    },
    public_URI: {
      type: String,
      required:[true, "Please specify your public_uri"],
      default:"/images/profile.png"
    },
  },

  mentorAssigned: {
    type: Boolean,
    default: false
  },

  role: {
    type: String,
    default: "student",
  },

  subscription : {
    id:String,
    status:String
  },
  subscriptionType:{
    type:String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive:{
    type:Boolean,
    default:true
  },
  idDeletedDate:{
    type:Date,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  physics: {
    type: [{
      chapterId: {
        type: String,
        required: true
      },
      note: {
        type: String,
        default: ""
      },
      isComplete: {
        type: Boolean,
        default: false
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }],
  },

  chemistry: {
    type: [{
      chapterId: {
        type: String,
        required: true
      },
      note: {
        type: String,
        default: ""
      },
      isComplete: {
        type: Boolean,
        default: false
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }],
  },

  maths: {
    type: [{
      chapterId: {
        type: String,
        required: true
      },
      note: {
        type: String,
        default: ""
      },
      isComplete: {
        type: Boolean,
        default: false
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }],
  }
});

studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcryptjs.hash(this.password, 11);
});

studentSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SEC, {
    expiresIn: process.env.JWT_EXP,
  });
};

studentSchema.methods.verifyPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

studentSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
module.exports = mongoose.model("Student", studentSchema);
