const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = "stonyverify";
const ACCESS_TOKEN = "YOUR_WHATSAPP_TOKEN"; // from Meta

// Store user sessions
let users = {};

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) return res.sendStatus(200);

  const from = message.from;
  const text = message.text?.body;

  if (!users[from]) users[from] = { step: 0 };

  let reply = "";

  // STEP FLOW
  if (users[from].step === 0) {
    reply = "Welcome to NestyDatagh☘💙\n\n1 - MTN Data\n2 - Telecel Data";
    users[from].step = 1;
  } 
  else if (users[from].step === 1) {
    if (text === "1") {
      reply = "MTN Bundles:\n1 - 1GB ₵6\n2 - 2GB ₵12\n3 - 5GB ₵27";
      users[from].step = 2;
    } else {
      reply = "Please reply 1 or 2";
    }
  } 
  else if (users[from].step === 2) {
    users[from].bundle = text;
    reply = "Enter phone number:";
    users[from].step = 3;
  } 
  else if (users[from].step === 3) {
    users[from].number = text;

    // Create Paystack payment link
    const paystack = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: "customer@email.com",
        amount: 600 * 100, // change based on bundle
      },
      {
        headers: {
          Authorization: "Bearer YOUR_PAYSTACK_SECRET",
        },
      }
    );

    const paymentLink = paystack.data.data.authorization_url;

    reply = `Click to pay:\n${paymentLink}`;
    users[from].step = 0;
  }

  await axios.post(
    `https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages`,
    {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply },
    },
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Server running"));