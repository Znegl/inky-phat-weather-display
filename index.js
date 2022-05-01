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
 * @param {boolean=} isError
 */
function updateCanvas(text, isError) {
  if (isError) {
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)

    context.font = '12pt monospace'
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillStyle = '#f00'
    fillTextWordWrap(context, text, 10, 7, 15, width- 20);
  } else {
    context.fillStyle = '#000'
    context.fillRect(0, 0, width, height)

    context.font = '60pt Abril Fatface'
    context.textAlign = 'center'
    context.textBaseline = 'top'
    context.fillStyle = '#fff'
    context.fillText(text, width / 2, -2)
  }
}

/**
 * Copied from https://stackoverflow.com/questions/5026961/html5-canvas-ctx-filltext-wont-do-line-breaks
 */
function fillTextWordWrap(context, text, x, y, lineHeight, fitWidth) {
  fitWidth = fitWidth || 0;

  if (fitWidth <= 0) {
    context.fillText(text, x, y);
    return;
  }

  let words = text.split(' ');
  let currentLine = 0;
  let idx = 1;

  while (words.length > 0 && idx <= words.length) {
    var str = words.slice(0, idx).join(' ');
    var w = context.measureText(str).width;
    if (w > fitWidth) {
      if (idx === 1) {
        idx = 2;
      }
      context.fillText(words.slice(0, idx - 1).join(' '), x, y + (lineHeight * currentLine));
      currentLine++;
      words = words.splice(idx - 1);
      idx = 1;
    } else {
      idx++;
    }
  }
  if (idx > 0)
    context.fillText(words.join(' '), x, y + (lineHeight * currentLine));
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

  await redraw(5)
}

async function redraw(retries = 0) {
  console.log('wait a little...')
  await new Promise(resolve => setTimeout(resolve, 1000))

  await inkyphat.redraw().then(() => {
    console.log('Display updated successfully!')
  }).catch(error => {
    console.log('Redraw error', error)
    console.log('Retrying...', retries)
    if (retries > 0) {
      redraw(retries--)
    }
  });
}

/**
 * Applies the given text to the canvas, updates the display (if running on a RPI) and exports the PNG.
 * @param {string} text
 * @param {boolean=} isError
 * @return {Promise<void>}
 */
async function applyText(text, isError) {
  console.log('apply text', text)
  updateCanvas(text, isError)

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
    const text = Math.round(data.state.temperature / 10) / 10 + '°'

    return applyText(
      text
        .replace('.', process.env.DECIMAL_SEPARATOR || '.')
        .replace('-', '‐')
    )
  }).catch(error => {
    console.error('axios error', error)
    return applyText(error.message, true)
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