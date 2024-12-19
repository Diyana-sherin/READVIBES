const express = require('express')
const router = express.Router()
const userController =  require('../controllers/user/userControllers')
const profileController = require('../controllers/user/profileController')
const passport = require('passport')
const {userAuth,adminAuth} = require('../middlewares/auth')
const cartController = require('../controllers/user/cartController')
const wishlistController = require('../controllers/user/wishlistController')
const checkoutController = require('../controllers/user/checkoutController')
const forgetController = require('../controllers/user/forgetController')
const walletController = require('../controllers/user/walletController')



//login
router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/signup',userController.loadsignup)
router.post('/signup',userController.signup)
router.post('/verifyOtp',userController.verifyOtp)
router.post('/resendOtp',userController.resendOtp)
router.get('/',userController.loadhomelog)
router.get('/logout',userController.logout)



//sigle signup
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.user = req.user._id;
    console.log(req.user)
    res.redirect('/');
});
// Handle signup error for duplicate emails
router.get('/signup', (req, res) => {
    const error = req.query.error;
    res.render('users/signup', { error: error || null }); // Pass error to the signup page
});



//forget password
router.get('/forgetPassword',forgetController.loadForgotPasswordPage)
router.post('/verify-email',forgetController.verfiyEmail)
router.post('/verify-passForgot-otp',forgetController.verifyForgotPassOtp)
router.get('/reset-password',forgetController.loadResetPage)
router.post('/resend-forgot-otp',forgetController.resendOtp)
router.post('/reset-password',forgetController.resetPassword)



//view more
router.get('/viewmore',userController.loadviewMore)
//details
router.get('/bookDetails/:id', userController.bookDetails);

//cart
router.post('/addToCart/:bookId',cartController.addToCart)
router.get('/cart',userAuth,cartController.loadCart)
router.post('/cart/increase-quantity/:id', cartController.increaseQuantity);
router.post('/cart/decrease-quantity/:id', cartController.decreaseQuantity);
router.delete('/cart/delete-item/:id',cartController.deleteItems)

//wishlist 
router.post('/addWishlist/:bookId',wishlistController.addToWishlist)
router.get('/wishlist',userAuth,wishlistController.loadWishlist)
router.delete('/wishlist/delete-item/:id',wishlistController.deleteItems)



//checkout
router.get('/checkout',userAuth,checkoutController.loadCheckout)
router.get('/checkout/:id',userAuth,checkoutController.loadCheckout)
router.post('/addAddress',userAuth,checkoutController.addAddress)
router.post('/addAddress/:id',userAuth,checkoutController.addAddress)
router.delete('/address/delete/:id',userAuth,checkoutController.deleteAddress)
router.post('/place-order',userAuth,checkoutController.placeOrder)
router.get('/orderSuccess/:id',userAuth,checkoutController.orderSuccessPage)
router.post('/validate-cash-on-delivery',userAuth,checkoutController.validateCOD)
router.post('/validate-wallet',userAuth,walletController.validateWallet)
router.post('/verify-payment',checkoutController.verifyPayment)



//userProfile
router.get('/profile',userAuth,profileController.loadUserDetails)
router.get('/editProfile',userAuth,profileController.loadEditProfile)
router.post('/editProfile',profileController.updateProfile)
router.post('/changePassword',profileController.changePassword)
router.get('/editaddress/:addressId',profileController.getEditAddressPage)
router.post('/editaddress/:addressId', profileController.editAddress);
router.get('/profile/addAddress',userAuth,profileController.getAddAddressPage)
router.post('/profile/addAddress',profileController.addAddress)
router.post('/applyCoupon',checkoutController.applyCoupon)
router.post('/removeCoupon', checkoutController.removeCoupon);
router.get('/availableCoupons',userAuth,profileController.listAvailableCoupons)



//userorders
router.get('/myorders',userAuth,profileController.myOrders)
router.get('/cancel-orders/:id',userAuth,profileController.getOrderCancelPage)
router.post('/user/cancel-order',userAuth,profileController.cancelOrder)
router.get('/return-orders/:id',userAuth,profileController.getOrderReturnPage)
router.post('/user/return-order',userAuth,profileController.returnOrder)



//wallet 
router.get('/wallet',userAuth,walletController.loadWalletPage)
router.get('/viewAllTransactions',userAuth,walletController.viewAllTransactions)
router.post('/wallet-topup',walletController.walletTopup)
router.post('/verify-WalletPayment',walletController.verifyPayment)
router.get('/filter-orders',profileController.filterOrders)
router.post('/download-invoice',checkoutController.download)
router.post('/retryPayment',checkoutController.retryPayment)




module.exports = router;