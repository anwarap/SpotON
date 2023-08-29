const mongoose = require("mongoose");

const productsSchema = mongoose.Schema({

    brand:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Categories',
        required:true
    },
    size:{
        type:Array,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    discountPrice:{
        type:Number,
        // required:true
    },
    quantity:{
        type:Number
    },
    images:{
        type:Array,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    createdAt:{
        type:Date,
        required:true
    },
    reviews:[{
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        },
        title:{
            type:String
        },
        description:{
            type:String
        },
        rating:{
            type:Number
        },
        createdAt:{
            type:Date
        
        }
    }]


    
});


module.exports = mongoose.model('Products',productsSchema);