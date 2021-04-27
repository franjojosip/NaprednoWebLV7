var Auth = require("../model/middleware/authenticate");

//Prikaz forme za prijavu
exports.form = function (req, res) {
  res.render("users/login", { title: "Login" });
};

exports.submit = function (req, res, next) {
  //Provjera postoji li korisnik sa zadanim imenom i lozinkom u bazi
  Auth.authenticate(req.body.username, req.body.password, function (err, user) {
    if (err) return next(err);
    if (user) {
      req.session.uid = user.id;
      res.redirect("/");
    } else {
      res.error("Podaci za prijavu nisu ispravni!");
      res.redirect("back");
    }
  });
};

//Odjava korisnika
exports.logout = function (req, res) {
  //Brisanje session-a
  req.session.destroy(function (err) {
    if (err) throw err;
    res.redirect("/");
  });
};
