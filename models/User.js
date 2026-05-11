const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  profilePhoto: {
    type: String,
    default: null
  },
  rules: [{
    _id: mongoose.Schema.Types.ObjectId,
    text: String,
    category: {
      type: String,
      enum: [null, "Discipline", "Risk", "Psychology"],
      default: null
    },
    active: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// THIS MUST BE A FUNCTION
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
