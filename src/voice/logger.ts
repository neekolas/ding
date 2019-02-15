import { Buzz } from '../models';
export interface BuzzLogger {
	log(...args): void;
	error(...args): void;
}
export function buzzLogger(buzz: Buzz) {
	const params = {
		callSid: buzz.nodeID,
		buzzID: buzz.id,
		suiteID: buzz.suite.id
	};
	return {
		log(...args) {
			console.log(JSON.stringify({ ...params, message: args.map(arg => JSON.stringify(arg)).join(' ') }));
		},
		error(...args) {
			console.error(JSON.stringify({ ...params, message: args.map(arg => JSON.stringify(arg)).join(' ') }));
		}
	};
}
