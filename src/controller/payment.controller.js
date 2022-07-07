const amqp = require('amqplib');

const paypal = require('../config/paypal.config');
const logger = require('../config/winston.config');

const queueName = 'ORDER_QUEUE';
let orders;
let channel;

const orderConsumer = async ()=>{
  const connection = await amqp.connect(process.env.AMQPLIB_URI);
  channel = await connection.createChannel();
  await channel.assertQueue(queueName, {durable: true});
}
orderConsumer();


module.exports.initiatePayment = (req, res)=>{
  try {
    let message;
    channel.consume(queueName, (msg)=>{
      message = msg.content.tostring();
    }, {noAck: true});

    const create_payment_json = {
      "intent": "sale",
      "payer": {
          "payment_method": "paypal"
      },
      "redirect_urls": {
          "return_url": "https://eucossa-payment-service.herokuapp.com/api/eucossa/payment/success",
          "cancel_url": "https://eucossa-payment-service.herokuapp.com/api/eucossa/payment/cancel"
      },
      "transactions": [{
          "item_list": {
              "items": message || [{
                "name": "item",
                "sku": "item",
                "price": "1.00",
                "currency": "USD",
                "quantity": 1
            }]
          },
          "amount": {
              "currency": "USD",
              "total": "1.00"
          },
          "description": "This is the payment description."
      }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        res.status(500).json({message: `Error occured while initiating payment: ${error.message}`})
        console.log(`Error @ the initiate payment handler: ${error.message}`);
        throw error;
      } else {
          payment.links.forEach((link)=>{
            if(link.rel === 'approval_url'){
              res.status(200).json({message: "Payment process initiated", redirect_url: link.href});
            }
          });
          console.log(payment);
      }
  });
  logger.info(`Consumed from the: ${queueName}`);
} catch (e) {
  console.log(`Error @ the initiate payment handler: ${e.message}`);
  }
}

module.exports.paymentSuccess = async(req, res) =>{
  try {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const connection = await amqp.connect(process.env.AMQPLIB_URI);
    const channel = await connection.createChannel();
    await channel.assertQueue('PAYMENT_QUEUE', {durable: true});

    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
        "amount": {
          "currency": "USD",
          "total": "1.00"
        }
      }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, async function(error, payment){
      if(error){
        res.status(500).json({message: `Error execting payment: ${error.message}`});
        console.log(`Error @ the success route handler: ${error.message}`);
        throw error;
      }else {
        channel.sendToQueue('PAYMENT_QUEUE', Buffer.from(JSON.stringify(payment)), {persistent: true});
        channel.close();
      }
    })
  } catch (e) {
    console.log(`Error on the success handler: ${e.message}`);
  }
}

module.exports.paymentCancel = (req, res)=>{
  res.status(200).json({message: `Transaction cancelled`});
}
