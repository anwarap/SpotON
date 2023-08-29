const multer =require('multer');;
const path = require('path');

const storage = multer.diskStorage({
    destination: ((req, file, cb) => {
        const folderName = file.fieldname;
        cb(null,path.join(__dirname,'../public/assets/images',`${folderName}s`))

    }),
    filename:((req,file,cb)=>{
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    })
});

const upload = multer({
    storage:storage,
    imageLimit:3
});

module.exports = upload;