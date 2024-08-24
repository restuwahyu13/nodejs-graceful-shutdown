const os = require('node:os')
const cluster = require('node:cluster')
const { EventEmitter } = require('node:events')

class MultiThread {
	nodecluster = undefined
	__cpus = os.cpus().length / 2

	constructor() {
		this.nodecluster = cluster
		this.__event = new EventEmitter()
		this.__signals = ['SIGTERM', 'SIGINT', 'SIGQUIT', 'SIGHUP', 'SIGABRT', 'SIGALRM', 'SIGUSR1']
		this.__cpus = this.__cpus <= 0 ? 1 : this.__cpus
	}

	cluster(singleThread, handler) {
		if (!singleThread && cluster.isPrimary) {
			for (let i = 1; i <= this.__cpus; i++) {
				this.nodecluster.fork()
			}

			this.__event.on('workers', (worker) => {
				if (worker) {
					if (worker.isDead()) {
						worker.send(worker)
					} else {
						worker.send(`Worker id ${worker.id} is online with pid ${worker.process.pid}`)
					}
				}
			})

			this.nodecluster.on('online', (worker) => {
				console.info(`Worker id ${worker.id} is online`)
				this.__event.emit('workers', worker)
			})

			this.nodecluster.on('exit', (code, signal) => {
				console.info(`Worker has teminated received code ${code.id} and signal ${signal}`)

				for (let i = 1; i <= this.__cpus; i++) {
					this.nodecluster.fork()
				}
			})
		} else if (!singleThread && cluster.isWorker) {
			process.on('message', (msg) => {
				if (typeof msg !== 'string') {
					console.info(`Worker id ${msg.worker.id} and process pid ${msg.worker.process.pid} has teminated`)
					msg.worker.kill()
				} else {
					console.info(msg)
				}
			})
			handler()
		} else {
			handler()
		}
	}
}

exports.MultiThread = new MultiThread()
