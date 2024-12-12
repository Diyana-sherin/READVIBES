const mongoose = require('mongoose')
const {Schema} = mongoose


const bookSchema = new mongoose.Schema({
    bookName : {
        type: String,
        required: true,
    },
    authorName:{
        type: String,
        required: true,
    },
    description:{
        type:String,
        required:true,
    },
    category: {
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,
    },
    regularPrice:{
        type:Number,
        required:true,
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer : {
        type:Number,
        default:0,
    },
    quantity:{
        type:Number,
        default:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","Out of Stock","Limited Stock","Discountinued"],
        required:true,
        default:"Available"
    },
},{timestamps:true});
    
const Books = mongoose.model("Books",bookSchema);

module.exports = Books;