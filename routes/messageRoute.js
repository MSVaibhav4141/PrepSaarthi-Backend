const express = require("express");
const router = express.Router();
const {
    saveMentorMessage,
    saveStudentMessage,
    getMentorMessages,
    getStudentMessages,
} = require("../controllers/messageController.js");

// Routes for mentors
router.post("/mentor/message", saveMentorMessage);
router.get("/mentor/messages", getMentorMessages);

// Routes for students
router.post("/student/message", saveStudentMessage);
router.get("/student/messages", getStudentMessages);

module.exports = router;
