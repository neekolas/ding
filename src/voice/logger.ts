import { Buzz } from '../models';
export interface BuzzLogger {
	log(...args): void;
	error(...args): void;
}

const stringify = something => {
	switch (typeof something) {
		case 'string':
			return something;
		case 'number':
			return something.toString();
		default:
			return JSON.stringify(something);
	}
};

export function buzzLogger(buzz: Buzz) {
	const params = {
		callSid: buzz.nodeID,
		buzzID: buzz.id,
		suiteID: buzz.suite.id
	};
	return {
		log(...args) {
			console.log(JSON.stringify({ ...params, message: args.map(stringify).join(' ') }));
		},
		error(...args) {
			console.error(JSON.stringify({ ...params, message: args.map(stringify).join(' ') }));
		}
	};
}
