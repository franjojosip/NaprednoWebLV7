const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const user = new Schema(
  {
    korisnicko_ime: String,
    lozinka: String,
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
  { collection: "users" }
);
module.exports = mongoose.model("user", user);
