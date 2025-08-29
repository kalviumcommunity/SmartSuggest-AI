const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  features: { type: Map, of: String }
});

const toolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  plans: [planSchema]
}, { timestamps: true });

module.exports = mongoose.model("Tool", toolSchema);
