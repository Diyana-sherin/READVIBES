const express = require("express")
const app = express();
const env = require("dotenv").config()
const mongoose = require('mongoose')
//const connectDB = require("./config/db");
//connectDB();


const connectDB = mongoose.connect(process.env.MONGO_URI);
connectDB.then(()=>{
    console.log("DB connected")
})
.catch((err)=>{
    console.log("DB not connected")
    console.log(err)
})


app.listen(process.env.PORT,()=>{
    console.log(`Server running on localhost:${process.env.PORT}`)
}
)


module.exports = app;