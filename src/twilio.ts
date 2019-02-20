import twilio, { Twilio } from 'twilio';
const {
    TWILIO_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_DEFAULT_NUMBER = '+17602923464'
} = process.env;

class TwilioClient {
    client: Twilio;
    constructor() {
        if (!TWILIO_SID || !TWILIO_AUTH_TOKEN) {
            console.error(
                'Missing required Twilio env vars TWILIO_SID or TWILIO_AUTH_TOKEN'
            );
            process.exit(1);
        }
        this.client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
    }
    async dial(url: string, to: string) {
        return this.client.calls.create({
            url,
            from: TWILIO_DEFAULT_NUMBER,
            to
        });
    }
    async lookupNumber(
        phoneNumber: string
    ): Promise<{ firstName: string; lastName: string }> {
        let firstName = '',
            lastName = '';
        const result = await this.client.lookups
            .phoneNumbers(phoneNumber)
            .fetch({ countryCode: 'US' });
        const { callerName } = result;
        if (callerName) {
            [firstName, lastName] = callerName.split(' ', 2);
        }
        return { firstName, lastName };
    }
    async redirectCall(callID: string, url: string) {
        return this.client.calls(callID).update({ method: 'POST', url });
    }
    async sms(to: string, body: string) {
        const result = await this.client.messages.create({
            from: TWILIO_DEFAULT_NUMBER,
            to,
            body
        });
        console.log(result);
        return result;
    }
}

export default new TwilioClient();
