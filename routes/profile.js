var express = require('express');
var router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require("../models/User");
const Goal = require("../models/Goal");
const Trade = require("../models/Trade");

// Middleware to check if logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Configure multer for profile photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads/profile-photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET Profile page
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.render("profile", {
      user,
      goals,
      error: null,
      success: null
    });
  } catch (error) {
    res.render("profile", {
      user: null,
      goals: [],
      error: "Error loading profile",
      success: null
    });
  }
});

// UPDATE username
router.post("/update-username", isLoggedIn, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: "Username already taken" });
    }

    await User.findByIdAndUpdate(req.user._id, { username: username.trim() });
    res.json({ success: "Username updated successfully", newUsername: username.trim() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPLOAD profile photo
router.post("/upload-photo", isLoggedIn, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const photoPath = `/uploads/profile-photos/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { profilePhoto: photoPath });

    res.json({ success: "Photo uploaded successfully", photoPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD a trading rule
router.post("/rules/add", isLoggedIn, async (req, res) => {
  try {
    const { ruleText, category } = req.body;

    if (!ruleText || ruleText.trim().length < 5) {
      return res.status(400).json({ error: "Rule must be at least 5 characters" });
    }

    const newRule = {
      _id: new (require('mongoose')).Types.ObjectId(),
      text: ruleText.trim(),
      category: category || null,
      active: true,
      createdAt: new Date()
    };

    await User.findByIdAndUpdate(req.user._id, { $push: { rules: newRule } });
    res.json({ success: "Rule added successfully", rule: newRule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a trading rule
router.post("/rules/update/:ruleId", isLoggedIn, async (req, res) => {
  try {
    const { ruleText, category, active } = req.body;
    const { ruleId } = req.params;

    if (!ruleText || ruleText.trim().length < 5) {
      return res.status(400).json({ error: "Rule must be at least 5 characters" });
    }

    await User.updateOne(
      { _id: req.user._id, "rules._id": ruleId },
      {
        $set: {
          "rules.$.text": ruleText.trim(),
          "rules.$.category": category || null,
          "rules.$.active": active === 'true' || active === true
        }
      }
    );

    res.json({ success: "Rule updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a trading rule
router.post("/rules/delete/:ruleId", isLoggedIn, async (req, res) => {
  try {
    const { ruleId } = req.params;

    await User.findByIdAndUpdate(req.user._id, { $pull: { rules: { _id: ruleId } } });
    res.json({ success: "Rule deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all rules for user (active and inactive)
router.get("/rules", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ rules: user.rules || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
