const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ENV VARIABLES
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_ID = process.env.PHONE_ID;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

// Store user sessions
let users = {};

// ✅ Webhook verification
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// ✅ Receive messages
app.post("/webhook", async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) return res.sendStatus(200);

  const from = message.from;
  const text = message.text?.body?.trim();

  if (!users[from]) users[from] = { step: 0 };

  let reply = "";

  // STEP 0 - Welcome
  if (users[from].step === 0) {
    reply = `Welcome to Nestydatagh💙

1 - MTN Data
2 - Telecel Data`;
    users[from].step = 1;
  }

  // STEP 1 - Choose network
  else if (users[from].step === 1) {
    if (text === "1") {
      reply = `MTN Bundles:

1 - 1GB ₵6
2 - 2GB ₵12
3 - 5GB ₵27`;
      users[from].step = 2;
      users[from].network = "MTN";
    } else if (text === "2") {
      reply = `Telecel Bundles:

1 - 5GB ₵25
2 - 10GB ₵38`;
      users[from].step = 2;
      users[from].network = "TELECEL";
    } else {
      reply = "Please reply with 1 or 2";
    }
  }

  // STEP 2 - Choose bundle
  else if (users[from].step === 2) {
    users[from].bundle = text;
    reply = "Enter phone number:";
    users[from].step = 3;
  }

  // STEP 3 - Enter number & generate payment
  else if (users[from].step === 3) {
    users[from].number = text;

    let amount = 600; // default ₵6

    if (users[from].bundle === "2") amount = 1200;
    if (users[from].bundle === "3") amount = 2700;

    try {
      const paystack = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: "customer@email.com",
          amount: amount,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
          },
        }
      );

      const paymentLink = paystack.data.data.authorization_url;

      reply = `Click to pay:\n${paymentLink}

After payment, your data will be delivered instantly ✅`;

      users[from].step = 0;

    } catch (error) {
      reply = "Error generating payment link. Try again.";
      console.log(error.response?.data || error.message);
    }
  }

  // ✅ Send reply back to WhatsApp
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
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

// Start server
app.listen(3000, () => console.log("Bot is running on port 3000"));
