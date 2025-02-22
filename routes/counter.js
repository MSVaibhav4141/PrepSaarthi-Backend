const express = require("express");
const { updateCount, getCount } = require("../controllers/counterController");
const isAuthorize = require("../middlewares/isAuthorize");
const roleAuth = require("../utils/roleAuth");
const router = express.Router();
const multer = require("multer");
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
router.route("/api/update-counts").post(updateCount)
router.route('/api/get/date').get( getCount)
module.exports = router;