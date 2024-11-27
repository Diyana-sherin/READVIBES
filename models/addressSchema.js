const mongoose = require('mongoose')
const {Schema} = mongoose



const addressSchema  = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    addresses:[{
        name:{
            type:String,
            required:true,
        },
        houseName:{
            type:String,
            required:true,
        },
        city:{
            type:String,
            required:true,
        },
        landMark:{
            type:String,
            required:true,
        },
        state : {
            type:String,
            required:true
        },
        pincode:{
            type:String,
            required:true
        },
        phone:{
            type:Number,
            required : true,
        },
        altPhone : {
            type:Number,
        }
   }]
},{timestamps: true });

const Address = mongoose.model('Address',addressSchema);

module.exports = Address;

