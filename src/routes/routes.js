const express = require('express');

const router = express.Router();
const { initiatePayment, paymentSuccess, paymentCancel } = require('../controller/payment.controller');

router.post('/paypal', initiatePayment);
router.get('/success', paymentSuccess);
router.get('/cancel', paymentCancel);

module.exports = router;
