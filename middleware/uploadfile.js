const multer =require( "multer")
const fs =require( "fs")

var DIR = './images/';
if (!fs.existsSync(DIR)) { // CREATE DIRECTORY IF NOT FOUND
fs.mkdirSync(DIR, { recursive: true });
}
const storage = multer.diskStorage({
destination: (req, file, callback) => {

callback(null, DIR);
},
filename: (req, file, callback) => {
const name = file.originalname.split(' ').join('_');
callback(null, name);
}

});

const uploadFile = multer({
storage: storage
});
module.exports={uploadFile};