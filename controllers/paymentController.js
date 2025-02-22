const instance = require('../razorpayIns');
const crypto = require('crypto')
const Student = require('../models/studentModel.js')
const Mentor = require("../models/mentorModel");
const Connection  = require("../models/connectionModel.js");
const Payment  = require("../models/paymentModel.js");
const errorCatcherAsync = require("../utils/errorCatcherAsync");
const ErrorHandler = require("../utils/errorHandeler.js");
const sendMail = require("../utils/sendMail.js");

exports.checkout = errorCatcherAsync(async (req, res, next) => {
  const amount = req.body.amount * 100
  const duration = req.body.duration
  const options = {
    amount , 
    currency: "INR",
  };
  const order = await instance.orders.create(options)
  res.status(200).json({
      success:true,
      duration,
      order
    }) 
});
exports.createPlan = errorCatcherAsync(async (req, res, next) => {
    const user = await Student.findById(req.user._id)
    if(user.role === 'admin' || user.role === 'mentor')
        {
            return next(new ErrorHandler("Not allowed", 400));
             
        }
    const amount = req.body.amount * 100
    const options = {
      period: "monthly",
      interval: 1,
      item: {
        name: "Test plan - Weekly",
        amount,
        currency: "INR",
        description: "Description for the test plan"
      },
    };
    const order =  await instance.plans.create(options)
    
   const subscription =  await instance.subscriptions.create({
        plan_id: order.id,
        customer_notify: 1,
        total_count: 12,
      })

    user.subscription.id = subscription.id;
    user.subscription.status = subscription.status;

    await user.save();

    res.status(201).json({
        success:true,
        subscriptionId:subscription.id
    })
});

exports.paymentVerification = errorCatcherAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
    const { id, price , duration} = req.query
    
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAYKEY)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;
    if (isAuthentic) {
        // Database comes here
    
        // await Payment.create({
        //   razorpay_order_id,
        //   razorpay_payment_id,
        //   razorpay_signature,
        // });
        await Payment.create({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          });
        const user = await Student.findById(req.user._id)
        if(!user){
          return next(new ErrorHandler("No such user exists", 400));
        }
        const mentor = await Mentor.findById(id);
        if(!mentor){
          return next(new ErrorHandler("No such mentor exists", 400));
        }
        user.mentorAssigned = true;
        const connection = {
          studentDetails:req.user.id,
          mentorDetails:id,
          // expiresIn:duration === 'week' ? new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) : (duration === 'month'? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)): new Date(Date.now())),
          expiresIn:duration === 'month' ? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) : (duration === '3month'? new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) : (duration === '6month'? new Date(Date.now() + (180 * 24 * 60 * 60 * 1000)) : new Date(Date.now()))),
          isActive:true,
          isConnected:false,
          price:price
        }
        await Connection.create(connection);
        await user.save({ validateBeforeSave: false });

        const emailContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #3A5AFF;">Purchase Successful!</h2>
          <p>Dear ${user.name},</p>
          <p>
            Congratulations! You have successfully purchased the mentorship program offered by <strong>${mentor.name}</strong>. 
            The mentor specializes in academics thereby attainng <strong>${mentor.exam.rank}</strong>.
          </p>
          <p>
            Your mentor will reach out to you shortly with further details and to schedule your first session.
          </p>
          <p style="color: #555;">
            <strong>What Happens Next?</strong>
          </p>
          <ul style="color: #555; padding-left: 20px;">
            <li>Your mentor, ${mentor.name}, will contact you soon.</li>
            <li>You will receive a detailed plan and schedule for your mentorship sessions.</li>
            <li>If you have any questions, feel free to reach out to us at <a href="mailto:team@prepsaarthi.com" style="color: #ffc43b;">team@prepsaarthi.com</a>.</li>
          </ul>
          <p>
            We are excited for you to begin your journey under the guidance of <strong>${mentor.name}</strong>. 
            We wish you the best of luck and are confident this mentorship will be valuable for your growth.
          </p>
          <p>Best regards,<br><span style="color: #3A5AFF;">The PrepSaarthi Team</span></p>
        </div>
      `;
      const mentorEmailContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #3A5AFF;">New Mentorship Purchase!</h2>
          <p>Dear ${mentor.name},</p>
          <p>
            We are pleased to inform you that <strong>${user.name}</strong> has purchased your mentorship program.
          </p>
          <p>
            The student is eager to learn and grow under your guidance. Please connect with them as soon as possible to start planning and scheduling the sessions.
          </p>
          <p style="color: #555;">
            <strong>Student Details:</strong>
          </p>
          <ul style="color: #555; padding-left: 20px;">
            <li><strong>Name:</strong> ${user.name}</li>
            <li><strong>Duration:</strong> ${duration}</li>
          </ul>
          <p>
            We trust that you will provide excellent mentorship and help the student achieve their goals.
          </p>
          <p>Best regards,<br><span style="color: #3A5AFF;">The PrepSaarthi Team</span></p>
        </div>
      `;
              await sendMail({
                email: user.email,
                subject: `Successfull purchase for ${mentor.name}'s mentorship`,
                message: emailContent,
              });
              await sendMail({
                email: mentor.email,
                subject: `New Student Enrolled For Your Mentorship`,
                message: mentorEmailContent,
              });
        res.redirect(
          `http://${process.env.FRONTEND_URL}/payment/success?reference=${razorpay_payment_id}`
        );
      } else {
        res.status(400).json({
          success: false,
        });
      }


});
exports.paymentVerificationSub = errorCatcherAsync(async (req, res, next) => {
  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } =
    req.body;
    const { id, price } = req.query
    const user = await Student.findById(req.user._id)

    const subscriptionId = user.subscription.id;

  const body = subscriptionId + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAYKEY)
    .update(body.toString(),'utf-8')
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;
    if (isAuthentic) {
        // Database comes here
    
        await Payment.create({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_subscription_id,
        });
    
        if(!user){
          return next(new ErrorHandler("No such user exists", 400));
        }
        const mentor = await Mentor.findById(id);
        if(!mentor){
          return next(new ErrorHandler("No such mentor exists", 400));
        }
        user.mentorAssigned = true;
        user.subscription.status = 'active' 
        const connection = {
          studentDetails:req.user.id,
          mentorDetails:id,
          expiresIn:new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
          isActive:true,
          isConnected:false,
          price:price
        }
        await Connection.create(connection);
        await user.save({ validateBeforeSave: false });
    
        res.redirect(
`${process.env.REACT_APP_FRONTEND_URL}/payment/success?reference=${razorpay_payment_id}`
        );
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/paymentfailed`);
      }

});
 
exports.cancelSubscription = errorCatcherAsync(async (req, res, next) => {
  const user = await Student.findById(req.user._id)

  const subscriptionId = user.subscription.id;

  await instance.subscriptions.cancel(subscriptionId)

  user.subscription.id = undefined;
  user.subscription.status = undefined;
  
  await user.save()

});
 
exports.getKey = errorCatcherAsync(async (req, res, next) => {
  res.status(200).json({
    key:process.env.RAZORPAYID
  })
});
 
