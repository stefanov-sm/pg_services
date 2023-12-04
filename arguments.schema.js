const fs = require('fs');
const arguments_def = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).arguments;

let schema = {
  title: 'Arguments list',
  description: 'Generated schema',
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false
};

for (const running_argument_name of Object.keys(arguments_def)) {
  const running_argument = arguments_def[running_argument_name];
  const argument_type = running_argument.type;
  let argument_properties = {};

  if (!['text', 'number', 'boolean'].includes(argument_type)) {
    console.log('Invalid argument type: ', running_argument_name, running_argument);
    process.exit(-1);
  }

  argument_properties.type = argument_type.replace('text', 'string');
  if (running_argument.type === 'text' && 'pattern' in running_argument)
    argument_properties.pattern = running_argument.pattern;
  if (!('default' in running_argument))
    schema.required.push(running_argument_name);
  if (!('constant' in running_argument))
    schema.properties[running_argument_name] = argument_properties;
}

process.stdout.write(JSON.stringify(schema, null, 2));