import { ApolloServer } from 'apollo-server-express';
import { DB, upsertPerson, findAvailableLine } from '../db';
import { lookupAddress, findCountry, lookupPlace } from '../maps';
import { AddressComponent } from '@google/maps';
import { Person } from '../models';

export interface ResolverContext {
	db: DB;
	headers: { [k: string]: string };
	user?: Person;
}

export interface CreateSuiteArgs {
	unit: string;
	placeID: string;
}

function formatNumberLength(num, length) {
	var r = '' + num;
	while (r.length < length) {
		r = '0' + r;
	}
	return r;
}

const generateActivationCode = () => {
	return formatNumberLength(Math.floor(Math.random() * 99999), 5);
};

export default {
	Query: {
		me(parent, args, context: ResolverContext) {
			const { user } = context;
			if (!user) {
				return null;
			}
			console.log(user);
			const { nodeID, firstName, lastName, phoneNumber } = user;
			return { id: nodeID, firstName: firstName || '', lastName: lastName || '', phoneNumber };
		},
		async suites(parent, args, context: ResolverContext, info) {
			const results = await context.db.Suites.find({
				relations: ['buzzer', 'line']
			});
			console.log(`Got ${results.length} results`, results);
			return results.map(result => {
				const { address, placeID } = result.buzzer;
				return {
					id: result.nodeID,
					address,
					placeID,
					unit: result.unit,
					activationCode: result.activationCode,
					twilioPhoneNumber: result.line.phoneNumber
				};
			});
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
			const { db } = context;
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

			return {
				id: suite.nodeID,
				address: buzzer.address,
				unit,
				activationCode: suite.activationCode,
				placeID,
				country: buzzer.country
			};
		},
		async createPerson(parent, args: { [k: string]: any }, context: ResolverContext, info) {
			console.log(`Creating person with ${JSON.stringify(args)}`);
			const person = await upsertPerson(context.db, args.phoneNumber);

			return { ...person, id: person.nodeID };
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
