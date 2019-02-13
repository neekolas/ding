import { DB, findAvailableLine } from '../../db';
import { lookupAddress, findCountry, lookupPlace } from '../../maps';
import { Person, PersonSuiteRole, Suite, Buzzer } from '../../models';
import { generateActivationCode } from '../utils';

export interface ResolverContext {
	db: DB;
	headers: { [k: string]: string };
	user: Person;
}

export interface CreateSuiteArgs {
	unit: string;
	placeID: string;
}

export interface UpdateNameArgs {
	firstName?: string;
	lastName?: string;
}

export interface GraphQLPerson {
	id: string;
	firstName?: string;
	lastName?: string;
	phoneNumber: string;
}

function formatPerson({ nodeID, firstName = '', lastName = '', phoneNumber = '' }: Person): GraphQLPerson {
	return {
		firstName,
		lastName,
		id: nodeID,
		phoneNumber
	};
}

function mergeSuiteAndBuzzer(
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

export default {
	Suite: {
		async owners({ _id: id }, args, { db }: ResolverContext) {
			const personSuites = await db.PersonSuites.find({
				where: { suite: { id }, role: PersonSuiteRole.OWNER },
				relations: ['person']
			});
			return personSuites.map(ps => formatPerson(ps.person));
		}
	},
	Query: {
		me(parent, args, context: ResolverContext) {
			const { user } = context;
			if (!user) {
				return null;
			}
			return formatPerson(user);
		},
		async suites(parent, args, context: ResolverContext, info) {
			const results = await context.db.Suites.find({
				relations: ['buzzer', 'line']
			});
			console.log(`Got ${results.length} results`, results);
			return results.map(result => mergeSuiteAndBuzzer(result, result.buzzer));
		},
		async suite(parent, { id }, { db, user }: ResolverContext) {
			const suite = await db.Suites.findOneOrFail({ where: { nodeID: id }, relations: ['buzzer', 'line'] });
			return mergeSuiteAndBuzzer(suite, suite.buzzer);
		},
		async addressSearch(parent, args: { query: string }, context: ResolverContext, info) {
			const results = await lookupAddress(args.query);

			return results.map(result => {
				return {
					id: result.place_id,
					name: result.name,
					address: result.formatted_address
				};
			});
		}
	},
	Mutation: {
		async createSuite(parent, args: CreateSuiteArgs, context: ResolverContext) {
			const { placeID, unit } = args;
			const { db, user } = context;
			let buzzer = await db.Buzzers.findOne({ where: { placeID } });
			if (!buzzer) {
				const place = await lookupPlace(placeID);
				buzzer = db.Buzzers.create({
					placeID,
					address: place.formatted_address,
					country: findCountry(place.address_components)
				});
				buzzer = await db.Buzzers.save(buzzer);
			}

			const line = await findAvailableLine(db, buzzer.id);
			if (!line) {
				throw new Error('Cannot find line');
			}
			const suite = await db.Suites.save({
				buzzer: buzzer,
				unit,
				activationCode: generateActivationCode(),
				line
			});
			await db.PersonSuites.insert({ person: user, suite, role: PersonSuiteRole.OWNER });
			return mergeSuiteAndBuzzer(suite, buzzer);
		},
		async updateUser(parent, args: UpdateNameArgs, context: ResolverContext, info) {
			const { user, db } = context;
			const { firstName, lastName } = args;
			if (firstName !== undefined) {
				user.firstName = firstName;
			}
			if (lastName !== undefined) {
				user.lastName = lastName;
			}
			await db.People.save(user);

			return formatPerson(user);
		},
		async deleteSuite(parent, args: { [suiteID: string]: any }, context: ResolverContext, info) {
			const { db } = context;
			const suite = await db.Suites.findOne({ where: { nodeID: args.suiteID } });
			if (!suite) {
				throw new Error('Suite not found');
			}
			await db.Suites.remove(suite);
			return true;
		},
		async createLine(parent, { phoneNumber, country }, context: ResolverContext) {
			const existing = await context.db.Lines.findOne({ phoneNumber });
			if (!existing) {
				await context.db.Lines.insert({ phoneNumber, country });
				return true;
			}
			return false;
		}
	}
};