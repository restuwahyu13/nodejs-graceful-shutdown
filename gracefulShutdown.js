const http = require('node:http')
const { Socket } = require('node:net')
const { MultiThread } = require('./multiThread')

class GracefulShutdown {
	__setTimeout
	__gracefulShutdownTimer = 3000

	constructor() {
		this.__multiThread = MultiThread
		this.__env = process.env.NODE_ENV
		this.__port = +process.env.PORT
		this.__connection = new Map()
		this.__signals = ['SIGTERM', 'SIGINT', 'SIGQUIT', 'SIGHUP', 'SIGABRT', 'SIGALRM', 'SIGUSR1', 'SIGUSR2']
		this.__gracefulShutdownTimer = this.__env === 'development' ? 3000 : 5000
		this.__singleThread = JSON.parse(process.env.SINGLE_THREAD || 'false')
	}

	__sleep(server, signal) {
		return setTimeout(() => {
			const socket = this.__connection.get('connection')
			if (!socket?.closed) socket?.destroy()

			server.close((err) => {
				this.__connection.clear()

				if (!err) {
					console.info(`Server Closed Without Error: ${err}`)
					console.info('Gracefull shutdown successfully')

					process.removeAllListeners()
					process.kill(process.pid, signal)
					process.exit(0)
				} else {
					console.info(`Server Closed With Error: ${err}`)
					console.info('Gracefull shutdown successfully')

					process.removeAllListeners()
					process.kill(process.pid, signal)
					process.exit(1)
				}
			})
		}, this.__gracefulShutdownTimer)
	}

	listen(app) {
		const server = http.createServer(app)

		server.on('connection', (socket) => {
			console.info('Server Connection Established')

			if (socket) this.__connection.set('connection', socket)
			else socket.destroy()
		})

		server.on('request', (req, _res) => {
			const socketRequest = req.socket
			const socketConnection = this.__connection.get('connection')

			if ((!socketRequest || !socketConnection) instanceof Socket) {
				this.__connection.clear()
				this.__connection.set('connection', socketRequest)
			}
		})

		this.__signals.forEach((event) => {
			if (this.__env === 'development') {
				process.on(event, (signal) => {
					console.info(`Server ${this.__env} received signal: ${signal}`)

					if (this.__singleThread) {
						this.__multiThread.nodecluster.disconnect()
					}

					this.__setTimeout = this.__sleep(server, signal)
					if (this.__setTimeout) {
						setInterval(() => console.info('Gracefull shutdown pending...'), 1000)
						clearTimeout(this.__timeout)
					}
				})
			} else {
				process.once(event, (signal) => {
					console.info(`Server ${this.__env} received signal: ${signal}`)

					if (this.__singleThread) {
						this.__multiThread.nodecluster.disconnect()
					}

					this.__setTimeout = this.__sleep(server, signal)
					if (this.__setTimeout) {
						setInterval(() => console.info('Gracefull shutdown pending...'), 1000)
						clearTimeout(this.__timeout)
					}
				})
			}
		})

		this.__multiThread.cluster(this.__singleThread, () => {
			const serverInfo = `Server is running on port ${this.__port}`
			server.listen(this.__port, () => console.log(serverInfo))
		})
	}
}

exports.GracefulShutdown = new GracefulShutdown()
