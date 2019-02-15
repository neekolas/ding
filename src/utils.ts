import { hashSync, compareSync } from 'bcrypt';
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
