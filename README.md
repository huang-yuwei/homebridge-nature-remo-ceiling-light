## homebridge-nature-remo-ceiling-light

Homebridge plugin for managing Japanese-style Ceiling light via Nature Remo

## Features
- control your ceiling ligjht without checking signals and typing by your self
- [COMING-SOON] be able to change brightness
- [COMING-SOON] be able to change WHITE/YELLOW tempurature
- [COMING-SOON] be able to set the sleep mode

## How to install
You can either install the plugin via terminal in your homebridge(raspberry pi)
```
npm install -g homebridge-nature-remo-ceiling-light
```
OR install it via the plugin page in the homebridge UI


## Usage
### Example
```
"accessories": [
  {
    "accessory": "NatureRemoCeilingLight",
    "name": "寝室のライト",
    "accessToken": "YOUR-ACCESS-TOKEN",
    "applianceId": "YOUR-ACCESSORY-APPLIANCE-ID"
  }
]
```

### Props
#### `accessory `
the plugin base file. Should be set as `NatureRemoCeilingLight `


#### `name`
the name of this accessory

#### `accessToken`
your own access token that creating from https://home.nature.global/home

#### `applianceId`
your accessory appliance id that can get from `curl -X GET "https://api.nature.global/1/appliances" -H "Authorization: Bearer {YOUR-ACCESS-TOKEN}"`

#### `buttonsOfOn`(optional)

*type*: String[]

*default*: `[on-100]`

you can customize your ON command as a series action ex: `[ on-100, colortemp-down ]`.
*Note: the button name is the info you get from  `curl -X GET "https://api.nature.global/1/appliances" -H "Authorization: Bearer {YOUR-ACCESS-TOKEN}"`

