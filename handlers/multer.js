var multer = require('multer');

module.exports = multer({
	storage: multer.diskStorage({}),
	fileFilter: (req, file, cb) =>{
		if(!file.mimetype.match(/jpe|jpeg|png|gif$i/)){
		  return cb(new Error('Only image files are allowed!'), false);						}
	 cb(null,true);
	}
})