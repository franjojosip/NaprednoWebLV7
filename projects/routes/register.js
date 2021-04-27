var User = require("../model/user");
var bcrypt = require("bcryptjs");

exports.form = function (req, res) {
  res.render("users/register", { title: "Registracija" });
};

//Funkcija za spremanje korisnika
exports.submit = function (req, res, next) {
  User.findOne({ korisnicko_ime: req.body.username }, function (err, user) {
    if (err) return next(err);
    //Ako je korisničko ime zauzeto
    if (user) {
      res.error("Korisničko ime je zauzeto!");
      res.redirect("back");
    } else {
      const lozinkaHash = bcrypt.hashSync(req.body.password, 10);
      //Stvori novog korisnika
      user = User.create(
        {
          korisnicko_ime: req.body.username,
          lozinka: lozinkaHash,
        },
        function (err, user) {
          if (err) {
            res.send("There was a problem with adding the user.");
          } else {
            //Preusmjeri na naslovnu stranicu
            res.redirect("/");
          }
        }
      );
    }
  });
};
