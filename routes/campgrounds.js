var express = require("express");
var router = express.Router();
var Campground = require("../models/campground.js");
var User = require("../models/user.js");
var middleware = require("../middleware/index.js");
var NodeGeocoder = require('node-geocoder');
var async = require('async');
var upload = require("../handlers/multer.js");

var cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'dwveq4qsi', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//For Google Maps
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);
router.get('/campgrounds', function(req, res, next) {
		var noMatch = null;
	// Fuzzy Search    
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
			 Campground.find({name: regex},function(err, allCampgrounds){
			if(err){
				console.log(err);
			}
			else{
			  if(allCampgrounds.length <1){
				  noMatch="No campgrounds match that query, please try again.";
			  }
				res.render("campgrounds/index.ejs",{campgrounds:allCampgrounds ,noMatch:noMatch})
			}
		});
	}
	else{
        //Get all campgrounds from db and render
	    Campground.find({},function(err, allCampgrounds){
			if(err){
				console.log(err);
			}
			else{
				res.render("campgrounds/index.ejs",{campgrounds:allCampgrounds,noMatch:noMatch})
			}
		});
	}
});

//CREATE - add new campground to DB
router.get('/campgrounds/new', middleware.isLoggedIn, function(req, res, next){
    res.render("campgrounds/new.ejs");

});

router.post("/campgrounds", middleware.isLoggedIn, upload.single('image'), async function(req, res){
	if(req.file){
		
	var result = await cloudinary.uploader.upload(req.file.path);
  // add cloudinary url for the image to the campground object under image property	
  
// get data from form and add to campgrounds array
  //var name = req.body.name;

// add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
		//eval(require('locus'));	
		
}
	else if(!req.file){
		req.body.campground.image = req.body.img;
		req.body.campground.imageId = "";
		//eval(require('locus'));
	}
	//eval(require('locus'));
    req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
 
    geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;
    //var newCampground = {name: name, image: image, imageId:imageId,description: desc, author:author, location: location, lat: lat, lng: lng};
    // Create a new campground and save to DB
    Campground.create(req.body.campground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds");
        }
     });
   }); 
  });



//SHOW MORE INFO ABOUT CAMPGROUND
router.get('/campgrounds/:id', function(req, res, next){
	//find the campground with provided Id
	Campground.findById(req.params.id).populate("comments likes").exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("erroe", "Campground not found");
			res.redirect("back");
		}
		else{
		    //render show templet with the campground
            res.render("campgrounds/show.ejs", {campground: foundCampground});
        }
	});
});

	
//EDIT and UPDATE CAMPGROUND ROUTE
	//edit
router.get("/campgrounds/:id/edit",  middleware.checkCampgroundOwnership , function(req, res, next){
		Campground.findById(req.params.id, function(err,foundCampground){
		res.render("campgrounds/edit.ejs", {campground:foundCampground});	
	});
	  
 });

// UPDATE CAMPGROUND ROUTE
router.put("/campgrounds/:id", middleware.checkCampgroundOwnership, upload.single('image'), function(req, res){
	//If someone has uploaded a file i.e someone has edited the image as image is the only file present, then do this
	Campground.findById(req.params.id , async function(err, campground){
       if(err){
		   req.flash("error","This campground don't exist in the database.");
		   res.redirect("back");
	   }
   else{
		   if(campground.imageId == ""){
			    if(req.file){
					var result = await cloudinary.uploader.upload(req.file.path);
				    campground.imageId = result.public_id;
				    campground.image = result.secure_url;  
			  
				}
			   else{
                campground.image = req.body.img;
			    campground.imageId = "";
			   }
		   }
		   else if(campground.imageId != ""){
			   if(req.file){
				   try{
				   await cloudinary.v2.uploader.destroy(campground.imageId);
		           var result = await cloudinary.uploader.upload(req.file.path);
				   campground.imageId = result.public_id;
			       campground.image = result.secure_url;
			      }
				   catch(err){
                   req.flash("error", error.message);
				   res.redirect("back");
				  }
			   }
	           
				   // eval(require('locus'));
					await cloudinary.v2.uploader.destroy(campground.imageId);
					campground.image = req.body.img;
			        campground.imageId = "";
			   
		   }
			  
	
		   geocoder.geocode(req.body.location, function (err, data) {
           if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
            }
          campground.lat = data[0].latitude;
          campground.location = data[0].formattedAddress;
	        });
	      campground.name = req.body.name;
	      campground.description = req.body.description;
	      campground.price = req.body.price;
	      campground.save();
	      req.flash("success","Successfully Updated!");
          res.redirect("/campgrounds/" + campground._id);	
       }
	});	
});	

//DESTROY CAMPGROUND ROUTE
router.delete("/campgrounds/:id",  middleware.checkCampgroundOwnership  , function(req,res,next){
 Campground.findById(req.params.id , async function(err, campground){	
	 if(err){
		   req.flash("error", err.message);
		   res.redirect("back");
	       }
else{
  if(req.file){
	 try{
		 await cloudinary.v2.uploader.destroy(campground.imageId);
		 
	  }
	 catch(err){
		   req.flash("error", err.message);
		   res.redirect("back");
		 }
      }
	campground.remove();
    req.flash("success" , 'Campground deleted successfully !');
	res.redirect('/campgrounds');
  
}
	});
});

//LIKE CAMPGROUND
// Campground Like Route
router.post("/campgrounds/:id/like", middleware.isLoggedIn, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

//Function for fuzzy search
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports= router;