const express = require("express");
const router = express.Router();
const braintree = require("braintree");

const gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: "r4nzm2yt968339mg",
  publicKey: "2r9fyk37hn9s3sfb",
  privateKey: "c99a366b3aa9f7d0d55148b555c2c451",
});

router.get("/", function (req, res) {
  gateway.clientToken.generate({}, function (err, response) {
    const token = response.clientToken;

    const plans = gateway.plan.all(function (err, result) {
      res.render("index", { token: token, plans: result.plans });
      //res.status(201).send({ token: token, plans: result.plans }); //rest api response for checking data structure
    });
  });
});

router.get("/update-card-details/:id", function (req, res) {
  const paymentToken = req.params.id;
  gateway.clientToken.generate({}, function (err, response) {
    const token = response.clientToken;
    gateway.paymentMethod.find(paymentToken, function (err, paymentMethod) {
      let card = {
        cardToken: paymentToken,
        first: paymentMethod.bin || "4111",
        last: paymentMethod.last4 || "1111",
        expDate: {
          month: paymentMethod.expirationMonth || "11",
          year: paymentMethod.expirationYear || "20",
        },
      };

      res.render("updateCardDetails", { token: token, card: card });
      //res.status(201).send({ payment: paymentMethod });
    });
  });
});

router.post("/update-card-details", function (req, res) {
  const nonce = req.body.payment_method_nonce;
  const cardToken = req.body.card_token;
  gateway.paymentMethod.update(
    cardToken,
    {
      paymentMethodNonce: nonce,
    },
    function (err, result) {
      res.render("process", { result: result, event: "Credit Card Update" });
    }
  );
  console.log({ req: req });
});

router.post("/process", function (req, res) {
  const nonce = req.body.payment_method_nonce;
  const plan = req.body.plan;

  gateway.customer.create(
    {
      paymentMethodNonce: nonce,
    },
    function (err, result) {
      if (result.success) {
        var token = result.customer.paymentMethods[0].token;

        gateway.subscription.create(
          {
            paymentMethodToken: token,
            planId: plan,
          },
          function (err, result) {
            res.render("process", { result: result, event: "Subscription" });
          }
        );
      }
    }
  );
});

router.get("/customers", function (req, res) {
  gateway.clientToken.generate({}, function (err, response) {
    const token = response.clientToken;
    let users = [];
    let cust = new Object();
    const customerStream = gateway.customer.search(function (search) {
      search.company().is("");
    });

    customerStream.on("data", function (customer) {
      users.push(JSON.parse(JSON.stringify(customer)));
    });

    customerStream.on("end", function () {
      res.render("listings", { users: users });
      //res.status(201).send({ users: users }); //rest api response for checking data structure
    });

    customerStream.resume();
  });
});

router.get("/cancel-subscription/:id", function (req, res) {
  const id = req.params.id;

  gateway.subscription.cancel(id, function (err, result) {
    res.redirect(301, "/customers");
  });
});

module.exports = router;
