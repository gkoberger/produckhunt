const express = require('express');
const router = express.Router();

var accountSid = process.env.TWILIO_SID;
var authToken = process.env.TWILIO_AUTH;
var client = require('twilio')(accountSid, authToken);

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.get('/:code', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.post('/sms', (req, res, next) => {
  client.messages.create({
    body: "Produck Hunt URL: https://produckhunt.co/" + req.body.url,
    to: req.body.number,
    from: "+1 833 813 9274"
  }, function(err, message) {
    console.log(err, message);
    res.send({});
  });
});

module.exports = router;
