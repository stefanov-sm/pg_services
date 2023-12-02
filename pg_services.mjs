const URL_RX = /^SERVICES\/([A-Z][\w0-9]{1,64})(.*)?$/i,
      PRUNE_RX = /^[ \/\?]*|[ \/]*$/g,
      FILE_RX = /[\/\\][^\/\\]+$/,
      CONFIG_SUFFIX = '.config.json',
      RESPONSE_TYPES = ['table', 'row', 'value', 'void'],
      CONN_FILENAME = 'db.connection.config',
      LOGGER_FILENAME = 'logger.sql.config',
      SERVICE_PORT = parseInt(process.argv[2] || '880');

import http from 'http';
import fs from 'fs';
import pg from 'pg';
import helpers from './helpers.mjs';

const homedir = process.argv[1].replace(FILE_RX, '') + '/',
      config_location   = homedir + '/config/',
      services_location = homedir + '/services/';

async function server_callback (req, res) {
  const target_matches = req.url.replace(PRUNE_RX, '').match(URL_RX);
  if (target_matches === null) {
    helpers.err(res, 'No service');
    return;
  }
  if (!fs.existsSync(services_location + target_matches[1] + CONFIG_SUFFIX)) {
    helpers.err(res, 'No service (manifest)');
    return;
  }
  if (req.method === 'POST') {
    let post_arr = [];
    req.on('data', data_trunc => post_arr.push(data_trunc));
    req.on('end', async () => await handle_request(target_matches[1], Buffer.concat(post_arr).toString('utf8'), req, res));
  }
  else if (req.method === 'GET') {
  	await handle_request(target_matches[1], target_matches[2] || '', req, res);
  }
}

async function handle_request(target_name, request_data, req, res) {
  const headers = req.headers;
  const post_request = (req.method === 'POST');
  const caller_ip = helpers.caller_ip(req);
  const pg_client = (!fs.existsSync(config_location + CONN_FILENAME)) ?
    new pg.Client():  // uses environment variables PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
    new pg.Client(fs.readFileSync(config_location + CONN_FILENAME, 'utf8'));

  try
  {
    // Read and parse service configuration
    const service_config = helpers.JSON_safe(fs.readFileSync(services_location + target_name + CONFIG_SUFFIX, 'utf8'));
    if (!service_config) {
      helpers.err(res, 'No service (manifest)');
      return;
    }
    const settings = service_config.settings;
    // Check response type
	if (!RESPONSE_TYPES.includes(settings.response)) {
	  helpers.err(res, 'No service (response type)');
	  return;
    }
	// Re-check method specification (if any)
	if (settings.method && settings.method.toUpperCase() !== req.method) {
      helpers.err(res, 'No service (method)');
      return;
    } 
    // Check authorization
    if (settings.token !== headers['authorization']) {
      helpers.err(res, 'authorization');
      return;
    }
    // Check caller IP restrictions (if any)
    if (settings.iplist) {
      if (!helpers.ip_in_list(caller_ip, settings.iplist)) {
        helpers.err(res, 'IP');
        return;
      }
    }
    // Manage and verify call arguments
    const call_arguments = post_request ? helpers.JSON_safe(request_data): JSON.stringify(request_data.replace(PRUNE_RX, ''));
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
    
    const query_text = fs.readFileSync(services_location + settings.query, 'utf8').replace(/\B:ARG\b/gi, '($1::jsonb)');
    const query_object = settings.response !== 'value' ?
      {name:'service_query', text:query_text, values:[call_arguments]}:
      {name:'service_query', text:query_text, values:[call_arguments], rowMode:'array'};

    await pg_client.connect();
    try
    {
      // Optional logger
      if (fs.existsSync(config_location + LOGGER_FILENAME))
      {
        await pg_client.query(fs.readFileSync(config_location + LOGGER_FILENAME, 'utf8'), [caller_ip, target_name, request_data]);
      }

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
      helpers.err(res, `database: ${err.message || '*'}`);
    }
    finally
    {
      pg_client.end();
    }
  }
  catch (err)
  {
    helpers.err(res, `No service (internal: ${err.message || '*'})`);
  }
}

http.createServer(server_callback).listen(SERVICE_PORT);
