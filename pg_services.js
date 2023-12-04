const URL_RX = /^SERVICES\/([A-Z][\w0-9]{1,64})(.*)?$/i,
      PRUNE_RX = /^[ \/\?]*|[ \/]*$/g,
      ARG_RX = /\B:ARG\b/gi,
      CONFIG_SUFFIX = '.config.json',
      RESPONSE_TYPES = ['table', 'row', 'value', 'void'],
      CONN_FILENAME = 'db.connection.config',
      LOGGER_FILENAME = 'logger.sql.config',
      SERVICE_PORT = parseInt(process.argv[2] || '880');

const http = require('http');
const fs = require('fs');
const pg = require('pg');
const helpers = require('./helpers.js').Helpers; 
const config_location   = __dirname + '/config/';
const services_location = __dirname + '/services/';
const errorlog_filename = __dirname + '/log/errors.log';

async function server_callback (req, res) {
  const target_matches = req.url.replace(PRUNE_RX, '').match(URL_RX);
  if (target_matches === null) {
    helpers.err(res);
    return;
  }
  if (!fs.existsSync(services_location + target_matches[1] + CONFIG_SUFFIX)) {
    helpers.err(res);
    return;
  }
  if (req.method === 'POST') {
    let post_arr = [];
    req.on('data', data_trunc => post_arr.push(data_trunc));
    req.on('end', async () => await handle_request(target_matches[1], Buffer.concat(post_arr).toString('UTF8'), req, res));
  }
  else if (req.method === 'GET') {
    const arg_string = target_matches[2] || '';
    if (arg_string.match(/\'|\\|--/)) {
      helpers.err(res, 'URL');
      return;
    }
  	await handle_request(target_matches[1], arg_string, req, res);
  }
  else helpers.err(res);
}

async function handle_request(target_name, request_data, req, res) {
  const post_request = (req.method === 'POST');
  const caller_ip = helpers.caller_ip(req);
  const pg_client = (!fs.existsSync(config_location + CONN_FILENAME)) ?
    new pg.Client():  // uses environment variables PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
    new pg.Client(fs.readFileSync(config_location + CONN_FILENAME, 'UTF8'));
  try
  {
    const service_config = JSON.parse(fs.readFileSync(services_location + target_name + CONFIG_SUFFIX, 'UTF8'));
    const settings = service_config.settings;

    if (settings.method.toUpperCase() !== req.method) {
      helpers.err(res, 'method');
      return;
    }
    // Check authorization
    if (settings.token !== req.headers['authorization'].replace(/^bearer[\s]/i, '')) {
      helpers.err(res, 'authorization');
      return;
    }
    // Check caller IP restrictions (if any)
    if (settings.iplist) {
      const ip_ok = helpers.ip_in_list(caller_ip, settings.iplist);
      if (!ip_ok) {
        helpers.err(res, 'IP');
        return;
     }
    }
    // Manage and verify call arguments
    const call_arguments = post_request ? helpers.JSON_safe(request_data): request_data;
    if (post_request) {
      if (!call_arguments) {
          helpers.err(res, 'arguments');
          return;
      }
      const args_result = helpers.manage_arguments(call_arguments, service_config.arguments);
      if (!args_result.status) {
        helpers.err(res, args_result.message);
        return;
      }
    }

    const raw_query_text = fs.readFileSync(services_location + settings.query, 'UTF8');
    const query_text = (post_request && settings.extsyntax) ?
      helpers.sql_rewrite(raw_query_text, call_arguments):
      raw_query_text.replace(ARG_RX, post_request ? '($1::jsonb)': '($1::text)');
    const query_object = settings.response !== 'value' ?
      {name:'service_query', text:query_text, values:[call_arguments]}:
      {name:'service_query', text:query_text, values:[call_arguments], rowMode:'array'};
    await pg_client.connect();
    try
    {
      if (fs.existsSync(config_location + LOGGER_FILENAME))
        await pg_client.query({
                name:'log_query',
                text:fs.readFileSync(config_location + LOGGER_FILENAME, 'UTF8'), 
                values:[caller_ip, target_name, request_data]
               });
      const db_response = await pg_client.query(query_object);
      switch (settings.response)
      {
        case 'table': helpers.json_response(res, db_response.rows); break;
        case 'row':   helpers.json_response(res, db_response.rows[0]); break;
        case 'value': helpers.json_response(res, db_response.rows[0][0]); break;
        case 'void':  helpers.json_response(res, null);
      }
    }
    catch (err)
    {
      throw new Error(`database: ${err.message || '*'}`);
    }
    finally
    {
      pg_client.end();
    }
  }
  catch (err)
  {
  	const error_text = `${(new Date()).toISOString()}, ${target_name}: ${err.message || '*'}\n`;
  	fs.writeFileSync(errorlog_filename, error_text, {flag:'a', flush:true});
    helpers.err(res, 'Temporarily out of service');
  }
}

http.createServer(server_callback)
    .listen(SERVICE_PORT, () => process.stdout.write(`pg_services is listening on port ${SERVICE_PORT} ...`));
