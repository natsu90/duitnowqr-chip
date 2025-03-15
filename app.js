require('dotenv').config()

const https = require('https')
const express = require('express')
const Chip = require('Chip').default
const cheerio = require('cheerio')
const jsQR = require('jsqr')
const { Jimp } = require('jimp')
var session = require('express-session')
var FileStore = require('session-file-store')(session)
const QRCode = require('easyqrcodejs-nodejs')

const endpoint = 'https://gate.chip-in.asia/api/v1'
const basedUrl = process.env.APP_URL
const brandId = process.env.CHIP_BRAND_ID
const apiKey = process.env.CHIP_API_KEY

const app = express()
const port = 7001

app.engine('html', require('ejs').renderFile)
app.disable('view cache')

app.use(session({ secret: apiKey,
    resave: false,
    saveUninitialized: false,
    store: new FileStore,
    cookie: { maxAge: 3600000, secure: false, httpOnly: true }
  })
)

app.use(function(req, res, next) {
  req.rawBody = ''
  req.setEncoding('utf8')

  req.on('data', function(chunk) { 
    if (chunk) req.rawBody += chunk
  })

  req.on('end', function() {
    next()
  })
})

Chip.ApiClient.instance.basePath = endpoint
Chip.ApiClient.instance.token = apiKey

const apiInstance = new Chip.PaymentApi()

// Home Page
app.get('/', (req, res) => {

    res.render(__dirname + '/index.html')
})

// QR Code
app.get('/pay', async (req, res) => {
  const sessionid = req.session.id
  const amount = req.query.amount || 100
  const client = { email: 'duitnowqr@dummy-email-address.com' }
  const product = { name: 'duitnowqr', price: amount }
  const details = { products: [ product ], currency: 'MYR' }
  const purchase = { 
    brand_id: brandId,
    client: client,
    purchase: details,
    payment_method_whitelist: ['duitnow_qr'],
    success_callback: `${basedUrl}/ipn`,
    reference: sessionid
  }
  
  apiInstance.purchasesCreate(purchase, async function(error, data, response) {
    if (error) {
      console.log('API call failed. Error:', error)
      res.end()
      return
    }

    const $ = await cheerio.fromURL(data.checkout_url)
    const imgSrc = $('img[alt="QR code"]').attr('src')

    const qrBuffer = Buffer.from(imgSrc.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')

    // Rebuild QR
    const image = await Jimp.read(qrBuffer)
    const imageData = {
      data: new Uint8ClampedArray(image.bitmap.data),
      width: image.bitmap.width,
      height: image.bitmap.height,
    }
    const decodedQR = jsQR(imageData.data, imageData.width, imageData.height)

    const qrCode = new QRCode({
      text: decodedQR.data,
      width: 512,
      height: 512,
      colorDark : '#FF076Aff',
      colorLight : '#FFFFFF',
      correctLevel : QRCode.CorrectLevel.H,
      quietZone: 12,
      quietZoneColor: '#FFFFFF',
      logo: './media/duitnow-logo.png',
      logoWidth: 69,
      logoHeight: 75,
      logoBackgroundColor: '#FFFFFF'
    })

    qrCode.toDataURL().then((newImgSrc) => {
      newQrBuffer = Buffer.from(newImgSrc.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': newQrBuffer.length
      });
      res.end(newQrBuffer)
    })
    // END Rebuild QR

    // res.writeHead(200, {
    //   'Content-Type': 'image/png',
    //   'Content-Length': qrBuffer.length
    // });
    // res.end(qrBuffer)
  })

})

// Payment Webhook
app.post('/ipn', async (req, res) => {
  const { rawBody, headers } = req
  const xsignature = headers['x-signature']
  const publicKey = JSON.parse(await getPublicKey())
  const parsed = JSON.parse(rawBody)

  const verified = apiInstance.verify(rawBody, Buffer.from(xsignature, 'base64'), publicKey)

  if (verified && parsed.event_type === 'purchase.paid') {
    console.log('IPN: ', JSON.stringify(parsed, null, 4))

    const sessionid = parsed.reference
    // push message to Short Polling
    req.sessionStore.get(sessionid, function(err, session) {
      if (err) return;

      session.message = parsed.event_type
      req.sessionStore.set(sessionid, session)
    })
  
    res.send('OK')
  }

  res.end()
})

// Short Polling // Alt to SSE
app.get('/status', (req, res) => {

  let message = ''

  message = req.session.message
  req.session.message = ''

  res.send(message)
})

const getPublicKey = () => {
  return new Promise((resolve, reject) => {
    let data = ''
    https.get(`${endpoint}/public_key/`, 
      { headers: {
        'Authorization': `Bearer ${apiKey}` 
      },
    }, response => {
      response.on('data', chunk => {
        data = chunk.toString()
      })

      response.on('end', () => {
        resolve(data)
      })
    }).on('error', err => {
      console.log('Error: ', err.message)
      reject(err)
    })
  })
}

app.listen(port, () => {
  return console.log(
    `Express is listening at http://localhost:${port}`
  )
})
