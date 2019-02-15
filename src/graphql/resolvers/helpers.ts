import { Person, Suite, Buzzer } from '../../models';
export interface GraphQLPerson {
	id: string;
	firstName?: string;
	lastName?: string;
	nickname?: string;
	phoneNumber: string;
}
export function mergeSuiteAndBuzzer(
	{ id, nodeID, unit, activationCode, line }: Suite,
	{ address, placeID, country, phoneNumber: buzzerPhoneNumber }: Buzzer
) {
	return {
		_id: id,
		id: nodeID,
		address: address,
		unit,
		buzzerPhoneNumber,
		twilioPhoneNumber: line ? line.phoneNumber : '',
		activationCode: activationCode,
		placeID,
		country: country
	};
}

export function formatPerson({
	firstName = '',
	nodeID,
	lastName = '',
	phoneNumber = '',
	nickname = ''
}: Person): GraphQLPerson {
	return {
		firstName,
		lastName,
		nickname,
		id: nodeID,
		phoneNumber
	};
}
