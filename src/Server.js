class Server {
  constructor(hub, capacity) {
    this.hub = hub;
    this.totalDistance = 0;
    this.totalClients = 0;
    this.accumulatedCapacity = 0;
    this.capacity = capacity;
    this.clients = [];
  }

  toJSON() {
    return {
      hub: this.hub.toJSON(),
      totalDistance: this.totalDistance,
      totalClients: this.totalClients,
      accumulatedCapacity: this.accumulatedCapacity,
      capacity: this.capacity,
      clients: this.clients.map((client) => client.toJSON()),
    };
  }

  // addClient agregara clientes al servidor
  // pero se validara si el servidor tiene la capacidad para
  // agregar al cliente.
  // si retorna true se agrego caso contrario no se agrego
  addClient(client) {
    // comprobamos que no sobre pase la capacidad del servidor
    if (this.accumulatedCapacity + client.hub.demand > this.capacity) {
      return false;
    }

    // agregamos la capacidad acumulada
    this.accumulatedCapacity += client.hub.demand;
    client.calculateDistance(this);
    this.clients.push(client);
    this.totalClients++;
    this.totalDistance += client.distance; // acumulamos la distancia de todos los clientes
    return true;
  }
}

module.exports = Server;
