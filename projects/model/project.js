const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const project = new Schema(
  {
    vlasnik_id: { type: Schema.Types.ObjectId, ref: "user" },
    naziv_projekta: String,
    opis_projekta: String,
    obavljeni_poslovi: String,
    cijena_projekta: Number,
    datum_pocetka: Date,
    datum_zavrsetka: Date,
    arhiviran: {
      type: Boolean,
      default: false,
    },
    clanovi: [{ type: Schema.Types.ObjectId, ref: "user" }],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
  { collection: "projects" }
);
module.exports = mongoose.model("project", project);
