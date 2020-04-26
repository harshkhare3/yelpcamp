 var express = require("express");
var router = express.Router();
var passport = require("passport");
var cloudinary = require('cloudinary');
var User = require("../models/user");
var Campground = require("../models/campground.js");
var path = require("path");
var upload = require("../handlers/multer.js");
var client = require("socket.io");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

require("../handlers/cloudinary.js");

/* GET home page. */
router.get('/', function(req, res, next) {
       res.render("landing.ejs");
});

router.use(express.static(__dirname+"./public/"));
//==============
//AUTH ROLUTES

//SIGNUP ROUTE
//show register form
router.get('/register', function(req, res, next){
	res.render("register.ejs");
});
//handel sign-up logic
router.post('/register', function(req, res, next){
	var newUser = new User(
		{username: req.body.username , 
		 firstName:req.body.firstName , 
		 lastName:req.body.lastName , 
		 email:req.body.email , 
		 avatar:"https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png",
		 avatarId:"",
		 bio:""

		});
	
	if(req.body.adminCode === 'secretcode123'){
		newUser.isAdmin = true;
	}
	User.register(newUser, req.body.password, function(err, user){
		if(err){
			
			req.flash("error", err.message);
			return res.redirect("back");
		}
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "Welcome to YelpCamp " + user.username);	
			res.redirect("/campgrounds");
		});
	});
});

//LOGIN ROUTE
//show login form
router.get('/login', function(req, res, next){
	res.render("login.ejs");
});
//handeling login logic ::: USE middleware
router.post('/login', passport.authenticate("local", {
	failureRedirect: "back",
	failureFlash:"Login failed! Wrong user Credentials." ,
	successRedirect: "/campgrounds",
	successFlash: "Welcome to YelpCamp!"

}),function(req, res, next){
});


//SIGN OUT ROUTE 
router.get('/logout', function(req, res, next){
	req.logout();
	req.flash("success","Logged you out!");
	res.redirect("/campgrounds");
});

//USER PROFILE
router.get("/users/:id", function(req, res,next){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "Something went wrong.");
			return res.redirect("back");
		}
		//eval(require('locus'));
		Campground.find().where('author.id').equals(foundUser.id).exec(function(err, campgrounds){
			if(err){
			    req.flash("error", "Something went wrong.");
			    return res.redirect("back");	
			}
		res.render("user/show.ejs" , {user: foundUser , campgrounds: campgrounds});
		
		});	
			
	});
});

//FORGOT PASSWORD - Using NODEMAILER
//For doubt, see video on youtube

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot.ejs');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
		 //eval(require('locus')); 
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'ecohr01@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'ecohr01@gmail@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        //console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset.ejs', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'ecohr01@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'ecohr01@gmail@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

//Add a profile pic
router.put("/users/:id" , upload.single('image'), function(req, res, next){
	
	// res.send(req.file.path);
	User.findById(req.params.id , async function(err, user){
		  if(err){
			  req.flash("error",err.message);
			  res.rediret("back");
		  }
		  else { 
			  if( user.avatarId == ""){
                  if(req.file){
					     var result = await cloudinary.uploader.upload(req.file.path);
						  user.avatarId = result.public_id;
				          user.avatar = result.secure_url; 
				      }  	
					user.bio = req.body.bio;
				    user.firstName = req.body.firstName;
				    user.lastName = req.body.lastName;
				    //eval(require('locus'));
			        user.save();
	                req.flash("success","Successfully Updated!");
	                res.redirect("/users/" + user._id); 	  
				  }
			  
			  else {
				 if(req.file){
				 try{
					 await cloudinary.v2.uploader.destroy(user.avatarId);
					 var result = await cloudinary.uploader.upload(req.file.path);
					 user.avatarId = result.public_id;
				     user.avatar = result.secure_url; 
				 }
				 catch(err){
					 req.flash("error", err.message);
				     res.redirect("back");
				 }
				 
			   }
				  user.bio = req.body.bio;
				  user.firstName = req.body.firstName;
				  user.lastName = req.body.lastName;
			      user.save();
	              req.flash("success","Successfully Updated!");
	              res.redirect("/users/" + user._id); 	  
			 }
			  
			 
             
		
			}
	});				
});

module.exports = router;