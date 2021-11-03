require('dotenv').config()

const fs = require('fs')
const axios = require('axios')
const {createCanvas} = require('canvas')
const inkyphat = require('inkyphat')();
const isPi = require('detect-rpi');

// Display configuration
const width = 212
const height = 104

// Philips Hue
const hueUrl = `http://${process.env.HUE_ADDRESS}/api/${process.env.HUE_USER}/sensors/${process.env.HUE_SENSOR_ID}`

// Canvas setup
const canvas = createCanvas(width, height)
const context = canvas.getContext('2d')

// Make sure the inkyphat instance is destroyed when stopping the application
process.on('SIGINT', async function() {
    if (isPi()) {
      await inkyphat.destroy();
    }

    process.exit();
  }
)

/**
 * Updates the canvas width the given text
 * @param {string} text
 */
function updateCanvas(text) {
  context.fillStyle = '#000'
  context.fillRect(0, 0, width, height)

  context.font = '60pt Abril Fatface'
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.fillStyle = '#fff'
  context.fillText(text, width / 2, -2)
}

/**
 * Exports the current canvas as a PNG file
 * @param {string} filename
 */
function exportPng(filename = 'image') {
  const palette = new Uint8ClampedArray([
    // r, g, b, a
    255, 255, 255, 255, // white
    255, 0, 0, 255, // red
    0, 0, 0, 255, // black
  ])

  const buffer = canvas.toBuffer('image/png', {palette})
  fs.writeFileSync(`./${filename}.png`, buffer)
}

/**
 * Updates the Inky Phat display with the current canvas data
 * @return {Promise<void>}
 */
async function updateDisplay() {
  const {data} = context.getImageData(0, 0, canvas.width, canvas.height);

  // Loop over all pixels
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)

    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    let color = inkyphat.BLACK

    if (red === green && red === blue) {
      // Grayscale
      if (red >= 128) {
        color = inkyphat.WHITE
      } else {
        color = inkyphat.BLACK
      }
    } else if (red === 255) {
      if (green + blue > 255) {
        color = inkyphat.LIGHT_RED
      } else {
        color = inkyphat.RED
      }
    }

    if (process.env.UPSIDE_DOWN === 'true') {
      inkyphat.setPixel(width - x, y, color)
    } else {
      inkyphat.setPixel(x, height - y, color)
    }
  }

  await inkyphat.redraw().catch(error => {
    console.error('Redraw error', error)

    return new Promise(resolve => {
      setTimeout(() => {
        console.log('Retrying...')

        return inkyphat.redraw()
      }, 500)
    })
  });
}

/**
 * Applies the given text to the canvas, updates the display (if running on a RPI) and exports the PNG.
 * @param {string} text
 * @return {Promise<void>}
 */
async function applyText(text) {
  console.log('apply text', text)
  updateCanvas(text)

  if (isPi()) {
    await updateDisplay()
  }

  exportPng()
}

/**
 * Fetches new sensor data and updates everything.
 * @return {Promise<void>}
 */
async function update() {
  console.log('Update started')

  axios.get(hueUrl).then(({data}) => {
    console.log('got data', data.state.temperature)
    return applyText(Math.round(data.state.temperature / 10) / 10 + '°')
  }).catch(error => {
    console.error('axios error', error)
  })

  console.log('Update completed')
}

/**
 * Initializes the application
 * @return {Promise<void>}
 */
async function initialize() {
  if (isPi()) {
    await inkyphat.init();
  }

  await applyText('···')

  setInterval(update, parseInt(process.env.UPDATE_INTERVAL) || 60000)

  update()
}

// Fire it all up
initialize()