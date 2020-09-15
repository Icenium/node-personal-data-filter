"use strict";

const _ = require("lodash");
const crypto = require("crypto");

const personalDataProperties = [
    "account",
    "accountid",
    "authorization",
    "email",
    "ip",
    "ipaddress",
    "pass",
    "password",
    "pwd",
    "user",
    "useremail",
    "userid",
    "username",
];

// Source: https://stackoverflow.com/a/46181/4922411
const emailRegExpTemplate = `(([^/<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))`;
// https://tools.ietf.org/html/rfc7519
const jwtRegExpTemplate = "^[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_+/=]*$";
// Source: https://stackoverflow.com/a/11040993/4922411
const guidRegExpTemplate = `[{(]?[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}[)}]?`;
// Source: https://stackoverflow.com/a/34529037/4922411
const ipV4RegExpTemplate = "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)";
// Source: https://stackoverflow.com/a/9221063/4922411
const ipV6RegExpTemplate = "((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))(%.+)?";

const defaultRegularExpressions = [emailRegExpTemplate, guidRegExpTemplate, ipV4RegExpTemplate, ipV6RegExpTemplate, jwtRegExpTemplate];

class PersonalDataFilter {
    constructor(config) {
        config = config || {};
        this._setRegularExpressions(config);
        this._setMask(config);
        this._setPersonalDataProperties(config);
        this._setMatchReplacer(config);
    }

    filter(data) {
        const result = this._filterRecursively(data, []);

        return result;
    }

    _filterRecursively(data, referencesCache) {
        if (_.isString(data)) {
            return this._filterString(data);
        } else if (_.isArray(data)) {
            return _.map(data, v => this._filterRecursively(v, referencesCache));
        } else if (_.isObject(data)) { // isObject check should always be after the isArray check because isObject returns true for [].
            // if the current reference has already been traversed this means we've reaced a circular reference
            // simply mask it in order to avoid maximum callstack due to endless traversal
            if (_.find(referencesCache, (obj) => obj === data)) {
                return this._mask;
            } else {
                referencesCache.push(data)
                return this._maskPersonalDataProperties(data, referencesCache);
            }
        }

        return data;
    }

    _maskPersonalDataProperties(data, referencesCache) {
        // It's important to use getOwnPropertyNames here
        // because if someone were to pass something with non-enumerable properties (e.g. an instance of the Error class)
        // then a simple _.reduce would simply skip over the non-enumerable properties ultimately removing them from the result
        const propertyNames = Object.getOwnPropertyNames(data);
        return _.reduce(propertyNames, (result, key) => {
            let value;

            try {
                value = data[key];
            } catch (err) {
                // We can't get the value and we should not include it in the result because we can't filter it.
                return result;
            }

            if (this._personalDataProperties.indexOf(key.toString().toLowerCase()) >= 0) {
                result[key] = this._mask;
            } else {
                result[key] = this._filterRecursively(value, referencesCache);
            }

            return result;
        }, {});
    }

    _filterString(input) {
        if (this._matchReplacer) {
            return input.replace(this._filterRegExp, this._matchReplacer);
        }

        return input.replace(this._filterRegExp, this._mask)
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

    _setMatchReplacer(config) {
        if (config.useDefaultMatchReplacer) {
            if (config.matchReplacer) {
                throw new Error("You can't use the default match replacer and a cutom one.");
            }

            this._matchReplacer = (match) => {
                return crypto.createHash("sha256").update(match).digest("hex");
            };
        }

        if (config.matchReplacer) {
            this._matchReplacer = config.matchReplacer;
        }
    }
}

module.exports.newFilter = (cfg) => new PersonalDataFilter(cfg);
