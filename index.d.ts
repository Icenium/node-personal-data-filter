declare module PersonalDataFilter {
	interface IPersonalDataFilter {
		filter(data: any): any;
	}


	interface IPersonalDataFilterConfig {
		/**
		 * Regular expressions which will be added to the default ones.
		 */
		additionalRegularExpressions?: string[];

		/**
		 * Regular expression which will be used instead of the default one.
		 */
		regularExpression?: RegExp;

		/**
		 * String which will be used to replace the personal data.
		 */
		personalDataMask?: string;

		/**
		 * Personal data properties which will be added to the default ones.
		 */
		additionalPersonalDataProperties?: string[];

		/**
		 * Personal data properties which will be used instead of the default ones.
		 */
		personalDataProperties?: string[];
	}
}

declare module "node-personal-data-filter" {
	export const newFilter: (cfg?: PersonalDataFilter.IPersonalDataFilterConfig) => PersonalDataFilter.IPersonalDataFilter;
}
