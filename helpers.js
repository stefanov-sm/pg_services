class Helpers
{
  static err(res, err_text) {
    res.writeHead(404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: false, data: err_text || 'No service'}, null, 2));
  }

  static json_response(res, response_json) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: true, data: response_json}, null, 2));
  }

  static JSON_safe(json_text) {
    try
    {
      return JSON.parse(json_text);
    }
    catch (iognored)
    {
      return null;
    }
  }

  static ip_in_network(ip, network) {
    const cat_binary = ((x, y) => x + parseInt(y).toString(2).padStart(8, '0'));
    const [network_ip, network_mask] = network.split('/');
    return network_mask ?
      network_ip.split('.').reduce(cat_binary, '').slice(0, network_mask) === ip.split('.').reduce(cat_binary, '').slice(0, network_mask)
    : ip === network;
  }  

  static caller_ip(req) {
    return (req.headers['x-forwarded-for']?.split(',').shift() ??
            req.socket.remoteAddress).split(':').pop();
  }

  static ip_in_list(ip, iplist) {
    for (const running_ip of iplist)
      if (Helpers.ip_in_network(ip, running_ip))
        return true;
    return false;
  }

  static manage_arguments(target_arguments, config_arguments) {
    const ARG_TYPES = ['number','boolean','text'];
    const retval = (s, m) => ({message:m, status:s});

    for (const cfg_argument_name in config_arguments) {
      const cfg_argument = config_arguments[cfg_argument_name];
      if (!(cfg_argument_name in target_arguments)) {
        if (cfg_argument.default)
          target_arguments[cfg_argument_name] = cfg_argument.default;
        else if (cfg_argument.constant)
          target_arguments[cfg_argument_name] = cfg_argument.constant;
        else
          return retval(false, `Call argument ${cfg_argument_name} missing`);
      }
      else if (cfg_argument.constant)
        return retval(false, `Call argument ${cfg_argument_name} constant override`);

      if (cfg_argument.type.replace('text','string') !== typeof target_arguments[cfg_argument_name])
        return retval(false, `Call argument ${cfg_argument_name} type mismatch`);

      if (
          cfg_argument.type === 'text'
          && cfg_argument.pattern
          && !target_arguments[cfg_argument_name].match(new RegExp(cfg_argument.pattern, 'i'))
         )
        return retval(false, `Call argument ${cfg_argument_name} pattern mismatch`);
    }
    for (const target_argument_name in target_arguments) {
      if (!(target_argument_name in config_arguments))
        return retval(false, `Call argument ${target_argument_name} unexpected`);
    }
    return retval(true, null);
  }
}
exports.Helpers = Helpers;