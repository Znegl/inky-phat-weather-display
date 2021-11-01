const fs = require('fs')
const {createCanvas} = require('canvas')

const width = 250
const height = 122

const canvas = createCanvas(width, height)
const context = canvas.getContext('2d')

context.fillStyle = '#f00'
context.fillRect(0, 0, width, height)

context.font = '30pt Abril Fatface'
context.textAlign = 'center'
context.textBaseline = 'top'
context.fillStyle = '#000'

const text = 'Hi, World!'

const textWidth = context.measureText(text).width
context.fillRect(width / 2 - textWidth / 2 - 10, height / 3 - 5, textWidth + 20, height / 2)
context.fillStyle = '#fff'
context.fillText(text, width / 2, height / 3)

const palette = new Uint8ClampedArray([
  // r, g, b, a
  255, 255, 255, 255, // white
  255, 0, 0, 255, // red
  0, 0, 0, 255, // black
])

const buffer = canvas.toBuffer('image/png', {palette})
fs.writeFileSync('./image.png', buffer)