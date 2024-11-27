const mongoose = require("mongoose");
const env = require("dotenv").config()

const connectDB = async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
            }
    catch(error){
        console.log("DB connection error")
        process.exit(1);
    }

   
}
module.exports = connectDB;