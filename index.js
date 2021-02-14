const request = require('request');
const cron = require('cron');

const DEFAULT_REQUEST_OPTIONS = {
  baseUrl: 'https://api.nature.global/1/',
  method: 'GET'
};

let homebridgeHap;

module.exports = homebridge => {
  homebridgeHap = homebridge.hap;
  homebridge.registerAccessory('homebridge-nature-remo-ceiling-light', 'NatureRemoCeilingLight', NatureRemoCeilingLight, true);
};

class NatureRemoCeilingLight {

  constructor(log, config) {
    log('NatureRemoCeilingLight init');

    // service Log that will display in the homebridge
    this.log = log;

    // `accessToken` API token from Nature Remo
    this.accessToken = config.accessToken;

    // appliance id of the specific accessory from Nature Remo
    this.applianceId = config.applianceId || null;

    // users can specify the frequency in crontab format in the configuration
    // blank will be "every minute".
    this.schedule = config.schedule || '* * * * *';

    // the customizable button commands of ON button
    // user can add a series button command depends on their scene
    this.namesOfOn = [config.namesOfOn || 'on-100'];

    // `service` is the instance of this HomeBridge accessory
    this.service = null;

    // the cached data that receiving from the Nature Remo
    this.cached = null;

    this.hasNotifiedConfiguration = false;

    // periodically refresh the target appliance information.
    this.updater = new cron.CronJob({
      cronTime: this.schedule,
      onTick: this._refreshAppliance,
      runOnInit: true
    });
    this.updater.start();
  }

  getServices() {
    const ceilingLight = new homebridgeHap.Service.Lightbulb(this.name);
    ceilingLight
      .getCharacteristic(homebridgeHap.Characteristic.On)
      .on('get', this.receiveApplianceFromHomebridge.bind(this))
      .on('set', this.setApplianceToHomebridge.bind(this));

    this.service = ceilingLight;
    return [ceilingLight];
  }

  receiveApplianceFromHomebridge(callback) {
    let state = false;
    const options = Object.assign({}, DEFAULT_REQUEST_OPTIONS, {
      uri: '/appliances',
      headers: {'authorization': `Bearer ${this.accessToken}`}
    });
    
    request(options, (error, response, body) => {
        try {
          const json = this._decodeRequestToJSON(error, response, body);
          const device = json.filter(
            info => info.id === this.applianceId
          )[0];

          state = device.light.state.power === 'on';
          this.log('set light status to:', state);
        } catch (e) {
          this.log(e);
        } finally {
          callback(null, state);
        }
    });
  }

  async setApplianceToHomebridge(value, callback) {
    this.log.debug('Triggered SET:', value);

    const params = {
      button: value ? 'on-100' : 'off'
    };

    await this._updateTargetAppliance(params);
    callback();
  }

  async _updateTargetAppliance(_params) {}

  _refreshAppliance() {}

  // the result from Nature Remo may be Response or Body base on the situation
  _decodeRequestToJSON(error, response, body) {
    let jsonOfResponse = null;
    let jsonOfBody = null;

    if(error || (!response && !body)) {
      throw `failed to send the request. error: ${error}. response & body is empty`;
    }

    try {
      jsonOfResponse = JSON.parse(response);
      const isLegalRemoJSON = jsonOfResponse.some(j => !!j.id);

      if(isLegalRemoJSON) return jsonOfResponse;
    } catch(_e) {
      jsonOfResponse = null;
    }
    
    try {
      jsonOfBody = JSON.parse(body);
      const isLegalRemoJSON = jsonOfBody.some(j => !!j.id);
      
      if(isLegalRemoJSON) return jsonOfBody;
    } catch(_e) {
      jsonOfBody = null;
    }

    throw (`failed to get legal json result. response: ${response}. body: ${body}`);
  }
} 
