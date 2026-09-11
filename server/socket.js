let ioInstance = null;

function init(io) {
  ioInstance = io;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.IO not initialised yet');
  return ioInstance;
}

module.exports = { init, getIO };
