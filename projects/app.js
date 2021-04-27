var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var session = require("express-session");
var indexRouter = require("./routes/index");
var projectRouter = require("./routes/projects");
var login = require("./routes/login");
var register = require("./routes/register");
var messages = require('./model/messages');
var user = require('./model/middleware/user');

var app = express();
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(messages);
app.use(user);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/projects", checkUser, projectRouter);

//Registration form
app.get("/register", register.form);
app.post("/register", register.submit);

//Login form
app.get("/login", login.form);
app.post("/login", login.submit);

//Logout
app.get('/logout', login.logout);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

mongoose.connect("mongodb://127.0.0.1/projectslv7", {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

function checkUser(req, res, next) {
  if (req.session.uid == null){
      res.redirect('/login');
  }   else{
      next();
  }
}

module.exports = app;
