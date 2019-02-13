import twilio, { Twilio } from 'twilio';
const { TWILIO_SID, TWILIO_AUTH_TOKEN } = process.env;

class TwilioClient {
	client: Twilio;
	constructor() {
		if (!TWILIO_SID || !TWILIO_AUTH_TOKEN) {
			console.error('Missing required Twilio env vars TWILIO_SID or TWILIO_AUTH_TOKEN');
			process.exit(1);
		}
		this.client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
	}
	async redirectCall(callID: string, url: string) {
		return this.client.calls(callID).update({ method: 'POST', url });
	}
	async sms(from: string, to: string, body: string) {
		const result = await this.client.messages.create({ from, to, body });
		console.log(result);
		return result;
	}
}

export default new TwilioClient();
