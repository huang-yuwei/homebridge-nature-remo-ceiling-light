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
      onTick: this.refreshAppliance,
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

    try {
      await this._updateApplianceToNatureRemo(params);
    } catch(e) {
      this.log(e);
    }
    callback();
  }

  async refreshAppliance() {
    try {
      const appliance = await this._requestTargetApplianceJSONFromNatureRemo();
      this._refreshTargetAppliance(appliance);
    } catch(e) {
      this.log(e);
    }
  }

  async _updateApplianceToNatureRemo(params) {
    if(!params) throw Error('should at least contain params data');

    this.log.debug(`making request for update: ${JSON.stringify(params)}`);
    let requestParams = { ...params };

    this.requestPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        this.log.debug(`requesting update to server: ${JSON.stringify(requestParams)}`);

        const options = Object.assign({}, DEFAULT_REQUEST_OPTIONS, {
          uri: `/appliances/${this.record.id}/light`,
          headers: {'authorization': `Bearer ${this.accessToken}`},
          method: 'POST',
          form: requestParams
        });

        request(options, (_error, _response, _body) => {
          this.log.debug('got reponse for updating appliance');
          try {
            resolve()
          }catch(error) {
            reject(`[ERROR] ${error}`);
          }
        });
        delete this.requestPromise;
      }, 80)
    });
    return this.requestPromise;
  }

  _requestTargetApplianceJSONFromNatureRemo() {
    this.log('requesting target appliance record');
    const options = Object.assign({}, DEFAULT_REQUEST_OPTIONS, {
      uri: '/appliances',
      headers: {'authorization': `Bearer ${this.accessToken}`}
    });

    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        try {
          const json = this._decodeRequestToJSON(error, response, body);
          resolve(json);
        }catch(error) {
          reject(`[ERROR] ${error}`);
        }
      });
    })
  }

  _refreshTargetAppliance(applianceJSON) {
    this.log('refesh target appliance');
    
    const appliance = applianceJSON.find((app) => {
      return app.id === this.applianceId;
    });
    if(!appliance) throw Error('cannot find target appliance');

    this.log.debug(`Target ID: ${appliance.id}`);
    this.record = { ...appliance };
    this.applianceId = appliance.id;  // persist discovered ID
  }


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
