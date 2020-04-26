+require('dotenv').config();

var express                = require('express'),
     app                   = express(),
     bodyParser            = require("body-parser"),
	 mongoose              = require("mongoose"),
     passport              = require("passport"),
	 LocalStrategy         = require("passport-local"),
	 methodOverride        = require("method-override"),
	 flash                 = require("connect-flash"),
   //passportLocalMongoose = require("passport-local-mongoose"),
	 Campground            = require("./models/campground.js"),
	 Comment               = require("./models/comment"),
	 //seedDB                = require("./seed"),
     User                  = require("./models/user"),
	 expressSanitizer = require("express-sanitizer");

	 //client                = require("socket.io").listen(4000).sockets;

//requiring routes
var commentRoutes    = require("./routes/comments"),
	campgroundRoutes = require("./routes/campgrounds"),
	indexRoutes      = require("./routes/index");

mongoose.connect("mongodb://localhost:27017/yelp_camp", { useNewUrlParser: true , useUnifiedTopology: true,  useFindAndModify: false , useCreateIndex: true});
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
//seedDB(); //seed the database

//PASSPORT CONFIGURATION
app.use(require("express-session")({
	secret: "I aam back",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
    res.locals.moment = require("moment");
	next();
});

app.use(indexRoutes);
app.use(commentRoutes);
app.use(campgroundRoutes);


app.listen(200, () => {
	console.log("Now serving your app");
});