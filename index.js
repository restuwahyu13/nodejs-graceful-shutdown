require('dotenv/config')
const express = require('express')
const { GracefulShutdown } = require('./gracefulShutdown')

class App {
	constructor() {
		this.__app = express()
	}

	__router() {
		this.__app.get('*', (_req, res, _next) => {
			return res.status(200).json({ msg: 'Hello Wordl!' })
		})
	}

	__event() {
		process
			.on('rejectionHandled', (e) => console.error(e))
			.on('uncaughtException', (e) => console.error(e))
			.on('unhandledRejection', (e) => console.error(e))
			.on('uncaughtExceptionMonitor', (e) => console.error(e))
	}

	run() {
		this.__router()
		this.__event()
		GracefulShutdown.listen(this.__app)
	}
}

new App().run()
