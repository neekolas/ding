import { DB } from '../../db';
import { Person } from '../../models';

export interface ResolverContext {
    db: DB;
    headers: { [k: string]: string };
    user: Person;
}
