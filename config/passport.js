/*const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config() 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRECT,
    callbackURL: '/auth/google/callback',
},

async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        } 

        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
            return done(
                new Error('Email already in use, please use a different account'),
                null
            );
        }


            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value, 
                googleId: profile.id,
            });
            await user.save();
            console.log(user)
            req.session.user = user._id;
            return done(null, user);
        
    } catch (error) {
        return done(error, null); 
    }
}
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
    .then(user => {
        done(null, user);
    })
    .catch(err => {
        done(err, null);
    });
});

module.exports = passport;
*/

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
require('dotenv').config(); // Ensure environment variables are loaded

// Configure Passport Google Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret:process.env.GOOGLE_CLIENT_SECRECT, // Fixed typo
            callbackURL: '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if the user already exists with the Google ID
                let user = await User.findOne({ googleId: profile.id });
                if (user) {
                    return done(null, user); // Proceed with existing user
                }

                // Check if the email is already in use
                user = await User.findOne({ email: profile.emails[0].value });
                if (user) {
                    return done(
                        null,
                        false,
                        { message: 'Email already in use, please use a different account' }
                    );
                }

                // Create a new user
                user = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                });
                await user.save();
                return done(null, user); // Successfully signed up
            } catch (error) {
                console.error("Error in Google Strategy:", error);
                return done(error, null);
            }
        }
    )
);

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

module.exports = passport;
