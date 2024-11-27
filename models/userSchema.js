const mongoose = require('mongoose')
const {Schema} = mongoose

const userSchema = new Schema({
    name : {
        type:String,
        required:true
    },
    email : {
        type:String,
        required : true,
        unique : true
    },
    phone:{
        type:Number,
        required:false,
        unique : false,
        sparse : true,
        default:null,
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true,
    },
    password : {
        type:String,
        required:false,   
    },
    isBlocked : {
        type:Boolean,//status updation
        default:false
    },
    isAdmin : {
        type: Boolean,
        default:false
    },
    cart : [{
        type:Schema.Types.ObjectId,
        ref:"Cart"
    }],
    wishlist : [{
        type:Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    wallet : [{
        type:Schema.Types.ObjectId,
        ref:"Wallet"
    }],
    address : [{
        type:Schema.Types.ObjectId,
        ref:"Address"
    }],
    order : [{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    referalCode : {
        type:String,
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers : {
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category"
        },
        searchOn : {
            type:Date,
            default:Date.now,
        }
    }],
    createdAt:{
        type:Date,
        dafault:Date.now,
    },
    updatedAt:{
        type:Date,
    },
    createdBy:{
        type:String,
    },
    updatedBy:{
        type:String
    }

},{timestamps:true});


const User = mongoose.model('User',userSchema)

module.exports = User ;