
## DuitNowQR Hardwareless Soundbox

DuitNowQR advance payment validation, without any additional hardware, which I believe should come built-in ready in every banking app.

### Demo

[http://duitnow.ss.my](http://duitnow.ss.my)

[![Watch the video](https://img.youtube.com/vi/20gtE4HNr5g/default.jpg)](https://youtu.be/20gtE4HNr5g)

### Prerequisites

1. SSM Company Certificate (for CHIP account and bank account registration)

2. Company Bank Account (for DuitNow activation with CHIP)

3. [CHIP Account](https://onboarding.chip-in.asia/)

### Installation

1. `npm install`

2. `cp .env.example .env`

3. Fill up `.env` accordingly

```
APP_URL=
CHIP_BRAND_ID=
CHIP_API_KEY=
```

4. `npm run start`

### CHIP Informations

1. 1.6% transaction fee, or RM0.15, which one is higher. And RM1.50 maximum.

2. Next business day settlement, no minimum settlement.

### Known Issues

1. I'm trying to store the Public Key locally to reduce API call, but it is somehow stored incorrectly and failed to validate incoming webhook.

2. The UI is not really mobile friendly, my frontend skill is suck, feel free to contribute.

3. I tried to use Server Sent Event (SSE) at first, instead of Short Polling, but somehow SSE doesn't work with Nginx. I'll try debug it later when I'm free.

### License

Licensed under the [MIT license](http://opensource.org/licenses/MIT)

