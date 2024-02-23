const readline = require("readline");
const spinners = require("cli-spinners");
const _ = require("lodash");
const { Hub } = require("./Hub");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { performance } = require("perf_hooks");
const stream = require("stream");
const { db } = require("./db/dbconfig");
const { Timestamp } = require("firebase-admin/firestore");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("Pruebita");
});

app.post("/init-phub", upload.single("file"), (req, res) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);
  console.log(req.file);
  const rl = readline.createInterface({
    //aqui se toma el archivo que subimos
    input: bufferStream,
    crlfDelay: Infinity,
  });

  const iterations = parseInt(req.body.iterations);
  const pHub = new PorHub();
  const inicio = performance.now();
  pHub.run(iterations, rl, ({ solution, servers = [] }) => {
    //rl es la interfaz que ya tiene el contenido del archivo que se subio
    const fin = performance.now();
    const timeElapsed = (fin - inicio) / 1000;
    // registramos la solución en firebase
    const saveResult = async () => {
      const resfire = await db.collection("resultados").add({
        solution,
        servers: servers.map((server) => server.toJSON()),
        iterations,
        timeElapsed,
        date: Timestamp.now(),
        file: req.file.originalname,
      });
      res.send({ id: resfire.id });
    };
    saveResult();
  });
});
app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});
class PorHub {
  constructor(filePath) {
    this.filePath = filePath;
    this.hubs = [];
    this.totalHubs = 0;
    this.quantityServers = 0;
    this.capacityServers = 0;
    this.serv = null;
  }
  run(iterations, readline, resultado) {
    this.rl = readline;
    this.rl.on("line", (line) => {
      const input = this.converStringToNumberArray(line.trim());
      // datos del escenario
      if (input.length === 3) {
        //es un servidor
        this.totalHubs = input[0];
        this.quantityServers = input[1];
        this.capacityServers = input[2];
      }
      // Si la longitud es de 4 es un hub
      if (input.length === 4) {
        // Registramos todos los hub
        this.hubs.push(new Hub(input[0], input[1], input[2], input[3]));
      }
    });
    this.rl.on("close", () => {
      const phubSolution = this.phub(
        this.hubs,
        this.quantityServers,
        this.capacityServers,
        iterations
      );

      resultado(phubSolution);
      console.log(phubSolution);
    });
  }
  phub(hubs, quantityServers, capacityServers, iterations) {
    console.log(`Iteraciones que se quiere hacer ${iterations}`);

    let bestSolution = this.pHubOneSolution(
      //busca una sola solucion y le pasa los hubs clonados
      _.cloneDeep(hubs),
      quantityServers,
      capacityServers
    );
    for (let index = 0; index < iterations - 1; index++) {
      //repetirse mediante las interaciones
      const solution = this.pHubOneSolution(
        _.cloneDeep(hubs),
        quantityServers,
        capacityServers
      );

      if (solution.solution < bestSolution.solution) {
        bestSolution = solution;
        this.serv = solution.servers;
      }
    }
    return bestSolution;
  }
  // pHubOneSolution debe retornar una solución
  pHubOneSolution(hubs, quantityServers, capacityServers) {
    // obtiene servidores random
    const servers = this.randomServers(hubs, quantityServers, capacityServers);
    // console.log(`Obtenemos ${servers.length} servidores`);

    // agregar clientes a los servidores random.
    while (hubs.length > 0) {
      const rndIndexServer = this.random(servers.length);
      const rndIndexClient = this.random(hubs.length);

      // obtenemos le servidor random
      const server = servers.at(rndIndexServer);
      // obtenemos el cliente e intentamos agregarlo al servidor
      const client = hubs.at(rndIndexClient).toClient();
      if (server.addClient(client)) {
        // removemos este hub, porque ya paso hacer un cliente y esta agregado en un servidor
        hubs.splice(rndIndexClient, 1);
      }
    }
    const solution = servers
      .map((server) => server.totalDistance)
      .reduce((prev, current) => prev + current, 0);
    return {
      solution,
      servers,
    };
  }
  // randomServers debe retornar un arrray de servidores random
  randomServers(hubs, quantity, capacity) {
    const servers = [];
    while (servers.length < quantity) {
      // Obtenemos un random hub y los convertimos a servidor.
      const { hub, index } = this.randomHub(hubs);
      const server = hub.toServer(capacity);
      servers.push(server); // registramos el nuevo servidor (hub).
      hubs.splice(index, 1); // removemos el hub seleccionado.
    }
    return servers;
  }
  // Obtenemos un hub random
  randomHub(hubs) {
    // todo hacer que sea random
    const rndIndex = Math.floor(Math.random() * hubs.length);
    return {
      hub: hubs.at(rndIndex),
      index: rndIndex,
    };
  }
  random(max) {
    return Math.floor(Math.random() * max);
  }
  converStringToNumberArray(line = "") {
    return line.split(" ").map((num) => parseFloat(num));
  }
  animateLoading() {
    const spinner = spinners.dots12;
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(spinner.frames[i]);
      i = (i + 1) % spinner.frames.length;
    }, spinner.interval);
    return interval;
  }
}
