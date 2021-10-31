"use strict"

import { Client } from './client.js'

let client = new Client()

document.onkeydown = client.handleKeyboardEvent.bind(client)

client.setupView()
client.sayHello()
client.getProfiles()