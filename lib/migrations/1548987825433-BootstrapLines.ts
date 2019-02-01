import { MigrationInterface, QueryRunner, getConnection } from "typeorm";
import { TwilioLine } from "../models";
let numbers = ["+17602923464"];
export class BootstrapLines1548987825433 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    try {
      const conn = await getConnection();
      for (let number of numbers) {
        conn
          .createQueryBuilder()
          .insert()
          .into(TwilioLine)
          .values(
            numbers.map(number => ({ phoneNumber: number, country: "US" }))
          )
          .execute();
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.clearTable("twilio_line");
  }
}
