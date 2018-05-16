"use strict";

const assert = require("chai").assert;
const pdf = require("../index");

const expectedMaskedOutput = "*****";
const personalDataFilter = pdf.newFilter({ personalDataMask: expectedMaskedOutput });

describe("PersonalDataFilter", () => {
	describe("filter", () => {
		const email = "qweasd12_=+3!#$%^&@ice.cold";
		const guid = "1fec999a-7e81-4bce-8b32-1b6ddd144f1b";
		const ipV4 = "169.254.139.119";
		const ipV6 = "fe80::f991:38d8:27e6:8b77";
		const notPersonalData = "not-personal-data";
		const secondPropertyName = "second";
		const emailMixedCasePropertyName = "eMaIl";

		describe("properties", () => {
			const personalDataProperties = ["email", "useremail", "user", "username", "userid", "accountid", "account", "password", "pass", "pwd", "ip", "ipaddress"];

			personalDataProperties.forEach(p => {
				it(`should filter ${p} on first level`, () => {
					const data = {};
					data[p] = "personal-data";

					const result = personalDataFilter.filter(data);

					const expected = {};
					expected[p] = expectedMaskedOutput;
					assert.deepEqual(result, expected);
				});

				it(`should filter ${p} on second level`, () => {
					const data = {};
					data[secondPropertyName] = {};
					data[secondPropertyName][p] = "personal-data";

					const result = personalDataFilter.filter(data);

					const expected = {};
					expected[secondPropertyName] = {};
					expected[secondPropertyName][p] = expectedMaskedOutput;
					assert.deepEqual(result, expected);
				});
			});

			it("should search for properties case insensitive", () => {
				const data = {};
				data[emailMixedCasePropertyName] = "personal-data";

				const result = personalDataFilter.filter(data);

				const expected = {};
				expected[emailMixedCasePropertyName] = expectedMaskedOutput;

				assert.deepEqual(result, expected);
			});

			it("should check the values of all properties, not only the ones in the list.", () => {
				const data = {
					filterMe: email,
					dontFilterMe: notPersonalData,
					nextLevel: {
						filterMe: guid,
						dontFilterMe: notPersonalData,
						email
					},
					email
				};

				const result = personalDataFilter.filter(data);

				const expected = {
					filterMe: expectedMaskedOutput,
					dontFilterMe: notPersonalData,
					nextLevel: {
						filterMe: expectedMaskedOutput,
						dontFilterMe: notPersonalData,
						email: expectedMaskedOutput
					},
					email: expectedMaskedOutput
				};

				assert.deepEqual(result, expected);
			});
		});

		describe("strings", () => {
			const testCaces = [
				{ msg: email, expected: expectedMaskedOutput },
				{ msg: `text ${email} text`, expected: `text ${expectedMaskedOutput} text` },
				{ msg: `text ${email} ${email} text`, expected: `text ${expectedMaskedOutput} ${expectedMaskedOutput} text` },
				{ msg: guid, expected: expectedMaskedOutput },
				{ msg: "487818704899480c907e2c0549664116", expected: "487818704899480c907e2c0549664116" },
				{ msg: `text ${guid} text`, expected: `text ${expectedMaskedOutput} text` },
				{ msg: `${guid}${guid}`, expected: `${expectedMaskedOutput}${expectedMaskedOutput}` },
				{ msg: `text${guid}text${guid}text`, expected: `text${expectedMaskedOutput}text${expectedMaskedOutput}text` },
				{ msg: `text${guid}${guid}text`, expected: `text${expectedMaskedOutput}${expectedMaskedOutput}text` },
				{ msg: `${email}${guid}`, expected: `${expectedMaskedOutput}${expectedMaskedOutput}` },
				{ msg: `${email} ${guid} ${email}`, expected: `${expectedMaskedOutput} ${expectedMaskedOutput} ${expectedMaskedOutput}` },
				{ msg: ipV4, expected: expectedMaskedOutput },
				{ msg: `text${ipV4}text`, expected: `text${expectedMaskedOutput}text` },
				{ msg: ipV6, expected: expectedMaskedOutput },
				{ msg: `text${ipV6}text`, expected: `text${expectedMaskedOutput}text` }
			];

			testCaces.forEach(t => {
				it(`should transform "${t.msg}" to "${t.expected}"`, () => {
					const result = personalDataFilter.filter(t.msg);
					assert.deepEqual(result, t.expected);
				});
			});
		});

		describe("arrays", () => {
			it("should filter all array objects.", () => {
				const data = [email, guid, notPersonalData, { userEmail: email, filterMe: email, dontFilterMe: notPersonalData, filterMeToo: guid }];

				const result = personalDataFilter.filter(data);

				const expected = [expectedMaskedOutput, expectedMaskedOutput, notPersonalData, {
					userEmail: expectedMaskedOutput,
					filterMe: expectedMaskedOutput,
					dontFilterMe: notPersonalData,
					filterMeToo: expectedMaskedOutput
				}];

				assert.deepEqual(result, expected);
			});
		});
	});
});
