"use strict"

import './vue/wordList.js'
import './vue/wordListItem.js'
import './vue/wordListItemButton.js'

import { Client } from './client.js'

let client = new Client()

document.onkeydown = client.handleKeyboardEvent.bind(client)

client.setupView()
client.sayHello()
client.getProfiles()