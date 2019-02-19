import { hashSync, compareSync } from 'bcrypt';
import * as functions from 'firebase-functions';
const SALT_ROUNDS = 5;

function formatNumberLength(num, length) {
    var r = '' + num;
    while (r.length < length) {
        r = '0' + r;
    }
    return r;
}

export const generateActivationCode = () => {
    return formatNumberLength(Math.floor(Math.random() * 100000), 5);
};

export function generateHashedActivationCode(): { hash: string; code: string } {
    const code = generateActivationCode();
    const hash = hashSync(code, SALT_ROUNDS);
    return { hash, code };
}

export function compareActivationCode(a: string, b: string): boolean {
    return compareSync(a, b);
}

// Sets some environment variables based on Twilio function runtime config.
export function setupEnv() {
    let cfg: { [k: string]: any } = functions.config();
    var { maps, db, twilio } = cfg;
    if (maps) {
        process.env.MAPS_API_KEY = maps.api_key;
    }
    if (db) {
        Object.keys(db).forEach(k => {
            process.env[`TYPEORM_${k.toUpperCase()}`] = db[k];
        });
    }
    if (twilio) {
        Object.keys(twilio).forEach(k => {
            process.env[`TWILIO_${k.toUpperCase()}`] = twilio[k];
        });
    }
}
