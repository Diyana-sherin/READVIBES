const Admin = require('../../models/adminSchema')
const Order = require('../../models/orderSchema')
const User = require("../../models/userSchema");
const moment = require('moment');

const bcrypt = require('bcrypt')


//loadlogin
const loadLogin = async (req, res) => {
    try {
        res.render('admin/login')
    } catch (error) {
        console.log("Admin login not found", error)
        res.status(500).send("Server Error")
    }
}
//login

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email })
        console.log(admin)
        if (!admin) {
            return res.render("admin/login", { message: "Admin not found" });
        }
        const ispasswordMatch = password === admin.password;
        if (!ispasswordMatch) {
            console.log('ok')
            return res.render("admin/login", { message: "Password is incorrect" })
        } else {
            req.session.admin = admin._id;
            console.log(req.session.admin)
            res.redirect('/admin/dashboard')
        }
    }
    catch (error) {
        console.error("Login error:", error);
        res.render("admin/login", { message: "Something went wrong" });
    }
}

const loaddash = async (req, res) => {
    try {

        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalRevenueOb = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$finalAmount" },
                },
            },
        ]);
        const totalRevenue = totalRevenueOb ? totalRevenueOb[0].totalRevenue : 0 ;

       

        res.render('admin/dashboard', { totalUsers, totalOrders, totalRevenue })
    } catch (error) {
        console.log("Admin login not found", error)
        res.status(500).send("Server Error")
    }
}




       
const generateSalesReport = async (req, res) => {
    try {
        const { reportType } = req.body; 
        let startDate, endDate;

        
        const today = moment().startOf('day'); 

        switch (reportType) {
            case 'daily':
               
                startDate = today;
                endDate = moment(today).endOf('day'); 
                break;

            case 'weekly':
               
                startDate = moment(today).startOf('isoWeek'); 
                endDate = moment(today).endOf('day'); 
                break;

            case 'monthly':
               
                startDate = moment(today).startOf('month');
                endDate = moment(today).endOf('day');
                break;

            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        // Fetch data from the database
        const orders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
                    
                    // status: { $in: ['Delivered', 'Returned'] },
                },
            },
            {
                $unwind: '$orderedItems',
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    },
                    totalRevenue: { $sum: "$finalAmount" },
                    totalDiscount: { $sum: "$orderedItems.offerDiscount" },
                    couponDiscount: { $sum: "$couponDiscount" },
                    salesCount: { $sum: 1 },
                },
            },
            { $sort: { '_id.date': 1 } },
        ]);

        //  totals
        const totals = orders.reduce(
            (acc, order) => {
                acc.totalRevenue += order.totalRevenue;
                acc.totalDiscount += order.totalDiscount;
                acc.couponDiscount += order.couponDiscount;
                acc.salesCount += order.salesCount;
                return acc;
            },
            {
                totalRevenue: 0,
                totalDiscount: 0,
                couponDiscount: 0,
                salesCount: 0,
            }
        );

        console.log(totals);

        res.json({ success: true, report: orders, totals });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};





const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Error destroying eror", err)
            }
            res.redirect('/admin/login')
        })
    }
    catch (error) {
        console.log('Error in logout', err)
    }
}





module.exports = { loadLogin, loaddash, loginAdmin, logout, generateSalesReport}