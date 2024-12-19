const express = require('express')
const router = express.Router()
const multer = require('multer')
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const productController = require('../controllers/admin/productController')
const categoryController = require('../controllers/admin/categoryController')
const orderController = require('../controllers/admin/orderController')
const couponController = require('../controllers/admin/couponController')
const offerController = require('../controllers/admin/offerController')
const {userAuth,adminAuth} = require('../middlewares/auth')



// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../images'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });






//login
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.loginAdmin)
router.get('/logout',adminController.logout)
router.get('/dashboard',adminAuth,adminController.loaddash)
router.post('/generate-sales-report', adminController.generateSalesReport);
router.post('/filter',adminController.salesChart)
router.get('/top-products',adminController.topTenProducts)
router.get('/top-categories',adminController.topTenCategories)


//users
router.get('/users',adminAuth,customerController.userInfo);
router.post('/user/updateStatus/:id',adminAuth, customerController.updateUserStatus);

//category 
router.get('/category',adminAuth,categoryController.categoryInfo)
router.get('/addCategory',adminAuth,categoryController.loadAddCategory)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.get('/editCategory/:id',adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth,categoryController.updateCategory);
router.post('/category/updateStatus/:id',adminAuth, categoryController.updateCategoryStatus);
router.delete('/deleteCat/:id', categoryController.deleteCategory);


//books
router.get('/addBooks',adminAuth,productController.getAddBooksPage)
router.post('/addBooks',upload.array("images",3),productController.addBooks)
router.get('/books',adminAuth,productController.getAllBooks)
router.get('/editBook/:id', adminAuth,productController.getEditBookPage); 
router.post('/editBook/:id', upload.array('images', 3), productController.editBook); 
router.post('/book/updateStockStatus/:id',adminAuth,productController.updateStatus)
router.post('/book/updateStatus/:id',adminAuth, productController.updateBookStatus);
router.delete('/deleteBook/:id', productController.deleteBook);


//orders
router.get('/orders',adminAuth,orderController.loadOrderPage)
router.post('/order/updateStatus/:orderId',orderController.chengeStatus)
router.get('/order/details/:id', adminAuth, orderController.ViewOrderDetails);



//coupons
router.get('/coupons',adminAuth,couponController.couponInfo)
router.get('/addCoupons',adminAuth,couponController.loadAddCoupons)
router.post('/addCoupons',adminAuth,couponController.addCoupons)
router.get('/editCoupon/:id',adminAuth,couponController.loadEditCoupon)
router.post ('/editCoupon/:id',adminAuth,couponController.editCoupon)
router.delete('/deleteCoupon/:id',couponController.deleteCoupon)

//offers
router.get('/offers',adminAuth,offerController.offerInfo)
router.get('/addOffers',adminAuth,offerController.loadAddOffers)
router.post('/addOffers',adminAuth,offerController.addOffers)
router.get('/editOffer/:id',adminAuth,offerController.loadEditOffer)
router.post('/editOffer/:id',adminAuth,offerController.editOffer)
router.delete('/deleteOffer/:id', offerController.deleteOffer);
router.post('/updateStatus/:id',offerController.updateStatus)




module.exports = router;