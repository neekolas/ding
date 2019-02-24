import { initDB } from './db';
import { Connection } from 'typeorm';

it('Can instantiate a database', async () => {
    const db = await initDB();
    expect(db).toBeDefined();
    expect(db.Buzzers).toBeDefined();
    expect(db.Suites).toBeDefined();
    expect(db.Lines).toBeDefined();
    expect(db.connection).toBeInstanceOf(Connection);
});
