import express, { Request } from "express";
import bodyParser from "body-parser";
import VoiceResponse = require("twilio/lib/twiml/VoiceResponse");

const app = express();
const PORT = 3000;

export type VoiceRequest = Request & { twiml: VoiceResponse; body: any };

app.use("/voice", bodyParser.urlencoded({ extended: true }), function(
  req: VoiceRequest,
  res,
  next
) {
  req.twiml = new VoiceResponse();
  res.setHeader("Content-Type", "text/xml");
  console.log(req.body);
  next();
});

app.post("/voice", function(req: VoiceRequest, res) {
  const { twiml } = req;
  const gather = twiml.gather({
    numDigits: 4,
    action: "/voice/collect",
    input: "dtmf speech",
    speechTimeout: "auto",
    timeout: 10,
    partialResultCallback: "speach"
  });
  gather.say("Enter code now");

  // If the user doesn't enter input, loop
  twiml.redirect("../voice");

  res.end(twiml.toString());
});

app.post("/voice/collect", function(req: VoiceRequest, res) {
  const { twiml, body } = req;
  const { SpeechResult, Digits } = body;
  if (!Digits) {
    twiml.sms(`You said: ${SpeechResult}`);
  } else {
    twiml.say(`Code is ${Digits}`);
    twiml.play({ digits: "ww9" });
  }

  twiml.hangup();
  res.end(twiml.toString());
});

// Starts our server
app.listen(PORT, function() {
  console.log("DingDong is listening on port #" + PORT);
});
