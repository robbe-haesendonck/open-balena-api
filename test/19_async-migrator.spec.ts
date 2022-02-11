import { initSupertest } from './test-lib/supertest';
import * as _ from 'lodash';
import { sbvrUtils, dbModule } from '@balena/pinejs';
import { expect } from 'chai';
import * as fs from 'fs';
import { setTimeout as delay } from 'timers/promises';

describe('Async Migrations', async function () {
	this.timeout(60000);

	describe('standard async migrations', function () {
		before(async function () {
			const testConfig = require('../config');

			testConfig.models[0].migrationsPath =
				__dirname + '/fixtures/19-async-migrator/01-migrations/';

			// delete cached migrations
			testConfig.models[0].migrations = {};
			await initSupertest({ initConfig: testConfig, deleteDatabase: true });

			// manually calling the init data creation sql query as the model gets
			// executed for the first time and sync migrations are skipped
			const initDataSql = await fs.promises.readFile(
				testConfig.models[0].migrationsPath + '0001-init-data.sync.sql',
				'utf8',
			);

			await sbvrUtils.db.transaction(async (tx) => {
				try {
					await tx.executeSql(initDataSql);
				} catch (err) {
					console.log(`err: ${err}`);
				}
			});
		});

		it('wait for migrators run', async function () {
			await delay(5000); // wait for some migrations to have happened
			let result: dbModule.Result = {} as dbModule.Result;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(
					`	SELECT * FROM test
						WHERE  "columnA" = "columnC";`,
				);
			});
			expect(result?.rows).to.be.not.empty;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(`SELECT * FROM "migration status";`);
			});
			expect(result?.rows).to.be.not.empty;
		});

		it('wait for migrators catched up ', async function () {
			await delay(2000); // wait for some migrations to have happened
			let result: dbModule.Result = {} as dbModule.Result;
			let allResults: dbModule.Result = {} as dbModule.Result;

			do {
				await sbvrUtils.db.transaction(async (tx) => {
					allResults = await tx.executeSql(
						`	SELECT * FROM test
							ORDER BY id;`,
					);
				});

				await sbvrUtils.db.transaction(async (tx) => {
					result = await tx.executeSql(
						`	SELECT * FROM test
							WHERE  "columnA" = "columnC"
							ORDER BY id;`,
					);
				});
			} while (result?.rows?.length !== allResults?.rows?.length);

			expect(result?.rows).to.eql(allResults?.rows);

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(`SELECT * FROM "migration status";`);
			});
			expect(result?.rows).to.be.not.empty;
			// expect(result?.rows[])
		});

		// TODO: Testcase forever migration (multiple catch ups)

		// it('should catch up future data changes', async function () {});
	});

	// TODO Async migrator in background is not killed with initSupertest

	describe('async migration skip', function () {
		before(async function () {
			const testConfig = require('../config');

			testConfig.models[0].migrationsPath =
				__dirname + '/fixtures/19-async-migrator/02-skip-async/';

			// delete cached migrations
			testConfig.models[0].migrations = {};
			await initSupertest({ initConfig: testConfig, deleteDatabase: true });

			// manually calling the init data creation sql query as the model gets
			// executed for the first time and sync migrations are skipped
			const initDataSql = await fs.promises.readFile(
				testConfig.models[0].migrationsPath + '0001-init-data.sync.sql',
				'utf8',
			);

			await sbvrUtils.db.transaction(async (tx) => {
				await tx.executeSql(initDataSql);
			});
		});

		it('no async row migration should take place', async function () {
			await delay(2000); // wait for some migrations to have happened
			let result: dbModule.Result = {} as dbModule.Result;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(
					`	SELECT * FROM test
						WHERE  "columnA" = "columnC";`,
				);
			});
			expect(result?.rows).to.be.empty;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(`SELECT * FROM "migration status";`);
			});
			expect(result?.rows).to.be.empty;
		});
	});
});

// TODO: Testcase parallel migration

// TODO: Parallel Error / Success migration

// TODO: TableLock test?

// TODO: massive data test?
