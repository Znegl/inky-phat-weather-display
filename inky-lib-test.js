const inkyphat = require('inkyphat')();

async function main() {

  await inkyphat.init();

  inkyphat.setPixel(1, 5, inkyphat.RED);

  inkyphat.drawRect(50, 100, inkyphat.BLACK);

  await inkyphat.redraw();

  await inkyphat.destroy();
}

main();