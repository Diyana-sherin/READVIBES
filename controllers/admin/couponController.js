const Coupon = require('../../models/couponSchema')



//coupons
const couponInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;



        const couponData = await Coupon.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });


      const totalCoupons = await Coupon.countDocuments();

      const totalPages = Math.ceil(totalCoupons / limit);

      const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < totalPages ? page + 1 : null;

    const coupons = couponData.map(item => ({
        ...item.toObject(),
        createdAt: item.createdAt.toISOString().split("T")[0]
      }));

        res.render('admin/coupon',{
            coupons,
            currentPage: page,
            totalPages: Array.from({ length: totalPages }, (_, i) => i + 1),
            prevPage,
            nextPage,
          });
    } catch (error) {

        console.error('Error fetching coupons:', error);
    res.status(500).send('Error loading coupons');
    }
}



//addCoupons
const loadAddCoupons = async (req, res) => {
    try {
        res.render('admin/addCoupons');
    } catch {
        console.log("Add page not found");
        res.status(500).send("Server Error")
    }
}

const addCoupons = async (req, res) => {
    try {
        const { couponCode, discount, minimumPurchase, usagePerUser, maxTotalUsers } = req.body;

        const exits = await Coupon.findOne({ couponCode })
        if (exits) {
            return res.render('admin/addCoupons', { message: "Cuopon already exists" });
        }


        const newCoupon = new Coupon({
            couponCode,
            discount,
            minimumPurchase,
            usagePerUser,
            maxTotalUsers
        });

        await newCoupon.save();
        res.redirect('/admin/coupons')

    } catch (error) {

        console.error("Error",error)
    }
}


//edit 
const loadEditCoupon = async(req,res)=>{

    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);


        if (!coupon) {
            return res.status(404).render('admin/editCoupon', { message: 'Coupon not found' });
        }


        res.render('admin/editCoupon', { coupon });
    } catch (error) {


        console.error(error);
        res.status(500).render('admin/editCoupon', { message: 'Error loading coupon' });
    }
}

const editCoupon = async (req,res)=>{

    try {
        const { couponCode, discount, minimumPurchase, usagePerUser, maxTotalUsers } = req.body;
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).render('admin/editCoupon', { message: 'Coupon not found' });
        }

        coupon.couponCode = couponCode;
        coupon.discount = discount;
        coupon.minimumPurchase = minimumPurchase;
        coupon.usagePerUser = usagePerUser;
        coupon.maxTotalUsers = maxTotalUsers;

        await coupon.save();

        res.redirect('/admin/coupons');  
    } catch (error) {
        console.error(error);
        res.status(500).render('admin/editCoupon', { message: 'Failed to update coupon' });
    }

}


//delete 
const deleteCoupon = async (req,res)=>{
    try {
        const cuoponId = req.params.id;
        const deletedCoupon = await Coupon.findByIdAndDelete(cuoponId);

        if (deletedCoupon) {
            res.status(200).json({ success: true, message: "Cuopon deleted successfully." });
        } else {
            res.status(404).json({ success: false, message: "Coupon not found." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
}


module.exports = { couponInfo, loadAddCoupons,addCoupons ,loadEditCoupon,editCoupon,deleteCoupon}