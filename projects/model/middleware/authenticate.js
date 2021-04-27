var User = require("../user");
var bcrypt = require("bcryptjs");

//Funkcija koja uspoređuje korisničko ime i lozinku
exports.authenticate = function (username, password, fn) {
  User.findOne(
    { korisnicko_ime: username },
    function (err, user) {
      if (err) return fn(err);
      if (user == null) return fn();
      if (bcrypt.compareSync(password, user.lozinka)) {
        return fn(null, user);
      }
      else{
        return fn();
      }
    }
  );
};
