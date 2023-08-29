const mongoose = require("mongoose");

const categoriesSchema = mongoose.Schema({

    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        // required:true
    },
    isListed:{
        type:Boolean,
        default:true
    }
});

module.exports = mongoose.model("Categories",categoriesSchema);