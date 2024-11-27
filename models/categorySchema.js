const mongoose = require("mongoose");
const {Schema} = mongoose;

const categorySchema = new Schema({
    name: {
        type:String,
        required:true,
        uppercase: true,
        unique:true
    },
    description : {
        type : String,
        required : true,
    },
    status: {
        type: String,
        enum: ['listed', 'unlisted'],
        default: 'listed'
      },
    isListed: {
        type:Boolean,
        default:true
    },
    createdAt: {
        type: Date,
        default:Date.now
    }

},{timestamps:true});

const Category = mongoose.model("Category",categorySchema);

module.exports = Category;