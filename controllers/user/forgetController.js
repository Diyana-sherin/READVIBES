const User = require('../../models/userSchema')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require('express-session')


function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,

            }
        })

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for reset",
            text: `Your OTP is ${otp}`,
            html: `<b>Yout Otp : ${otp}</b>`
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent : ', info.messageId)
        return true;
    } catch (error) {
        console.error("Error sending Email ", error)
        return false;

    }
}
const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}





const loadForgotPasswordPage = async (req, res) => {
    try {
        res.render('users/forgot')
    } catch (error) {
        console.log(error)
    }
}

const verfiyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email })
       
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render('users/forgotPass-otp');
                console.log("OTP", otp)
            }
            else {
                res.json({ success: false, message: "Failed to send Otp ,please typ again" })

            }
        }
        else {
            res.render('users/forgot', { message: "User with this email does not exits " })

        }
    } catch (error) {
        console.log(error)
    }
}

const verifyForgotPassOtp = async (req,res)=>{
    try {
        
        const otpInput = req.body.otp;
        if(otpInput === req.session.userOtp)
        {
            res.json({success:true,redirectUrl:'/reset-password'});

        }
        else{
            res.json({success:false,message:"OTP not matching"})
        }


    } catch (error) {
        res.status(500).json({success:false,message:"An error occured.Please try again"});
    }
}


const loadResetPage = async (req,res) => {
    try {
        res.render('users/reset-password')
    } catch (error) {
        console.log(error)
        
    }
}

const resendOtp = async (req,res)=>{
    try {
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Email",email)
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent)
        {
            console.log(("Reswnd OTP : ",otp));
            res.status(200).json({success:true,message:"Resent OTP successful"})
        }
    } catch (error) {
        console.error('Eroor in resent otp ',error)
        res.status(500).json({success:false,messege:"Internal server Error"})
        }
}

const resetPassword = async (req,res)=>{
    try {
        const {newPass1 ,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1 === newPass2)
        {
            const passwordHash = await securePassword(newPass1)
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.status(200).json({ success: true, message: 'Password changed successfully' });
        }
        else
        {
            res.render('users/reset-password',{message:"Passwords are not Match"})
        }
    } catch (error) {
        console.error("Error",error)
        res.status(500).json({ success: false, message: 'An internal error occurred' });
    }
}

module.exports = {
    loadForgotPasswordPage,
    verfiyEmail,
    verifyForgotPassOtp,
    loadResetPage,
    resendOtp,
    resetPassword,
}