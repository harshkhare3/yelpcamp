var express = require("express");
var router = express.Router();
var Campground = require("../models/campground.js");
var Comment = require("../models/comment.js");
var middleware = require("../middleware/index.js")  //if we don't write index.js,then
//also it will select the index file as index file is the main file of any directory.


//comments create
router.post('/campgrounds/:id/comments',  middleware.isLoggedIn , function(req, res, next){
	//lookup campground using id
	//create a new comment
	//connect new comment to the campground
	//redirect campground to the show page
	Campground.findById(req.params.id , function(err,campground){
		if(err){
			res.flash("error", 'Something wen wrong');
			res.redirect("/campgrounds");
		}
		else{
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					console.log(err);
				}
				else{
					//add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					//save comment
					comment.save();
					//console.log(comment);
					//save it in campground
					campground.comments.push(comment);
					campground.save();
					req.flash("success", "Successfully added comment");
					res.redirect("/campgrounds/"+ campground._id);
				}
			})
		}
	});
	
});

//UPDATE Comment
router.put('/campgrounds/:id/comments/:comment_id',  middleware.checkCommentOwnership, function (req, res, next){
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment , function(err, updatedComment){
		if(err){
			res.redirect("back");
		}
		else{
			res.redirect("/campgrounds/" + req.params.id)
		}
	});
});

//Comments DESTROY Route
router.delete("/campgrounds/:id/comments/:comment_id",  middleware.checkCommentOwnership, function(req, res, next){
	Comment.findByIdAndRemove(req.params.comment_id , function(err){
		if(err){
          res.redirect("back");
		}
		else{
		  req.flash("success", "Comments deleted");		
		  res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

module.exports= router;