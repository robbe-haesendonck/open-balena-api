import * as _ from 'lodash';

import { expect } from '../test-lib/chai';
import * as fakeDevice from '../test-lib/fake-device';
import { supertest, UserObjectParam } from '../test-lib/supertest';
import { version } from '../test-lib/versions';

import * as fixtures from '../test-lib/fixtures';
import {
	addReleaseToApp,
	addImageToService,
	addServiceToApp,
	addImageToRelease,
} from '../test-lib/api-helpers';

describe('Device with missing service installs', () => {
	let fx: fixtures.Fixtures;
	let admin: UserObjectParam;
	let applicationId: number;
	let device: fakeDevice.Device;
	const releases: _.Dictionary<number> = {};
	const services: _.Dictionary<number> = {};

	before('Setup the application and initial release', async function () {
		fx = await fixtures.load('unpin-device-after-release');

		admin = fx.users.admin;
		applicationId = fx.applications.app1.id;

		// add a release to the application...
		const { id: releaseId } = await addReleaseToApp(admin, {
			belongs_to__application: applicationId,
			is_created_by__user: 2,
			build_log: '',
			commit: 'deadbeef',
			composition: '',
			source: '',
			status: 'success',
			start_timestamp: Date.now(),
		});
		releases['deadbeef'] = releaseId;

		const { id: serviceId } = await addServiceToApp(
			admin,
			'service-1',
			applicationId,
		);
		services['service-1'] = serviceId;

		const { id: imageId } = await addImageToService(admin, {
			is_a_build_of__service: serviceId,
			build_log: '',
			start_timestamp: Date.now(),
			end_timestamp: Date.now(),
			push_timestamp: Date.now(),
			image_size: 1024,
			status: 'success',
		});
		await addImageToRelease(admin, imageId, releaseId);
	});

	after(async () => {
		await fixtures.clean(fx);
	});

	it('should add a new device', async function () {
		device = await fakeDevice.provisionDevice(admin, applicationId);

		const state = await device.getStateV2();
		expect(state.local.apps[applicationId]).to.have.property(
			'commit',
			'deadbeef',
			"The device isn't running the current application default release",
		);
	});

	it('should pin the device to the first release', async function () {
		await supertest(admin)
			.patch(`/${version}/device(${device.id})`)
			.send({
				should_be_running__release: releases['deadbeef'],
			})
			.expect(200);

		const state = await device.getStateV2();
		expect(state.local.apps[applicationId]).to.have.property(
			'commit',
			'deadbeef',
			"The device isn't running the pinned release",
		);
	});

	it('should add a new release to the application', async function () {
		// add a release to the application...
		const { id: releaseId } = await addReleaseToApp(admin, {
			belongs_to__application: applicationId,
			is_created_by__user: 2,
			build_log: '',
			commit: 'abcd0001',
			composition: '',
			source: '',
			status: 'success',
			start_timestamp: Date.now(),
		});
		releases['abcd0001'] = releaseId;

		const { id: firstImageId } = await addImageToService(admin, {
			is_a_build_of__service: services['service-1'],
			build_log: '',
			start_timestamp: Date.now(),
			end_timestamp: Date.now(),
			push_timestamp: Date.now(),
			image_size: 1024,
			status: 'success',
		});
		await addImageToRelease(admin, firstImageId, releaseId);

		const { id: secondServiceId } = await addServiceToApp(
			admin,
			'service-2',
			applicationId,
		);
		services['service-2'] = secondServiceId;
		const { id: secondImageId } = await addImageToService(admin, {
			is_a_build_of__service: secondServiceId,
			build_log: '',
			start_timestamp: Date.now(),
			end_timestamp: Date.now(),
			push_timestamp: Date.now(),
			image_size: 1024,
			status: 'success',
		});
		await addImageToRelease(admin, secondImageId, releaseId);

		const state = await device.getStateV2();
		expect(state.local.apps[applicationId]).to.have.property(
			'commit',
			'deadbeef',
			"The device isn't running the pinned release",
		);
	});

	it('should un-pin the device', async function () {
		await supertest(admin)
			.patch(`/${version}/device(${device.id})`)
			.send({
				should_be_running__release: null,
			})
			.expect(200);
	});

	it('should pull the intended state', async function () {
		const state = await device.getStateV2();
		expect(state.local.apps[applicationId]).to.have.property(
			'commit',
			'abcd0001',
			"The device isn't running the default application release",
		);
	});
});
