const MentorMessage = require("../models/mentorMessage");
const StudentMessage = require("../models/studentMessage");

// Save a message for mentors
exports.saveMentorMessage = async (req, res) => {
  try {
    console.log(req.body);
    const { messagement } = req.body;
    console.log(messagement);

    const date = Date.now();

    if (!messagement) return res.status(400).json({ error: "Message is required" });

    const savedMessage = new MentorMessage({ message: messagement, createdAt: date });
    await savedMessage.save();
    res.status(201).json({ success: true, data: savedMessage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.saveStudentMessage = async (req, res) => {
  try {
    console.log(req.body);

    const { messagestudent } = req.body;
    const date = Date.now();


    if (!messagestudent) return res.status(400).json({ error: "Message is required" });

    const savedMessage = new StudentMessage({ message: messagestudent, createdAt: date });
    await savedMessage.save();
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
exports.getStudentMessages = async (req, res) => {
  console.log("working");
  
  try {
    const messages = await StudentMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
