# Inky Phat Weather Display

Reads temperature data from a Philips Hue motion sensor and displays the value on the Inky Phat.
The display is updated every 5 minutes.

## How it works

Node.js is used to fetch temperature data and create a PNG image with the content for the display.  
The PNG file is sent to the display using the GPIO pins.

# Configuration

Create a file named `.env` in the root of the project with the following content:
```
HUE_ADDRESS: <IP address of the Philips Hue hub>
HUE_USER: <username for the Philips Hue API>
HUE_SENSOR_ID: <ID of the temperature sensor to read>
UPSIDE_DOWN: <optional - set to true if the display should be upside down>
UPDATE_INTERVAL: <optional - an interval in ms. Defauts to 20000>
```

# Dependencies

## General dependencies

Download and install the font [Abril Fatface](https://fonts.google.com/specimen/Abril+Fatface).  
(on the RPI, create a folder named `.fonts` in your user directory and copy the `*.ttf` font file to the directory)

## RPI specific Dependencies

Run the following two commands on the Raspberry Pi to install all dependencies required for `canvas` to be able to install.

```
sudo apt-get update
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```