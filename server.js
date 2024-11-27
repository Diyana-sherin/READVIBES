const express = require("express")
const app = express();
const env = require("dotenv").config()
const mongoose = require('mongoose')
const path = require('path');
const hbs =require('hbs')
const methodOverride = require('method-override');
const session = require('express-session')
const passport = require('./config/passport')
const userRoutes = require('./routes/userRouter')
const adminRoutes = require('./routes/adminRouter')
//const connectDB = require("./config/db");
//connectDB();


//database connection
const connectDB = mongoose.connect(process.env.MONGO_URI);
connectDB.then(()=>{
    console.log("DB connected")
})
.catch((err)=>{
    console.log("DB not connected")
    console.log(err)
})

app.use(express.json());
app.use(express.urlencoded({extended:true}));
//session middleware
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(methodOverride('_method'));



//view engine setup
app.set('view engine','hbs')
app.set('views',path.join(__dirname,'views'))
//partials
hbs.registerPartials(path.join(__dirname,'views/partials'))

//operations 
hbs.registerHelper('not', function(value) {
    return !value;
});
hbs.registerHelper('eq', function(a, b) {
    return a === b;
  });
  hbs.registerHelper('or', function (a, b) {
    return a || b;
});
hbs.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });
  hbs.registerHelper('range', function(start, end) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});
hbs.registerHelper('includes', (array, value) => {
    return array.includes(value);
});

hbs.registerHelper('and', function () {
    const args = Array.from(arguments).slice(0, -1); // Remove the "options" object
    return args.every(Boolean); // Return true if all arguments are truthy
  });
  

hbs.registerHelper('add', (a, b) => a + b);
hbs.registerHelper('multiply', (a, b) => a * b);
hbs.registerHelper('subtract', (a, b) => a - b);
hbs.registerHelper('gt', (a, b) => a > b);
hbs.registerHelper('lt', (a, b) => a < b);

hbs.registerHelper('includes', function (array, value) {
    return Array.isArray(array) && array.includes(value);
});



app.use('/',userRoutes)
app.use('/admin',adminRoutes)




//localhost setup
app.listen(process.env.PORT,()=>{
    console.log(`Server running on localhost:${process.env.PORT}`)
}
)


module.exports = app;