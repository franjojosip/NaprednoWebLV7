var express = require("express");
var router = express.Router();
const Project = require("../model/project");
const User = require("../model/user");
const Joi = require("joi");
const methodOverride = require("method-override");

router.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      var method = req.body._method;
      delete req.body._method;
      return method;
    }
  })
);

/* Dohvaćanje svih projekata ovisno o ulozi. */
router.get("/", function (req, res, next) {
  var role = req.query.role;
  if (role == null) {
    req.session.rol = "owner";
    role = "owner";
  }
  if (role == "owner") {
    var filter = { vlasnik_id: req.session.uid, arhiviran: false };
    var isOwner = true;
  } else {
    var filter = { clanovi: req.session.uid, arhiviran: false };
    var isOwner = false;
  }
  Project.find(filter, function (err, projects) {
    if (err) {
      return console.error(err);
    } else {
      projects.map(function (project) {
        var names = [];
        project.clanovi.forEach(function (clan) {
          names.push(clan.korisnicko_ime);
        });
        project.imena_clanova = names.join(", ");
      });
      var uloga = isOwner ? "Voditelj" : "Član";
      res.format({
        html: function () {
          res.render("projects/index", {
            title: "Projekti - " + uloga,
            projects: projects,
            isOwner: isOwner,
          });
        },
        json: function () {
          res.json(projects);
        },
      });
    }
  }).populate("clanovi", { korisnicko_ime: 1 }).sort({created_at: -1});
});

/* Dohvaćanje arhiviranih projekata za korisnika. */
router.get("/archive-projects", function (req, res) {
  var query = {
    $or: [{ vlasnik_id: req.session.uid }, { clanovi: req.session.uid }],
    arhiviran: true,
  };
  Project.find(query, function (err, projects) {
    if (err) {
      return console.error(err);
    } else {
      projects.map(function (project) {
        if (project.vlasnik_id == req.session.uid) {
          project.isOwner = true;
        } else {
          project.isOwner = false;
        }
      });
      res.format({
        html: function () {
          res.render("projects/archive", {
            title: "Archived projects",
            projects: projects,
          });
        },
        json: function () {
          res.json(projects);
        },
      });
    }
  }).sort({created_at: -1});
});

/* Arhiviranje projekta samo ako postoji i ako je ulogirani korisnik vlasnik projekta */
router.get("/archive/:id", function (req, res, next) {
  const id = req.params.id;
  if (id == null || id.length != 24) {
    return res.status(400).send("Invalid project ID");
  }
  Project.findById(id, function (err, project) {
    if (err) {
      res.render("/projects");
    } else {
      if (project.vlasnik_id == req.session.uid) {
        project.update(
          {
            arhiviran: true,
          },
          function (err, project) {
            if (err) {
              res.send("There was a problem with updating a project.");
            } else {
              res.format({
                html: function () {
                  res.message("Successfully archived project!");
                  res.redirect("/projects");
                },
              });
            }
          }
        );
      } else {
        res.error("You are not part of this project!");
        res.redirect("/projects");
      }
    }
  });
});

/* Vraćanje stranice za dodavanje projekta. */
router.get("/add", function (req, res) {
  User.find({ _id: { $ne: req.session.uid } }, function (err, users) {
    if (err) {
      res.render("/projects");
    } else {
      users.map(function (user) {
        delete user.lozinka;
        delete user.projekti;
        delete user.createdAt;
        delete user.updatedAt;
      });
      res.format({
        html: function () {
          res.render("projects/add", {
            title: "Add New Project",
            users: users,
          });
        },
        json: function () {
          res.json(users);
        },
      });
    }
  });
});

/* Dohvaćanje projekta i provjera ima li ovlasti. */
router.get("/:id", function (req, res, next) {
  const id = req.params.id;
  if (id == null || id.length != 24) {
    return res.status(400).send("Invalid project ID");
  }
  Project.findById(id, function (err, project) {
    if (err) {
      res.render("/projects");
    } else {
      if (checkIfUserConnectedToProject(project, req.session.uid)) {
        var names = [];
        project.clanovi.forEach(function (clan) {
          names.push(clan.korisnicko_ime);
        });
        project.imena_clanova = names;
        res.format({
          html: function () {
            res.render("projects/show", {
              title: "Show Project",
              project: project,
            });
          },
          json: function () {
            res.json(project);
          },
        });
      } else {
        res.error("You are not part of this project!");
        res.redirect("/projects");
      }
    }
  }).populate("clanovi", { korisnicko_ime: 1 });
});

const projectSerializer = Joi.object({
  project_name: Joi.string().required(),
  project_description: Joi.string().required(),
  jobs_done: Joi.string().required(),
  project_price: Joi.number().required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
});

