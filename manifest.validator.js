const Validator = require('jsonschema').Validator;
const fs = require('fs');

const validator = new Validator();
const schema = JSON.parse(fs.readFileSync(__dirname + '/manifest.schema.json', 'UTF8'));
const target = JSON.parse(fs.readFileSync(process.argv[2], 'UTF8'));
const result = validator.validate(target, schema).errors;
process.stdout.write(result.length == 0 ? 'OK': 'Errors found:\n' + result.map((o) => o.stack).reduce((a, b) => a + '\n' + b));

// Or use https://www.jsonschemavalidator.net/
