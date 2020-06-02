"use strict";

const crypto = require("crypto");
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
			const hashMatchReplacer = (match) => crypto.createHash("sha256").update(match).digest("hex");
			const tests = [{
				title: "filter with default match replacer",
				expectedTextTransformer: hashMatchReplacer,
				filter: pdf.newFilter({ useDefaultMatchReplacer: true })
			}, {
				title: "filter with mask",
				expectedTextTransformer: () => expectedMaskedOutput,
				filter: personalDataFilter
			}];

			tests.forEach(test => {
				describe(test.title, () => {
					const testCaces = [
						{ msg: email, expected: test.expectedTextTransformer(email) },
						{ msg: `text ${email} text`, expected: `text ${test.expectedTextTransformer(email)} text` },
						{ msg: `text ${email} ${email} text`, expected: `text ${test.expectedTextTransformer(email)} ${test.expectedTextTransformer(email)} text` },
						{ msg: guid, expected: test.expectedTextTransformer(guid) },
						{ msg: "487818704899480c907e2c0549664116", expected: "487818704899480c907e2c0549664116" },
						{ msg: `text ${guid} text`, expected: `text ${test.expectedTextTransformer(guid)} text` },
						{ msg: `${guid}${guid}`, expected: `${test.expectedTextTransformer(guid)}${test.expectedTextTransformer(guid)}` },
						{ msg: `text${guid}text${guid}text`, expected: `text${test.expectedTextTransformer(guid)}text${test.expectedTextTransformer(guid)}text` },
						{ msg: `text${guid}${guid}text`, expected: `text${test.expectedTextTransformer(guid)}${test.expectedTextTransformer(guid)}text` },
						{ msg: `${email}${guid}`, expected: `${test.expectedTextTransformer(email)}${test.expectedTextTransformer(guid)}` },
						{ msg: `${email} ${guid} ${email}`, expected: `${test.expectedTextTransformer(email)} ${test.expectedTextTransformer(guid)} ${test.expectedTextTransformer(email)}` },
						{ msg: ipV4, expected: test.expectedTextTransformer(ipV4) },
						{ msg: `text${ipV4}text`, expected: `text${test.expectedTextTransformer(ipV4)}text` },
						{ msg: ipV6, expected: test.expectedTextTransformer(ipV6) },
						{ msg: `text${ipV6}text`, expected: `text${test.expectedTextTransformer(ipV6)}text` }
					];

					testCaces.forEach(t => {
						it(`should transform "${t.msg}" to "${t.expected}"`, () => {
							const result = test.filter.filter(t.msg);
							assert.deepEqual(result, t.expected);
						});
					});
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

		describe("errors", () => {
			it("should handle errors.", () => {
				const test = new Error('some message');

				const result = personalDataFilter.filter(test);

				assert.deepEqual(result.message, test.message);
				assert.deepEqual(result.stack, test.stack);
			});

			it("should filter errors.", () => {
				const test = new Error(`some message with personal data ${email}`);

				const result = personalDataFilter.filter(test);

				assert.deepEqual(result.message, result.message.replace(email, expectedMaskedOutput));
				assert.deepEqual(result.stack, result.stack.replace(email, expectedMaskedOutput));
			});
		});

		describe("objects", () => {
			it("should handle circular references.", () => {
				const nestedObject = { userEmail: email, filterMe: email, dontFilterMe: notPersonalData, filterMeToo: guid };
				nestedObject.circular = nestedObject;
				const data = [email, nestedObject];

				const result = personalDataFilter.filter(data);

				const expected = [expectedMaskedOutput, {
					userEmail: expectedMaskedOutput,
					filterMe: expectedMaskedOutput,
					dontFilterMe: notPersonalData,
					filterMeToo: expectedMaskedOutput,
					circular: expectedMaskedOutput,
				}];

				assert.deepEqual(result, expected);
			});
		});
	});
});
