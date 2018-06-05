# node-personal-data-filter

## What will be filtered:
- JS objects
	- recursive
	- properties with special names like `password`, `email` etc. will be filtered even if they don't contain personal data ([list of personal data properties](./index.js#L5))
- Arrays
	- each item will be checked
- Strings
	- Emails
	- GUIDs
	- IP v4
	- IP v6

## Usage:
```JavaScript
const pdf = require("node-personal-data-filter");
const f = pdf.newFilter({personalDataMask: "*****"});

const data = {
	filterMe: "some@mail.com", // will be filtered
	dontFilterMe: "some-data",
	nextLevel: {
		filterMe: "1fec999a-7e81-4bce-8b32-1b6ddd144f1b", // will be filtered
		dontFilterMe: "some-data",
		email: "not-personal" // will be filtered
	},
	email: "some@mail.bg" // will be filtered
};

const filtered = f.filter(data);
console.log(filtered);
```

## Configuration:
- Mask:
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	personalDataMask: "*****" // The string which will be used to replace the personal data.
};

const f = pdf.newFilter(cfg);
```
- Personal data properties:
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	personalDataProperties: ["pd1", "pd2"] // The personal data properties which will be filtered in JS object.
};

const f = pdf.newFilter(cfg);
```
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	additionalPersonalDataProperties: ["pd1", "pd2"] // The personal data properties which will be added to the default ones for filtering JS object.
};

const f = pdf.newFilter(cfg);
```
- Regular expressions:
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	regularExpression: "[a-z]" // The regular expression which will be used for filtering strings.
};

const f = pdf.newFilter(cfg);
```
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	additionalRegularExpressions: ["[a-b]", "[c-d]"] // The regular expressions which will added to the default ones for filtering strings.
};

const f = pdf.newFilter(cfg);
```
- Match replacers:
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	useDefaultMatchReplacer: true // Use the default match replacer - sha256 sum.
};

const f = pdf.newFilter(cfg);
```
```JavaScript
const pdf = require("node-personal-data-filter");

const cfg = {
	matchReplacer: match => `not a secret - ${match}` // Set custom match replacer.
};

const f = pdf.newFilter(cfg);
```
