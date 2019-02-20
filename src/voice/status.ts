import express, { Request } from 'express';
import { dbMiddleware, DB } from '../db';
import { twimlMiddlewareFactory } from './middleware';

export type StatusRequest = Request & {
    db: DB;
    body: {
        [k: string]: string;
    };
};

// Route to handle status callback from Twilio and add `callEnd` field once call is completed
export default function() {
    const app = express();
    app.use(twimlMiddlewareFactory('/status/'), dbMiddleware);
    app.post('/', async function(req: StatusRequest, res) {
        const { body, db } = req;
        console.log(JSON.stringify(body));
        const { CallSid, CallStatus, Timestamp } = body;
        if (CallStatus === 'completed') {
            try {
                await db.Buzzes.update(
                    { nodeID: CallSid },
                    { callEnd: new Date(Timestamp) }
                );
            } catch (e) {
                console.error(e);
            }
        }
        res.end();
    });

    return app;
}
