const MentorMessage = require("../models/MentorMessage");
const StudentMessage = require("../models/StudentMessage");
const errorCatcherAsync = require("./utils/errorCatcherAsync");

// Save a message for mentors
exports.saveMentorMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });

    const savedMessage = await MentorMessage.create({ message });
    res.status(201).json({ success: true, data: savedMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Save a message for students
exports.saveStudentMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });

    const savedMessage = await StudentMessage.create({ message });
    res.status(201).json({ success: true, data: savedMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Retrieve messages for mentors
exports.getMentorMessages = async (req, res) => {
  try {
    const messages = await MentorMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Retrieve messages for students
exports.getStudentMessages = errorCatcherAsync(async (req, res) => {
  const messages = await StudentMessage.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: messages });
});
