"use strict";

const _ = require("lodash");

const personalDataProperties = ["email", "useremail", "user", "username", "userid", "accountid", "account", "password", "pass", "pwd", "ip", "ipaddress"];

// Source: https://stackoverflow.com/a/46181/4922411
const emailRegExpTemplate = `(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))`;
// Source: https://stackoverflow.com/a/11040993/4922411
const guidRegExpTemplate = `[{(]?[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}[)}]?`;
// Source: https://stackoverflow.com/a/34529037/4922411
const ipV4RegExpTemplate = "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)";
// Source: https://stackoverflow.com/a/9221063/4922411
const ipV6RegExpTemplate = "((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))(%.+)?";

const defaultRegularExpressions = [emailRegExpTemplate, guidRegExpTemplate, ipV4RegExpTemplate, ipV6RegExpTemplate];

class PersonalDataFilter {
	constructor(config) {
		config = config || {};
		this._setRegularExpressions(config);
		this._setMask(config);
		this._setPersonalDataProperties(config);
	}

	filter(data) {
		if (_.isString(data)) {
			return data.replace(this._filterRegExp, this._mask);
		} else if (_.isArray(data)) {
			return _.map(data, v => this.filter(v));
		} else if (_.isObject(data)) { // isObject check should always be after the isArray check because isObject returns true for [].
			return this._maskPersonalDataProperties(data);
		}

		return data;
	}

	_maskPersonalDataProperties(data) {
		return _.reduce(data, (result, v, k) => {
			if (this._personalDataProperties.indexOf(k.toLowerCase()) >= 0) {
				result[k] = this._mask;
			} else {
				result[k] = this.filter(v);
			}

			return result;
		}, {});
	}

	_setRegularExpressions(config) {
		const additionalRegularExpressionsSize = _.size(config.additionalRegularExpressions);
		if (additionalRegularExpressionsSize > 0 && config.regularExpression) {
			throw new Error("You can't use additionalRegularExpressions and regularExpression at the same time.");
		}

		if (config.regularExpression) {
			this._filterRegExp = config.regularExpression;
			return;
		}

		let regExps = _.concat([], defaultRegularExpressions);
		if (additionalRegularExpressionsSize > 0) {
			regExps = _.concat(regExps, config.additionalRegularExpressions);
		}

		const regExpString = regExps.map(r => `(${r})`).join("|");
		this._filterRegExp = new RegExp(regExpString, "gi");
	}

	_setMask(config) {
		this._mask = config.personalDataMask || "";
	}

	_setPersonalDataProperties(config) {
		const additionalPropertiesSize = _.size(config.additionalPersonalDataProperties);
		const propertiesSize = _.size(config.personalDataProperties);
		if (additionalPropertiesSize > 0 && propertiesSize > 0) {
			throw new Error("You can't use additionalPersonalDataProperties and personalDataProperties at the same time.");
		}

		if (propertiesSize > 0) {
			this._personalDataProperties = config.personalDataProperties;
			return;
		}

		let props = _.concat([], personalDataProperties);
		if (additionalPropertiesSize > 0) {
			props = _.concat(props, config.additionalPersonalDataProperties);
		}

		this._personalDataProperties = props;
	}
}

module.exports.newFilter = (cfg) => new PersonalDataFilter(cfg);
