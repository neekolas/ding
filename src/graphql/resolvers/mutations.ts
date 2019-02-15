import { generateActivationCode } from '../../utils';
import { ForbiddenError } from 'apollo-server-core';
import { ResolverContext } from './ctx';
import { findAvailableLine, upsertPerson } from '../../db';
import { findCountry, lookupPlace } from '../../maps';
import { PersonSuiteRole } from '../../models';
import { mergeSuiteAndBuzzer, formatPerson } from './helpers';

export interface CreateSuiteArgs {
	unit: string;
	placeID: string;
}

export interface UpdateNameArgs {
	firstName?: string;
	lastName?: string;
	nickname?: string;
}

export interface InviteOwnerArgs {
	suiteID: string;
	phoneNumber: string;
}

export default {
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
		const { firstName, lastName, nickname } = args;
		if (firstName !== undefined) {
			user.firstName = firstName;
		}
		if (lastName !== undefined) {
			user.lastName = lastName;
		}
		if (nickname !== undefined) {
			user.nickname = nickname;
		}
		await db.People.save(user);

		return formatPerson(user);
	},
	async inviteOwner(parent, { suiteID, phoneNumber }: InviteOwnerArgs, { user, db }: ResolverContext, info) {
		const suite = await db.Suites.findOneOrFail({ where: { nodeID: suiteID } });
		const ps = await db.PersonSuites.findOne({
			where: { person: user, role: PersonSuiteRole.OWNER, suite }
		});
		if (!ps) {
			throw new ForbiddenError('Does not own suite');
		}
		const person = await upsertPerson(db, phoneNumber);
		await db.PersonSuites.insert({ person, suite, role: PersonSuiteRole.OWNER });
		const newSuite = await db.Suites.findOneOrFail(suite.id, { relations: ['buzzer', 'line'] });
		return mergeSuiteAndBuzzer(newSuite, newSuite.buzzer);
	},
	async unlinkPerson(parent, { suiteID, personID }, { user, db }: ResolverContext, info) {
		const suite = await db.Suites.findOneOrFail({ where: { nodeID: suiteID } });
		// Ensure user is the owner
		const ps = await db.PersonSuites.count({
			where: { person: user, role: PersonSuiteRole.OWNER, suite }
		});
		if (!ps) {
			throw new ForbiddenError('Does not own suite');
		}
		const person = await db.People.findOneOrFail({ nodeID: personID });
		const toDelete = await db.PersonSuites.findOneOrFail({ where: { person, suite } });
		await db.PersonSuites.remove(toDelete);
		const newSuite = await db.Suites.findOneOrFail(suite.id, { relations: ['buzzer', 'line'] });
		return mergeSuiteAndBuzzer(newSuite, newSuite.buzzer);
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
};
