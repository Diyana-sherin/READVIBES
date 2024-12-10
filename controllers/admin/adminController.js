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
        console.log(totalRevenueOb)
        let totalRevenue = 0;

        if (totalRevenueOb.length) {
            totalRevenue = totalRevenueOb ? totalRevenueOb[0].totalRevenue : 0;
        }

        /*  async function getBestSellingProducts() {
              const topProducts = await Order.aggregate([
                  // Unwind orderedItems array
                  { $unwind: "$orderedItems" },
                  // Group by book ID and calculate total quantity sold
                  {
                      $group: {
                          _id: "$orderedItems.book",
                          totalSold: { $sum: "$orderedItems.quantity" }
                      }
                  },
                  // Sort by totalSold in descending order
                  { $sort: { totalSold: -1 } },
                  // Limit to top 10 products
                  { $limit: 10 },
                  // Lookup to populate book details (optional)
                  {
                      $lookup: {
                          from: "books",
                          localField: "_id",
                          foreignField: "_id",
                          as: "bookDetails"
                      }
                  },
                
                  {
                      $project: {
                          _id: 0,
                          bookId: "$_id",
                          totalSold: 1,
                          bookDetails: { $arrayElemAt: ["$bookDetails", 0] } 
                      }
                  }
              ]);
              console.log(topProducts);
          }
          getBestSellingProducts();
  
          async function getBestSellingCategories() {
              const topCategories = await Order.aggregate([
                  // Unwind orderedItems array
                  { $unwind: "$orderedItems" },
                  // Lookup to join with Books collection
                  {
                      $lookup: {
                          from: "books", // Replace with the actual collection name for Books
                          localField: "orderedItems.book",
                          foreignField: "_id",
                          as: "bookDetails"
                      }
                  },
                  // Unwind bookDetails array
                  { $unwind: "$bookDetails" },
                  // Group by category and calculate total quantity sold
                  {
                      $group: {
                          _id: "$bookDetails.category", // Replace 'category' with the field name in Books schema
                          totalSold: { $sum: "$orderedItems.quantity" }
                      }
                  },
                  // Sort by totalSold in descending order
                  { $sort: { totalSold: -1 } },
                  // Limit to top 10 categories
                  { $limit: 10 },
                  // Project the required fields
                  {
                      $project: {
                          _id: 0,
                          category: "$_id",
                          totalSold: 1
                      }
                  }
              ]);
              console.log(topCategories);
          }
          getBestSellingCategories();*/


        res.render('admin/dashboard', { totalUsers, totalOrders, totalRevenue })
    } catch (error) {
        console.log("Admin login not found", error)
        res.status(500).send("Server Error")
    }
}

const topTenProducts = async (req, res) => {
    try {
        const topProducts = await Order.aggregate([
            { $unwind: "$orderedItems" },
            { $group: { _id: "$orderedItems.bookName", totalSold: { $sum: "$orderedItems.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ])
        console.log(topProducts)

        res.json(topProducts);
    } catch (error) {
        res.status(500).json({ message: "Error fetching data", error });
    }
}



const topTenCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "books",
                    localField: "orderedItems.book",
                    foreignField: "_id",
                    as: "bookDetails"
                }
            },
            { $unwind: "$bookDetails" },
            { $group: { _id: "$bookDetails.category", totalSold: { $sum: "$orderedItems.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        res.json(topCategories);
    } catch (error) {
        res.status(500).json({ message: "Error fetching data", error });
    }
}


const topCategories = async (req, res) => {
    try {
        const topCategories = await Order.aggregate([
            { $unwind: "$orderedItems" },
            {
                $lookup: {
                    from: "books",
                    localField: "orderedItems.book",
                    foreignField: "_id",
                    as: "bookDetails"
                }
            },
            { $unwind: "$bookDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "bookDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails.name",
                    totalSold: { $sum: "$orderedItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        console.log(topCategories);
        res.json(topCategories);
    } catch (error) {
        res.status(500).json({ message: "Error fetching data", error });
    }
};






const generateSalesReport = async (req, res) => {
    try {
        const { reportType, customStartDate, customEndDate } = req.body;
        let startDate, endDate;
        console.log(req.body);



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

            case 'yearly':
                startDate = moment(today).startOf('year');
                endDate = moment(today).endOf('day');
                break;

            case 'custom':
                // Validate custom dates
                if (!customStartDate || !customEndDate) {
                    return res.status(400).json({ error: 'Custom dates are required' });
                }
                startDate = moment(customStartDate).startOf('day');
                endDate = moment(customEndDate).endOf('day');

                if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
                    return res.status(400).json({ error: 'Invalid custom date range' });
                }
                break;

            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        //  data from the database
        const orders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
                },
            },
            {
                $unwind: '$orderedItems',
            },
            {
                $match: {
                    'orderedItems.status': { $in: ['Shipped', 'Delivered'] }, // Filter by status
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    },
                    totalRevenue: { $sum: "$orderedItems.finalAmount" },
                    totalDiscount: { $sum: "$orderedItems.offerDiscount" },
                    couponDiscount: { $sum: "$orderedItems.couponDiscount" },
                    salesCount: { $sum: "$orderedItems.quantity" }
                    //salesCount: { $sum: 1 },
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

        //console.log(totals);





        res.json({ success: true, report: orders, totals });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};



const salesChart = async (req, res) => {
    const { filter } = req.body;

    try {
        const revenueData = await calculateRevenue(filter);
        res.json(revenueData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

//  function to Calculate Revenue
async function calculateRevenue(filter) {
    const dateFilter = getDateRange(filter);

    const revenueData = await Order.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: dateFilter.startDate,
                    $lte: dateFilter.endDate,
                },
               
            },
        },
        {
            $unwind: "$orderedItems",
        },
        {
            $match: {
                "orderedItems.status": { $in: ["Shipped", "Delivered"] },
            },
        },
        {
            $group: {
                _id: getGroupingKey(filter),
                totalRevenue: { $sum: "$orderedItems.finalAmount" },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);

    

    revenueData.map((item) => ({
        label: item._id.toString(),
        value: item.totalRevenue,
    }));
    console.log(revenueData)

    return revenueData.map((item) => ({
        label: item._id.toString(),
        
        value: item.totalRevenue,
    }));
}

// functions for date range
function getDateRange(filter) {
    const now = new Date();
    let startDate, endDate;

    if (filter === "weekly") {
        const startOfWeek = now.getDate() - now.getDay();
        startDate = new Date(now.setDate(startOfWeek));
        endDate = new Date(now.setDate(startOfWeek + 6));
    } else if (filter === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (filter === "yearly") {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    }

    return { startDate, endDate };
}

function getGroupingKey(filter) {
    return filter === "weekly"
        ? { $isoWeek: "$createdAt" }
        : filter === "monthly"
            ? { $month: "$createdAt" }
            : { $year: "$createdAt" };
}




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





module.exports = { loadLogin, loaddash, loginAdmin, logout, generateSalesReport, salesChart, topTenProducts, topTenCategories, topCategories }