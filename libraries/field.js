module.exports = function (obj = {}) {
	this.isLang = obj.isLang || this.isLang;
	this.required = obj.required || this.required;
	this.type = obj.type || this.type;
	this.collection = obj.collection || this.collection;
	this.required_or = obj.required_or || this.required_or;
	this.required_and = obj.required_and || this.required_and;
	this.equal_to = obj.equal_to || this.equal_to;
	this.length = obj.length || this.length;
	this.min = obj.min || this.min;
	this.max = obj.max || this.max;
	this.in_array = obj.in_array || this.in_array;
	this.unique = obj.unique || this.unique;
	this.exists = obj.exists || this.exists;
	this.model = obj.model || this.model;
	this.insertOnly = obj.insertOnly || this.insertOnly;
	this.updateOnly = obj.updateOnly || this.updateOnly;
	this.auto = obj.auto || this.auto;
	this.ignore = obj.ignore || this.ignore;
	this.default_value = obj.default_value || this.default_value;
};
