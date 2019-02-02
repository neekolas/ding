import 'reflect-metadata';
import { createConnection, Connection, Repository, Not, In } from 'typeorm';
import { Person, Suite, Buzzer, Buzz, TwilioLine } from './models';

export interface DB {
	connection: Connection;
	People: Repository<Person>;
	Suites: Repository<Suite>;
	Buzzers: Repository<Buzzer>;
	Buzzes: Repository<Buzz>;
	Lines: Repository<TwilioLine>;
}

export async function initDB(): Promise<DB> {
	const conn = await createConnection();
	return {
		connection: conn,
		People: conn.getRepository(Person),
		Suites: conn.getRepository(Suite),
		Buzzers: conn.getRepository(Buzzer),
		Buzzes: conn.getRepository(Buzz),
		Lines: conn.getRepository(TwilioLine)
	};
}

export async function lookupLine(db: DB, phoneNumber: string): Promise<TwilioLine> {
	const line = await db.Lines.findOne({ where: { phoneNumber } });
	if (!line) {
		return Promise.reject(new Error('No line found'));
	}
	return line;
}

export async function lookupBuzzer(db: DB, phoneNumber: string): Promise<Buzzer | null> {
	const buzzer = await db.Buzzers.findOne({ where: { phoneNumber } });
	if (!buzzer) {
		return null;
	}
	return buzzer;
}

export async function lookupPerson(db: DB, phoneNumber: string): Promise<Person | undefined> {
	return db.People.findOne({ where: { phoneNumber } });
}

export async function findAvailableLine(db: DB, buzzerId: number) {
	const suites = await db.Suites.find({ where: { buzzer: { id: buzzerId } }, relations: ['line'] });
	if (suites.length) {
		console.log(`Has suites`, suites);
		const lineIDs = suites.map(suite => suite.line.id);
		return db.Lines.findOne({ id: Not(In(lineIDs)) });
	} else {
		return db.Lines.findOneOrFail();
	}
}

export async function upsertPerson(db: DB, phoneNumber: string): Promise<Person> {
	let person: Person | undefined;
	await db.connection.transaction(async entityManager => {
		person = await entityManager.findOne(Person, { where: { phoneNumber } });
		if (!person) {
			person = entityManager.create(Person, { phoneNumber });
			person = await entityManager.save(Person, person);
		}
	});
	if (!person) {
		throw new Error('Create failed');
	}
	return person;
}

export function findSuiteByLineAndBuzzer(db: DB, lineID: number, buzzerID: number): Promise<Suite | undefined> {
	return db.Suites.findOne({ where: { line: { id: lineID }, buzzer: { id: buzzerID } } });
}
