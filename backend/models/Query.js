const mongoose = require("mongoose");

const querySchema = new mongoose.Schema({
  userId: { type: String },
  query: { type: String, required: true },
  response: { type: mongoose.Schema.Types.Mixed },
  toolNames: [String]
}, { timestamps: true });

module.exports = mongoose.model("Query", querySchema);
