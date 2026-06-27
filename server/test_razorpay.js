require('dotenv').config();
const Razorpay = require('razorpay');

console.log('KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Exists' : 'Missing');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const options = {
  amount: 4900,
  currency: 'INR',
  receipt: 'receipt_test_123',
};

razorpay.orders.create(options)
  .then(order => {
    console.log('Order Created Successfully:', order);
  })
  .catch(error => {
    console.error('Razorpay Error:', error);
  });