/* Kreiranje projekta. */
router.post("/create", function (req, res, next) {
  var memberIds = req.body["members[]"];
  delete req.body["members[]"];
  const result = projectSerializer.validate(req.body);
  if (result.error) {
    return res.status(400).send(result.error);
  }

  Project.create(
    {
      vlasnik_id: req.session.uid,
      naziv_projekta: result.value.project_name,
      opis_projekta: result.value.project_description,
      obavljeni_poslovi: result.value.jobs_done,
      cijena_projekta: result.value.project_price,
      datum_pocetka: result.value.start_date,
      datum_zavrsetka: result.value.end_date,
      clanovi: memberIds,
    },
    function (err, project) {
      if (err) {
        res.send("There was a problem with adding the project.");
      } else {
        res.format({
          html: function () {
            res.location("projects");
            res.redirect("/projects?role=owner");
          },
        });
      }
    }
  );
});

/* Dohvaćanje stranice za izmjenu projekta i provjera ovlasti na projektu. */
router.get("/edit/:id", function (req, res, next) {
  const id = req.params.id;
  if (id == null || id.length != 24) {
    return res.status(400).send("Invalid project ID");
  }
  Project.findById(id, function (err, project) {
    if (err) {
      res.render("/projects");
    } else {
      if (checkIfUserConnectedToProject(project, req.session.uid)) {
        User.find({ _id: { $ne: req.session.uid } }, function (err, users) {
          if (err) {
            res.render("/projects");
          } else {
            users.map(function (user) {
              delete user.lozinka;
              delete user.projekti;
              delete user.createdAt;
              delete user.updatedAt;
            });

            var datum_pocetka = project.datum_pocetka.toISOString();
            var datum_zavrsetka = project.datum_zavrsetka.toISOString();

            datum_pocetka = datum_pocetka.substring(
              0,
              datum_pocetka.indexOf("T")
            );
            datum_zavrsetka = datum_zavrsetka.substring(
              0,
              datum_zavrsetka.indexOf("T")
            );

            users.map(function (user) {
              user.isSelected = project.clanovi.indexOf(user._id) != -1;
            });

            res.format({
              html: function () {
                res.render("projects/edit", {
                  title: "Edit Project",
                  project: project,
                  datum_pocetka: datum_pocetka,
                  datum_zavrsetka: datum_zavrsetka,
                  isOwner: project.vlasnik_id == req.session.uid,
                  users: users,
                });
              },
              json: function () {
                res.json(project, users);
              },
            });
          }
        });
      } else {
        res.error("You are not part of this project!");
        res.redirect("/projects");
      }
    }
  });
});

/* Ažuriranje podataka o projektu. */
router.put("/update/:id", function (req, res, next) {
  var isOwner = req.body.isOwner;
  delete req.body.isOwner;

  if (isOwner == "true") {
    var memberIds = req.body["members[]"];
    var filteredIds = [];
    if(memberIds.length > 0){
      memberIds.forEach(function(id){ 
        if(id.length == 24){
          filteredIds.push(id)
        };
      });
    }
    delete req.body["members[]"];

    const result = projectSerializer.validate(req.body);
    if (result.error) {
      return res.status(400).send(result.error);
    }
    var parameters = {
      naziv_projekta: result.value.project_name,
      opis_projekta: result.value.project_description,
      obavljeni_poslovi: result.value.jobs_done,
      cijena_projekta: result.value.project_price,
      datum_pocetka: result.value.start_date,
      datum_zavrsetka: result.value.end_date,
      clanovi: filteredIds,
    };
  } else {
    var parameters = { obavljeni_poslovi: req.body["jobs_done"] };
  }
  const id = req.params.id;
  if (id == null || id.length != 24) {
    return res.status(400).send("Invalid project ID");
  }
  Project.findById(id, function (err, project) {
    if (checkIfUserConnectedToProject(project, req.session.uid)) {
      project.update(parameters, function (err, project) {
        if (err) {
          res.send("There was a problem with updating a project.");
        } else {
          var role = isOwner == "true" ? "?role=owner" : "?role=member";
          res.format({
            html: function () {
              res.location("projects");
              res.redirect("/projects" + role);
            },
          });
        }
      });
    } else {
      res.error("You are not part of this project!");
      res.redirect("/projects");
    }
  });
});

/* Brisanje projekta ako je ulogirani korisnik vlasnik i ako dobiveni projekt id postoji. */
router.delete("/delete/:id", function (req, res, next) {
  Project.findById(req.params.id, function (err, project) {
    if (err) {
      res.render("/projects");
      console.error(err);
    } else {
      if (project.vlasnik_id == req.session.uid) {
        project.remove(function (err, project) {
          if (err) {
            res.render("/projects");
            console.error(err);
          } else {
            res.format({
              html: function () {
                res.location("projects");
                res.redirect("/projects");
              },
            });
          }
        });
      } else {
        res.error("You are not part of this project!");
        res.redirect("/projects");
      }
    }
  });
});

function checkIfUserConnectedToProject(project, userID) {
  if (
    project.vlasnik_id == userID ||
    (project.clanovi != null && project.clanovi.indexOf(userID) >= 0)
  ) {
    return true;
  } else {
    return false;
  }
}

module.exports = router;