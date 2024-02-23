const Server = require("./Server");
const { Client } = require("./Client");

// Hub sera un elemento generico
class Hub {
  constructor(nodeNumber, x, y, demand) {
    this.nodeNumber = nodeNumber;
    this.point = {
      x,
      y,
    };
    this.demand = demand;
  }

  toJSON() {
    return {
      nodeNumber: this.nodeNumber,
      point: {
        x: this.point.x,
        y: this.point.y,
      },
      demand: this.demand,
    };
  }

  toServer(capacity) {
    // console.log("ahora soy un servidor");
    return new Server(this, capacity);
  }

  toClient() {
    // console.log("Ahora soy un cliente");
    return new Client(this);
  }
}

module.exports = { Hub };
