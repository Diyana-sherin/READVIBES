const User = require('../models/userSchema');
const Admin = require('../models/adminSchema');

const userAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        User.findById(req.session.user)
            .then(user => {
                if (user && !user.isBlocked) {
                    return next(); // Allow access
                } else {
                    req.session.destroy(err => {
                        if (err) console.error("Error destroying session:", err);
                        res.redirect('/login');
                    });
                }
            })
            .catch(error => {
                console.error("Error in userAuth middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect('/login');
    }
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        Admin.findById(req.session.admin)
            .then(data => {
                if (data) {
                    next();
                } else {
                    res.redirect('/admin/login');
                }
            })
            .catch(error => {
                console.log("Error in adminAuth middleware:", error);
                res.status(500).send("Internal Server Error");
            });
    } else {
        res.redirect('/admin/login');
    }
};

module.exports = {
    userAuth,
    adminAuth
};
